import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import {
  addDays,
  apiErrorSchema,
  listingAvailabilitySchema,
  listingDtoSchema,
  listingPageSchema,
  parseIsoDate,
  publicTenantSchema,
  today,
  type ListingDto,
} from '@ars/shared';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request, { type Response } from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { PrismaService } from '../src/core/database/prisma.service.js';

function expectApiError(res: Response, statusCode: number, code: string) {
  expect(apiErrorSchema.parse(res.body)).toMatchObject({ statusCode, code });
}

/** `n` days from today: fixtures never depend on the day the tests run. */
const day = (n: number) => addDays(today(), n);

describe('Public portal (e2e)', () => {
  let app: NestExpressApplication<Server>;
  let prisma: PrismaService;
  const run = randomUUID().slice(0, 8);
  // Slugs differ only before the run suffix, so they sort the same in every collation.
  const slugA = `e2e-portal-a-${run}`;
  const slugB = `e2e-portal-b-${run}`;
  const slugP = `e2e-portal-p-${run}`;
  const blockerEmail = `e2e-portal-${run}@example.com`;

  const tenantA = {
    slug: slugA,
    name: 'E2E Portal A',
    logoUrl: 'https://example.com/logo-a.png',
    primaryColor: '#0055aa',
    contactEmail: 'stays-a@example.com',
    currency: 'EUR',
  } as const;

  /**
   * Tenant A: L1 has a confirmed stay D+10 → D+13, L2 a cancelled one over the
   * same days, L3 has D+20 blocked. Tenant B has a Belgrade listing too.
   */
  const listings: Record<'L1' | 'L2' | 'L3' | 'B1' | 'B2', ListingDto> = {
    L1: listing({
      city: 'Belgrade',
      maxGuests: 2,
      pricePerNightCents: 8000,
      rating: 4.8,
      reviewCount: 12,
      createdAt: '2025-01-03',
    }),
    L2: listing({
      city: 'Belgrade',
      maxGuests: 4,
      pricePerNightCents: 12000,
      rating: null,
      reviewCount: 0,
      createdAt: '2025-01-02',
    }),
    L3: listing({
      city: 'Split',
      country: 'HR',
      maxGuests: 6,
      pricePerNightCents: 20000,
      rating: 4.2,
      reviewCount: 3,
      createdAt: '2025-01-01',
    }),
    B1: listing({ city: 'Belgrade' }),
    B2: listing({ city: 'Vienna', country: 'AT' }),
  };
  const { L1, L2, L3 } = listings;
  const paginated: string[] = [];

  function listing(fields: Partial<ListingDto>): ListingDto {
    return {
      id: randomUUID(),
      title: 'E2E listing',
      city: 'Belgrade',
      country: 'RS',
      latitude: 44.8,
      longitude: 20.46,
      propertyType: 'apartment',
      maxGuests: 2,
      bedrooms: 1,
      pricePerNightCents: 10000,
      currency: 'EUR',
      rating: 4.5,
      reviewCount: 5,
      createdAt: '2025-01-01',
      ...fields,
    };
  }

  function listingRow(tenantId: string, dto: ListingDto) {
    return { ...dto, tenantId, createdAt: parseIsoDate(dto.createdAt) };
  }

  const get = (path: string) => request(app.getHttpServer()).get(path);
  const idsOf = (res: Response) =>
    listingPageSchema.parse(res.body).items.map((item) => item.id);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication<Server>>();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    const a = await prisma.tenant.create({ data: tenantA });
    const b = await prisma.tenant.create({
      data: { slug: slugB, name: 'E2E Portal B' },
    });
    const p = await prisma.tenant.create({
      data: { slug: slugP, name: 'E2E Portal P' },
    });
    const blocker = await prisma.user.create({
      data: { email: blockerEmail, name: 'Blocker', passwordHash: 'unused' },
    });

    await prisma.listing.createMany({
      data: [
        ...[L1, L2, L3].map((dto) => listingRow(a.id, dto)),
        ...[listings.B1, listings.B2].map((dto) => listingRow(b.id, dto)),
        // 25 listings that tie on every sort key, so only the id orders them.
        ...Array.from({ length: 25 }, () => listingRow(p.id, listing({}))),
      ],
    });
    const stay = {
      checkIn: parseIsoDate(day(10)),
      checkOut: parseIsoDate(day(13)),
      guests: 2,
    };
    await prisma.booking.createMany({
      data: [
        { ...stay, listingId: L1.id, status: 'confirmed' },
        { ...stay, listingId: L2.id, status: 'cancelled' },
      ],
    });
    await prisma.blockedDay.create({
      data: {
        listingId: L3.id,
        day: parseIsoDate(day(20)),
        createdById: blocker.id,
      },
    });

    const rows = await prisma.listing.findMany({
      where: { tenantId: p.id },
      select: { id: true },
      orderBy: { id: 'asc' },
    });
    paginated.push(...rows.map(({ id }) => id));
  });

  afterAll(async () => {
    // Tenants first: their listings, bookings and blocked days go with them.
    await prisma.tenant.deleteMany({
      where: { slug: { in: [slugA, slugB, slugP] } },
    });
    await prisma.user.deleteMany({ where: { email: blockerEmail } });
    await app.close();
  });

  describe('GET /tenants', () => {
    it('lists the portals by slug, without their ids', async () => {
      const res = await get('/api/v1/tenants').expect(200);
      const tenants = z
        .array(z.strictObject(publicTenantSchema.shape))
        .parse(res.body);
      const slugs = tenants.map((tenant) => tenant.slug);

      expect(tenants).toContainEqual(tenantA);
      expect(slugs.indexOf(slugA)).toBeLessThan(slugs.indexOf(slugB));
    });
  });

  describe('GET /t/:tenantSlug', () => {
    it("returns the portal's configuration", async () => {
      const res = await get(`/api/v1/t/${slugA}`).expect(200);
      expect(res.body).toEqual(tenantA);
    });

    it.each([
      ['an unknown tenant', `nowhere-${run}`],
      ['a value that is not a slug', 'a%00b'],
    ])('answers %s with 404', async (_case, slug) => {
      const res = await get(`/api/v1/t/${slug}`).expect(404);
      expectApiError(res, 404, 'TENANT_NOT_FOUND');
    });
  });

  describe('GET /t/:tenantSlug/cities', () => {
    it("lists only the tenant's cities, once each", async () => {
      const res = await get(`/api/v1/t/${slugA}/cities`).expect(200);
      expect(res.body).toEqual(['Belgrade', 'Split']);
    });

    it('answers an unknown tenant with 404', async () => {
      const res = await get(`/api/v1/t/nowhere-${run}/cities`).expect(404);
      expectApiError(res, 404, 'TENANT_NOT_FOUND');
    });
  });

  describe('GET /t/:tenantSlug/listings', () => {
    const list = (query = '') => get(`/api/v1/t/${slugA}/listings${query}`);

    it("returns only the tenant's listings, newest first, as ListingDto", async () => {
      const res = await list().expect(200);
      const page = listingPageSchema.parse(res.body);

      expect(page).toMatchObject({ page: 1, pageSize: 24, total: 3 });
      expect(page.items).toEqual([L1, L2, L3]);
      for (const item of res.body.items as object[]) {
        expect(Object.keys(item).sort()).toEqual(
          Object.keys(listingDtoSchema.shape).sort(),
        );
      }
    });

    it.each([
      [
        "city, leaving out another tenant's listing in the same city",
        '?city=Belgrade',
        [L1, L2],
      ],
      ['guests', '?guests=3', [L2, L3]],
      [
        'nothing when a number is empty',
        '?maxPriceCents=&guests=',
        [L1, L2, L3],
      ],
      [
        'an inclusive price range',
        '?minPriceCents=8000&maxPriceCents=12000',
        [L1, L2],
      ],
    ])('filters by %s', async (_case, query, expected) => {
      const res = await list(query).expect(200);
      expect(idsOf(res)).toEqual(expected.map(({ id }) => id));
    });

    it.each([
      ['a stay starting on the checkout day', 13, 15, [L1, L2, L3]],
      ['a stay overlapping a confirmed booking', 12, 14, [L2, L3]],
      ['a stay covering a blocked day', 20, 21, [L1, L2]],
      ['a stay ending on a blocked day', 19, 20, [L1, L2, L3]],
    ])('keeps only free listings for %s', async (_case, from, to, expected) => {
      const res = await list(`?from=${day(from)}&to=${day(to)}`).expect(200);
      expect(idsOf(res)).toEqual(expected.map(({ id }) => id));
    });

    it.each([
      ['rating_desc', [L1, L3, L2]],
      ['price_asc', [L1, L2, L3]],
    ])('sorts by %s', async (sort, expected) => {
      const res = await list(`?sort=${sort}`).expect(200);
      expect(idsOf(res)).toEqual(expected.map(({ id }) => id));
    });

    it('pages through ties in id order without gaps or repeats', async () => {
      const pageOf = async (query: string) =>
        listingPageSchema.parse(
          (await get(`/api/v1/t/${slugP}/listings${query}`).expect(200)).body,
        );

      const first = await pageOf('?page=1');
      const second = await pageOf('?page=2');
      const past = await pageOf('?page=3');
      const sized = await pageOf('?page=3&pageSize=10');

      expect(first).toMatchObject({ page: 1, pageSize: 24, total: 25 });
      expect([...first.items, ...second.items].map(({ id }) => id)).toEqual(
        paginated,
      );
      expect(past).toMatchObject({ items: [], page: 3, total: 25 });
      expect(sized.items.map(({ id }) => id)).toEqual(paginated.slice(20));
      expect(sized.pageSize).toBe(10);
    });

    it.each([
      ['from in the past', `?from=${day(-1)}&to=${day(2)}`],
      ['from without to', `?from=${day(1)}`],
      ['a price above the database maximum', '?maxPriceCents=2147483648'],
      ['a city with a NUL byte', '?city=a%00b'],
    ])('rejects %s with 400', async (_case, query) => {
      const res = await list(query).expect(400);
      expectApiError(res, 400, 'BAD_REQUEST');
    });

    it('answers an unknown tenant with 404', async () => {
      const res = await get(`/api/v1/t/nowhere-${run}/listings`).expect(404);
      expectApiError(res, 404, 'TENANT_NOT_FOUND');
    });
  });

  describe('GET /t/:tenantSlug/listings/:id', () => {
    it('returns the listing as ListingDto', async () => {
      const res = await get(`/api/v1/t/${slugA}/listings/${L1.id}`).expect(200);
      expect(res.body).toEqual(L1);
    });

    it.each([
      ["another tenant's listing", slugB, () => L1.id],
      ['an id that does not exist', slugA, () => randomUUID()],
    ])('answers %s with 404', async (_case, slug, id) => {
      const res = await get(`/api/v1/t/${slug}/listings/${id()}`).expect(404);
      expectApiError(res, 404, 'LISTING_NOT_FOUND');
    });

    it('rejects an id that is not a uuid with 400', async () => {
      const res = await get(`/api/v1/t/${slugA}/listings/abc`).expect(400);
      expectApiError(res, 400, 'BAD_REQUEST');
    });
  });

  describe('GET /t/:tenantSlug/listings/:id/availability', () => {
    const availability = (slug: string, id: string, query: string) =>
      get(`/api/v1/t/${slug}/listings/${id}/availability${query}`);

    it.each([
      ['every night of a stay, not its checkout day', L1, 9, 15, [10, 11, 12]],
      ['the part of a stay within the range', L1, 11, 12, [11]],
      ['nothing for a cancelled booking', L2, 9, 15, []],
      ['a blocked day', L3, 19, 22, [20]],
    ])('lists %s', async (_case, { id }, from, to, taken) => {
      const res = await availability(
        slugA,
        id,
        `?from=${day(from)}&to=${day(to)}`,
      ).expect(200);
      expect(listingAvailabilitySchema.parse(res.body)).toEqual({
        from: day(from),
        to: day(to),
        unavailableDays: taken.map(day),
      });
    });

    it.each([
      ["another tenant's listing", slugB, () => L1.id],
      ['an id that does not exist', slugA, () => randomUUID()],
    ])('answers %s with 404', async (_case, slug, id) => {
      const range = `?from=${day(1)}&to=${day(30)}`;
      const res = await availability(slug, id(), range).expect(404);
      expectApiError(res, 404, 'LISTING_NOT_FOUND');
    });

    it('rejects an id that is not a uuid with 400', async () => {
      const range = `?from=${day(1)}&to=${day(30)}`;
      const res = await availability(slugA, 'abc', range).expect(400);
      expectApiError(res, 400, 'BAD_REQUEST');
    });

    it.each([
      ['from in the past', `?from=${day(-1)}&to=${day(2)}`],
      ['a missing to', `?from=${day(1)}`],
      ['to equal to from', `?from=${day(1)}&to=${day(1)}`],
    ])('rejects %s with 400', async (_case, query) => {
      const res = await availability(slugA, L1.id, query).expect(400);
      expectApiError(res, 400, 'BAD_REQUEST');
    });
  });
});
