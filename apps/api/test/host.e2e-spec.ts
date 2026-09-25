import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import {
  accessTokenSchema,
  addDays,
  apiErrorSchema,
  hostBookingPageSchema,
  listingAvailabilitySchema,
  listingBlockedDaysSchema,
  listingDtoSchema,
  listingPageSchema,
  MAX_BLOCKED_RANGE_DAYS,
  parseIsoDate,
  today,
  type ListingDto,
  type ListingUpdateInput,
} from '@ars/shared';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request, { type Response } from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import {
  PASSWORD_HASHER,
  type PasswordHasher,
} from '../src/auth/password-hasher.js';
import { PrismaService } from '../src/core/database/prisma.service.js';

const PASSWORD = 'e2e-password-1';

function expectApiError(res: Response, statusCode: number, code: string) {
  expect(apiErrorSchema.parse(res.body)).toMatchObject({ statusCode, code });
}

/** `n` days from today: fixtures never depend on the day the tests run. */
const day = (n: number) => addDays(today(), n);

type Method = 'get' | 'patch' | 'post' | 'delete';
type UserName = 'hostA' | 'hostB' | 'client' | 'admin';

describe('Host panel (e2e)', () => {
  let app: NestExpressApplication<Server>;
  let prisma: PrismaService;
  const run = randomUUID().slice(0, 8);
  const slugA = `e2e-host-a-${run}`;
  const slugB = `e2e-host-b-${run}`;
  // E-mails are stored lowercase (users_email_lowercase_check).
  const emailOf = (name: UserName) =>
    `e2e-host-${name.toLowerCase()}-${run}@example.com`;
  const ids: Partial<Record<UserName, string>> = {};
  const tokens: Partial<Record<UserName, string>> = {};

  /**
   * Tenant A: L1 (Split) has a completed stay in the past, a confirmed stay
   * D+10 → D+13 for 3 guests and a cancelled one D+20 → D+22 for 4; L2
   * (Belgrade) is a studio without bookings; L3 is the one the edit test
   * changes; L4 has a `%` in its title. Tenant B has B1 with a stay.
   */
  const L1 = listing({
    title: 'Sea view apartment',
    city: 'Split',
    country: 'HR',
    maxGuests: 4,
    pricePerNightCents: 12000,
    createdAt: '2025-01-03',
  });
  const L2 = listing({
    title: 'Old town studio',
    city: 'Belgrade',
    propertyType: 'studio',
    bedrooms: 0,
    createdAt: '2025-01-02',
  });
  const L3 = listing({ title: 'Garden house', createdAt: '2025-01-01' });
  const L4 = listing({ title: '50% off loft', createdAt: '2024-12-31' });
  const B1 = listing({ title: 'Sea view in B' });
  const bookingIds = {
    past: randomUUID(),
    confirmed: randomUUID(),
    cancelled: randomUUID(),
    other: randomUUID(),
  };

  /** L1's edit that keeps it as it is: every editable field. */
  const keepL1: ListingUpdateInput = {
    title: L1.title,
    propertyType: L1.propertyType,
    pricePerNightCents: L1.pricePerNightCents,
    maxGuests: L1.maxGuests,
    bedrooms: L1.bedrooms,
  };

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

  function call(
    method: Method,
    path: string,
    as?: UserName,
    body?: object,
  ): request.Test {
    let req = request(app.getHttpServer())[method](`/api/v1${path}`);
    if (as !== undefined) {
      req = req.auth(tokens[as] ?? '', { type: 'bearer' });
    }
    return body === undefined ? req : req.send(body);
  }

  const host = (slug: string) => `/t/${slug}/host`;
  const blockedDays = (slug: string, listingId: string) =>
    `${host(slug)}/listings/${listingId}/blocked-days`;
  const range = (from: string, to: string) => `?from=${from}&to=${to}`;
  /** L1's blocked-day rows within `[from, to)`, as stored. */
  const blockedRows = (from: string, to: string) =>
    prisma.blockedDay.findMany({
      where: {
        listingId: L1.id,
        day: { gte: parseIsoDate(from), lt: parseIsoDate(to) },
      },
      orderBy: { day: 'asc' },
    });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication<Server>>();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    const a = await prisma.tenant.create({
      data: { slug: slugA, name: 'E2E Host A' },
    });
    const b = await prisma.tenant.create({
      data: { slug: slugB, name: 'E2E Host B' },
    });
    await prisma.listing.createMany({
      data: [
        listingRow(a.id, L1),
        listingRow(a.id, L2),
        listingRow(a.id, L3),
        listingRow(a.id, L4),
        listingRow(b.id, B1),
      ],
    });
    const stay = (from: number, to: number) => ({
      checkIn: parseIsoDate(day(from)),
      checkOut: parseIsoDate(day(to)),
    });
    await prisma.booking.createMany({
      data: [
        {
          id: bookingIds.past,
          listingId: L1.id,
          ...stay(-10, -7),
          guests: 2,
          status: 'completed',
        },
        {
          id: bookingIds.confirmed,
          listingId: L1.id,
          ...stay(10, 13),
          guests: 3,
          status: 'confirmed',
        },
        {
          id: bookingIds.cancelled,
          listingId: L1.id,
          ...stay(20, 22),
          guests: 4,
          status: 'cancelled',
        },
        {
          id: bookingIds.other,
          listingId: B1.id,
          ...stay(5, 8),
          guests: 1,
          status: 'confirmed',
        },
      ],
    });

    const passwordHash = await app
      .get<PasswordHasher>(PASSWORD_HASHER)
      .hash(PASSWORD);
    const users: Record<UserName, { tenantId?: string; admin?: boolean }> = {
      hostA: { tenantId: a.id },
      hostB: { tenantId: b.id },
      client: {},
      admin: { admin: true },
    };
    for (const [name, { tenantId, admin }] of Object.entries(users) as [
      UserName,
      { tenantId?: string; admin?: boolean },
    ][]) {
      const user = await prisma.user.create({
        data: {
          email: emailOf(name),
          name,
          passwordHash,
          isSuperadmin: admin ?? false,
          memberships: tenantId ? { create: { tenantId } } : undefined,
        },
      });
      ids[name] = user.id;
      const res = await call('post', '/auth/login', undefined, {
        email: emailOf(name),
        password: PASSWORD,
      }).expect(200);
      tokens[name] = accessTokenSchema.parse(res.body).accessToken;
    }
  });

  afterAll(async () => {
    // Tenants first: their listings, bookings and blocked days go with them,
    // and a blocked day keeps its creator from being deleted.
    await prisma.tenant.deleteMany({ where: { slug: { in: [slugA, slugB] } } });
    await prisma.user.deleteMany({ where: { email: { contains: run } } });
    await app.close();
  });

  describe('access', () => {
    const later = range(day(200), day(201));
    const routes: [string, Method, (slug: string) => string, object?][] = [
      ['the listing table', 'get', (slug) => `${host(slug)}/listings`],
      ['a listing', 'get', (slug) => `${host(slug)}/listings/${L1.id}`],
      [
        'a listing edit',
        'patch',
        (slug) => `${host(slug)}/listings/${L1.id}`,
        keepL1,
      ],
      [
        'the blocked days',
        'get',
        (slug) => `${blockedDays(slug, L1.id)}${later}`,
      ],
      [
        'blocking',
        'post',
        (slug) => blockedDays(slug, L1.id),
        { from: day(200), to: day(201) },
      ],
      ['unblocking', 'delete', (slug) => `${blockedDays(slug, L1.id)}${later}`],
      ['the booking table', 'get', (slug) => `${host(slug)}/bookings`],
    ];

    it.each(routes)(
      'answers %s with 401 anonymous, 404 for an unknown tenant and 403 to a client or another tenant’s host',
      async (_route, method, path, body) => {
        expectApiError(
          await call(method, path(slugA), undefined, body).expect(401),
          401,
          'AUTHENTICATION_REQUIRED',
        );
        expectApiError(
          await call(method, path(`nowhere-${run}`), 'hostA', body).expect(404),
          404,
          'TENANT_NOT_FOUND',
        );
        for (const name of ['client', 'hostB'] as const) {
          expectApiError(
            await call(method, path(slugA), name, body).expect(403),
            403,
            'INSUFFICIENT_PERMISSIONS',
          );
        }
      },
    );

    it.each(routes)(
      'lets the tenant’s host and the superadmin reach %s',
      async (_route, method, path, body) => {
        for (const name of ['hostA', 'admin'] as const) {
          const res = await call(method, path(slugA), name, body);
          expect(res.status).toBeGreaterThanOrEqual(200);
          expect(res.status).toBeLessThan(300);
        }
      },
    );

    it.each([
      ['get', `/listings/${L1.id}`, undefined],
      ['patch', `/listings/${L1.id}`, keepL1],
      ['get', `/listings/${L1.id}/blocked-days${range(day(1), day(2))}`],
      ['post', `/listings/${L1.id}/blocked-days`, { from: day(1), to: day(2) }],
      ['delete', `/listings/${L1.id}/blocked-days${range(day(1), day(2))}`],
    ] as [Method, string, object?][])(
      'answers %s of another tenant’s listing with 404 (%s)',
      async (method, path, body) => {
        const res = await call(
          method,
          `${host(slugB)}${path}`,
          'hostB',
          body,
        ).expect(404);
        expectApiError(res, 404, 'LISTING_NOT_FOUND');
      },
    );
  });

  describe('GET /t/:tenantSlug/host/listings', () => {
    const idsOf = (res: Response) =>
      listingPageSchema.parse(res.body).items.map((item) => item.id);

    it('lists only the tenant’s listings, newest first', async () => {
      const res = await call('get', `${host(slugA)}/listings`, 'hostA').expect(
        200,
      );
      expect(idsOf(res)).toEqual([L1.id, L2.id, L3.id, L4.id]);
      expect(res.body).toMatchObject({ page: 1, pageSize: 24, total: 4 });
    });

    it.each([
      ['a title, regardless of case', 'SEA VIEW', [L1.id]],
      ['a city, regardless of case', 'split', [L1.id]],
      ['a part of a word', 'studi', [L2.id]],
      ['a percent sign as plain text', '%', [L4.id]],
      ['an underscore as plain text', '_', []],
    ])('searches %s', async (_case, q, expected) => {
      const res = await call(
        'get',
        `${host(slugA)}/listings?q=${encodeURIComponent(q)}`,
        'hostA',
      ).expect(200);
      expect(idsOf(res)).toEqual(expected);
      expect(res.body).toMatchObject({ total: expected.length });
    });
  });

  describe('GET and PATCH /t/:tenantSlug/host/listings/:id', () => {
    it('returns the listing', async () => {
      const res = await call(
        'get',
        `${host(slugA)}/listings/${L1.id}`,
        'hostA',
      ).expect(200);
      expect(listingDtoSchema.parse(res.body)).toEqual(L1);
    });

    it('writes the edit, ignores other fields and shows it on the portal', async () => {
      const edit: ListingUpdateInput = {
        title: 'Renovated loft',
        propertyType: 'loft',
        pricePerNightCents: 9900,
        maxGuests: 3,
        bedrooms: 2,
      };
      const res = await call(
        'patch',
        `${host(slugA)}/listings/${L3.id}`,
        'hostA',
        { ...edit, rating: 1, tenantId: randomUUID() },
      ).expect(200);

      const updated = { ...L3, ...edit };
      expect(listingDtoSchema.parse(res.body)).toEqual(updated);
      const portal = await call('get', `/t/${slugA}/listings/${L3.id}`).expect(
        200,
      );
      expect(portal.body).toEqual(updated);
    });

    it.each([
      ['a studio with a bedroom', { propertyType: 'studio', bedrooms: 1 }],
      ['more than 12 guests', { maxGuests: 13 }],
      ['a missing field', { title: undefined }],
      ['a price in euros', { pricePerNightCents: 99.5 }],
    ])('rejects %s with 400', async (_case, change) => {
      const res = await call(
        'patch',
        `${host(slugA)}/listings/${L1.id}`,
        'hostA',
        { ...keepL1, ...change },
      ).expect(400);
      expectApiError(res, 400, 'BAD_REQUEST');
    });

    it('rejects a maximum below an active booking’s guests with 409', async () => {
      const res = await call(
        'patch',
        `${host(slugA)}/listings/${L1.id}`,
        'hostA',
        { ...keepL1, maxGuests: 2 },
      ).expect(409);
      expectApiError(res, 409, 'MAX_GUESTS_BELOW_BOOKING');
      const row = await prisma.listing.findUniqueOrThrow({
        where: { id: L1.id },
      });
      expect(row.maxGuests).toBe(L1.maxGuests);
    });

    it('allows the maximum of the active bookings, below a cancelled booking’s guests', async () => {
      const res = await call(
        'patch',
        `${host(slugA)}/listings/${L1.id}`,
        'hostA',
        { ...keepL1, maxGuests: 3 },
      ).expect(200);
      expect(res.body).toMatchObject({ maxGuests: 3 });
      await call(
        'patch',
        `${host(slugA)}/listings/${L1.id}`,
        'hostA',
        keepL1,
      ).expect(200);
    });

    it('answers a non-uuid id with 400', async () => {
      const res = await call(
        'get',
        `${host(slugA)}/listings/not-a-uuid`,
        'hostA',
      ).expect(400);
      expectApiError(res, 400, 'BAD_REQUEST');
    });
  });

  describe('/t/:tenantSlug/host/listings/:id/blocked-days', () => {
    const path = () => blockedDays(slugA, L1.id);

    it('blocks a day for the host, idempotently, and the portal shows it taken', async () => {
      const body = { from: day(30), to: day(31) };
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const res = await call('post', path(), 'hostA', body).expect(201);
        expect(listingBlockedDaysSchema.parse(res.body)).toEqual({
          ...body,
          days: [day(30)],
        });
      }

      const rows = await blockedRows(day(30), day(31));
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ createdById: ids.hostA });
      const listed = await call(
        'get',
        `${path()}${range(day(29), day(32))}`,
        'hostA',
      ).expect(200);
      expect(listed.body).toEqual({
        from: day(29),
        to: day(32),
        days: [day(30)],
      });
      const availability = await call(
        'get',
        `/t/${slugA}/listings/${L1.id}/availability${range(day(29), day(32))}`,
      ).expect(200);
      expect(
        listingAvailabilitySchema.parse(availability.body).unavailableDays,
      ).toEqual([day(30)]);
    });

    it('blocks nothing of a range an active booking takes a day of', async () => {
      const res = await call('post', path(), 'hostA', {
        from: day(8),
        to: day(12),
      }).expect(409);
      expectApiError(res, 409, 'DAY_ALREADY_BOOKED');
      expect(res.body).toMatchObject({ message: `${day(10)} is booked` });
      expect(await blockedRows(day(8), day(12))).toEqual([]);
    });

    it.each([
      ['a day under a cancelled booking', day(20), day(22)],
      ['a booking’s checkout day', day(13), day(14)],
    ])('blocks %s', async (_case, from, to) => {
      await call('post', path(), 'hostA', { from, to }).expect(201);
    });

    it('unblocks a range, also when nothing in it is blocked', async () => {
      const unblock = `${path()}${range(day(13), day(31))}`;
      await call('delete', unblock, 'hostA').expect(204);
      await call('delete', unblock, 'hostA').expect(204);

      const listed = await call(
        'get',
        `${path()}${range(day(13), day(31))}`,
        'hostA',
      ).expect(200);
      expect(listed.body).toMatchObject({ days: [] });
    });

    it('lists a range in the past', async () => {
      await call('get', `${path()}${range(day(-10), day(-1))}`, 'hostA').expect(
        200,
      );
    });

    it.each([
      ['a day in the past', { from: day(-1), to: day(0) }],
      ['to not after from', { from: day(30), to: day(30) }],
      [
        'a range longer than the maximum',
        { from: day(1), to: day(2 + MAX_BLOCKED_RANGE_DAYS) },
      ],
      ['to a date that does not exist', { from: day(1), to: '2099-02-29' }],
    ])('rejects blocking %s with 400', async (_case, body) => {
      const res = await call('post', path(), 'hostA', body).expect(400);
      expectApiError(res, 400, 'BAD_REQUEST');
    });

    it.each([
      ['listing', `?from=${day(1)}`, 'get'],
      ['listing from the year 0000', range('0000-12-31', day(1)), 'get'],
      ['unblocking in the past', range(day(-2), day(-1)), 'delete'],
    ] as const)(
      'rejects %s without a valid range',
      async (_case, query, method) => {
        const res = await call(method, `${path()}${query}`, 'hostA').expect(
          400,
        );
        expectApiError(res, 400, 'BAD_REQUEST');
      },
    );
  });

  describe('GET /t/:tenantSlug/host/bookings', () => {
    const bookings = (query: string, as: UserName = 'hostA') =>
      call('get', `${host(slugA)}/bookings${query}`, as).expect(200);
    const idsOf = (res: Response) =>
      hostBookingPageSchema.parse(res.body).items.map((item) => item.id);

    it('lists only the tenant’s bookings by check-in, with the listing and the total', async () => {
      const res = await bookings('');
      const page = hostBookingPageSchema.parse(res.body);
      expect(page.items.map((item) => item.id)).toEqual([
        bookingIds.past,
        bookingIds.confirmed,
        bookingIds.cancelled,
      ]);
      expect(page.total).toBe(3);
      expect(page.items[1]).toEqual({
        id: bookingIds.confirmed,
        listingId: L1.id,
        checkIn: day(10),
        checkOut: day(13),
        guests: 3,
        status: 'confirmed',
        listingTitle: L1.title,
        totalCents: 3 * L1.pricePerNightCents,
      });
    });

    it.each([
      ['listing', `?listingId=${L2.id}`, []],
      ['status', '?status=cancelled', ['cancelled']],
      [
        'the stays taking a day of [from, to), not one ending on from',
        range(day(13), day(21)),
        ['cancelled'],
      ],
      ['a range in the past', range(day(-9), day(-8)), ['past']],
    ] as const)('filters by %s', async (_case, query, expected) => {
      expect(idsOf(await bookings(query))).toEqual(
        expected.map((name) => bookingIds[name]),
      );
    });

    it('gives an empty page for another tenant’s listing', async () => {
      const res = await call(
        'get',
        `${host(slugB)}/bookings?listingId=${L1.id}`,
        'hostB',
      ).expect(200);
      expect(res.body).toMatchObject({ items: [], total: 0 });
    });

    it.each([
      ['from without to', `?from=${day(1)}`],
      ['a date in the year 0000', range('0000-12-31', day(1))],
    ])('rejects %s with 400', async (_case, query) => {
      const res = await call(
        'get',
        `${host(slugA)}/bookings${query}`,
        'hostA',
      ).expect(400);
      expectApiError(res, 400, 'BAD_REQUEST');
    });
  });
});
