import { randomUUID } from 'node:crypto';
import { addDays, type IsoDate, today } from '@ars/shared';
import { Test, type TestingModule } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppConfigModule } from '../src/core/config/config.module.js';
import { DatabaseModule } from '../src/core/database/database.module.js';
import { PrismaService } from '../src/core/database/prisma.service.js';
import type { Prisma } from '../src/generated/prisma/client.js';

/** A calendar day as Prisma takes it for a `date` column. */
function day(date: IsoDate): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

const D = today();

describe('database schema (e2e)', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  // Every row this file creates carries the run id, so parallel test files
  // never collide and the cleanup finds exactly these rows.
  const run = randomUUID().slice(0, 8);
  let sequence = 0;
  const next = () => `${run}-${++sequence}`;

  const createTenant = (data: Partial<Prisma.TenantCreateInput> = {}) =>
    prisma.tenant.create({
      data: { slug: `e2e-db-${next()}`, name: 'E2E tenant', ...data },
    });

  const createUser = (data: Partial<Prisma.UserCreateInput> = {}) =>
    prisma.user.create({
      data: {
        email: `user-${next()}@example.test`,
        passwordHash: 'not-a-real-hash',
        name: 'E2E user',
        ...data,
      },
    });

  const createListing = (
    tenantId: string,
    data: Partial<Prisma.ListingUncheckedCreateInput> = {},
  ) =>
    prisma.listing.create({
      data: {
        tenantId,
        title: 'Seaside apartment',
        city: 'Split',
        country: 'HR',
        latitude: 43.508133,
        longitude: 16.440193,
        propertyType: 'apartment',
        maxGuests: 4,
        bedrooms: 2,
        pricePerNightCents: 12000,
        rating: 4.5,
        reviewCount: 12,
        createdAt: day(addDays(D, -30)),
        ...data,
      },
    });

  const createBooking = (
    listingId: string,
    from: number,
    to: number,
    data: Partial<Prisma.BookingUncheckedCreateInput> = {},
  ) =>
    prisma.booking.create({
      data: {
        listingId,
        checkIn: day(addDays(D, from)),
        checkOut: day(addDays(D, to)),
        guests: 2,
        status: 'confirmed',
        totalCents: (to - from) * 12000,
        ...data,
      },
    });

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppConfigModule, DatabaseModule],
    }).compile();
    await moduleRef.init();
    prisma = moduleRef.get(PrismaService);
  });

  afterAll(async () => {
    // Tenants first: the cascade removes the blocked days that keep users.
    await prisma.tenant.deleteMany({ where: { slug: { contains: run } } });
    await prisma.user.deleteMany({ where: { email: { contains: run } } });
    await moduleRef.close();
  });

  it('has every table of the schema', async () => {
    await expect(
      Promise.all([
        prisma.tenant.count(),
        prisma.user.count(),
        prisma.tenantMembership.count(),
        prisma.listing.count(),
        prisma.booking.count(),
        prisma.blockedDay.count(),
      ]),
    ).resolves.toHaveLength(6);
  });

  it('stores a calendar date without shifting it', async () => {
    const tenant = await createTenant();
    const listing = await createListing(tenant.id);
    const booking = await createBooking(listing.id, 10, 13);

    const [stored] = await prisma.$queryRaw<{ check_in: string }[]>`
      SELECT check_in::text FROM bookings WHERE id = ${booking.id}::uuid`;
    const read = await prisma.booking.findUniqueOrThrow({
      where: { id: booking.id },
    });

    expect(stored?.check_in).toBe(addDays(D, 10));
    expect(read.checkIn.toISOString().slice(0, 10)).toBe(addDays(D, 10));
  });

  describe('CHECK constraints', () => {
    let tenantId: string;
    let listingId: string;

    beforeAll(async () => {
      tenantId = (await createTenant()).id;
      listingId = (await createListing(tenantId)).id;
    });

    it.each<[string, Partial<Prisma.ListingUncheckedCreateInput>]>([
      ['listings_max_guests_check', { maxGuests: 0 }],
      ['listings_max_guests_check', { maxGuests: 13 }],
      ['listings_bedrooms_check', { bedrooms: -1 }],
      [
        'listings_studio_bedrooms_check',
        { propertyType: 'studio', bedrooms: 1 },
      ],
      ['listings_price_per_night_cents_check', { pricePerNightCents: -1 }],
      ['listings_review_count_check', { reviewCount: -1 }],
      ['listings_unrated_review_count_check', { rating: null, reviewCount: 3 }],
      ['listings_rating_check', { rating: 5.1 }],
      ['listings_rating_check', { rating: -0.1 }],
    ])('a listing violating %s is rejected (%o)', async (constraint, data) => {
      await expect(createListing(tenantId, data)).rejects.toThrow(constraint);
    });

    it.each<[string, Partial<Prisma.ListingUncheckedCreateInput>]>([
      ['one guest', { maxGuests: 1 }],
      ['twelve guests', { maxGuests: 12 }],
      ['a studio with no bedrooms', { propertyType: 'studio', bedrooms: 0 }],
      ['a free night', { pricePerNightCents: 0 }],
      ['no rating and no reviews', { rating: null, reviewCount: 0 }],
      ['the top rating', { rating: 5 }],
    ])('a listing with %s is accepted', async (_, data) => {
      await expect(createListing(tenantId, data)).resolves.toMatchObject({
        tenantId,
      });
    });

    it.each<[string, number, number, number]>([
      ['bookings_check_out_after_check_in_check', 30, 30, 2],
      ['bookings_check_out_after_check_in_check', 31, 30, 2],
      ['bookings_guests_check', 40, 41, 0],
    ])(
      'a booking violating %s is rejected (+%i → +%i, %i guests)',
      async (constraint, from, to, guests) => {
        await expect(
          createBooking(listingId, from, to, { guests }),
        ).rejects.toThrow(constraint);
      },
    );

    it('a booking with a negative total is rejected', async () => {
      await expect(
        createBooking(listingId, 42, 43, { totalCents: -1 }),
      ).rejects.toThrow('bookings_total_cents_check');
    });

    it('a free stay is accepted', async () => {
      await expect(
        createBooking(listingId, 44, 45, { totalCents: 0 }),
      ).resolves.toMatchObject({ listingId, totalCents: 0 });
    });

    it('a one-night booking for one guest is accepted', async () => {
      await expect(
        createBooking(listingId, 50, 51, { guests: 1 }),
      ).resolves.toMatchObject({ listingId, guests: 1 });
    });

    it('an e-mail that is not lowercase is rejected', async () => {
      await expect(
        createUser({ email: `Host-${next()}@Example.test` }),
      ).rejects.toThrow('users_email_lowercase_check');
    });

    // Used as they are: a suffix could make them valid, and they are never
    // written unless the constraint is missing.
    it.each([
      'Adriatic',
      'adriatic-',
      '-adriatic',
      'adriatic--coast',
      'adri atic',
    ])('the slug %j is rejected', async (slug) => {
      await expect(createTenant({ slug })).rejects.toThrow(
        'tenants_slug_format_check',
      );
    });
  });

  describe('no overlapping active bookings (EXCLUDE)', () => {
    let listingId: string;

    beforeAll(async () => {
      const tenant = await createTenant();
      listingId = (await createListing(tenant.id)).id;
      await createBooking(listingId, 10, 13);
      await createBooking(listingId, 20, 23, { status: 'cancelled' });
    });

    it.each(['confirmed', 'completed'] as const)(
      'rejects a %s booking that overlaps an active one',
      async (status) => {
        await expect(
          createBooking(listingId, 12, 14, { status }),
        ).rejects.toThrow('bookings_no_overlap_excl');
      },
    );

    it('accepts a stay that starts on the previous checkout day', async () => {
      await expect(createBooking(listingId, 13, 15)).resolves.toMatchObject({
        listingId,
      });
    });

    it('accepts a cancelled booking over an active one', async () => {
      await expect(
        createBooking(listingId, 11, 12, { status: 'cancelled' }),
      ).resolves.toMatchObject({ status: 'cancelled' });
    });

    it('accepts an active booking over a cancelled one', async () => {
      await expect(createBooking(listingId, 21, 22)).resolves.toMatchObject({
        status: 'confirmed',
      });
    });
  });

  describe('keys', () => {
    it('rejects a duplicate slug with P2002', async () => {
      const tenant = await createTenant();
      await expect(createTenant({ slug: tenant.slug })).rejects.toMatchObject({
        code: 'P2002',
      });
    });

    it('rejects a duplicate e-mail with P2002', async () => {
      const user = await createUser();
      await expect(createUser({ email: user.email })).rejects.toMatchObject({
        code: 'P2002',
      });
    });

    it('rejects a booking of an unknown listing with P2003', async () => {
      await expect(createBooking(randomUUID(), 60, 61)).rejects.toMatchObject({
        code: 'P2003',
      });
    });

    it('does not delete a user who blocked a day', async () => {
      const tenant = await createTenant();
      const listing = await createListing(tenant.id);
      const user = await createUser();
      await prisma.blockedDay.create({
        data: {
          listingId: listing.id,
          day: day(addDays(D, 5)),
          createdById: user.id,
        },
      });

      await expect(
        prisma.user.delete({ where: { id: user.id } }),
      ).rejects.toMatchObject({ code: 'P2003' });
    });
  });

  it('deleting a tenant deletes its data but keeps its users', async () => {
    const tenant = await createTenant();
    const host = await createUser();
    await prisma.tenantMembership.create({
      data: { tenantId: tenant.id, userId: host.id },
    });
    const listing = await createListing(tenant.id);
    const booking = await createBooking(listing.id, 10, 12);
    await prisma.blockedDay.create({
      data: {
        listingId: listing.id,
        day: day(addDays(D, 20)),
        createdById: host.id,
      },
    });

    await prisma.tenant.delete({ where: { id: tenant.id } });

    await expect(
      Promise.all([
        prisma.listing.count({ where: { id: listing.id } }),
        prisma.booking.count({ where: { id: booking.id } }),
        prisma.blockedDay.count({ where: { listingId: listing.id } }),
        prisma.tenantMembership.count({ where: { tenantId: tenant.id } }),
      ]),
    ).resolves.toEqual([0, 0, 0, 0]);
    await expect(prisma.user.count({ where: { id: host.id } })).resolves.toBe(
      1,
    );
  });
});
