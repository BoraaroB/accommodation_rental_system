import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { addDays, today } from '@ars/shared';
import { Test, type TestingModule } from '@nestjs/testing';
import { compare } from 'bcrypt';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SEED_TENANTS, SEED_USERS } from '../prisma/seed/accounts.js';
import {
  mapRows,
  parseBookingRow,
  parseCsv,
  parseListingRow,
} from '../prisma/seed/mappers.js';
import { seed, type SeedCounts } from '../prisma/seed/seed.js';
import { AppConfigModule } from '../src/core/config/config.module.js';
import { DatabaseModule } from '../src/core/database/database.module.js';
import { PrismaService } from '../src/core/database/prisma.service.js';

const readData = (file: string) =>
  parseCsv(
    readFileSync(new URL(`../../../data/${file}`, import.meta.url), 'utf8'),
  );

const D = today();
const PASSWORD = 'e2e-seed-password';
/** The first row of listings.csv. */
const LISTING_ID = '128699a9-d81d-4217-b143-21d21169ed25';
/** A host's edit between two runs, which the second run must keep. */
const EDITED_PRICE_CENTS = 99_900;
const SLUGS = SEED_TENANTS.map((tenant) => tenant.slug);
const EMAILS = SEED_USERS.map((user) => user.email);

/** Loading 13.7 thousand rows takes a few seconds. */
const SEED_TIMEOUT_MS = 60_000;

describe('seed (e2e)', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  const input = {
    listings: mapRows(
      'listings.csv',
      readData('listings.csv'),
      parseListingRow,
    ),
    bookings: mapRows(
      'bookings.csv',
      readData('bookings.csv'),
      parseBookingRow,
    ),
    password: PASSWORD,
  };
  let first: SeedCounts;
  let second: SeedCounts;

  // Deleting the seeded tenants cascades to their listings, bookings and
  // memberships; users are never deleted with a tenant, so they go separately.
  const removeSeededRows = async () => {
    await prisma.tenant.deleteMany({ where: { slug: { in: SLUGS } } });
    await prisma.user.deleteMany({ where: { email: { in: EMAILS } } });
  };

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppConfigModule, DatabaseModule],
    }).compile();
    prisma = moduleRef.get(PrismaService);
    await removeSeededRows();
    first = await seed(prisma, input);
    await prisma.listing.update({
      where: { id: LISTING_ID },
      data: { pricePerNightCents: EDITED_PRICE_CENTS },
    });
    second = await seed(prisma, input);
  }, SEED_TIMEOUT_MS);

  afterAll(async () => {
    await removeSeededRows();
    await moduleRef.close();
  }, SEED_TIMEOUT_MS);

  it('inserts every row on the first run', () => {
    expect(first).toEqual({
      tenants: 3,
      users: 8,
      memberships: 6,
      listings: 1000,
      bookings: 12_757,
    });
  });

  it('inserts nothing on a repeated run', () => {
    expect(second).toEqual({
      tenants: 0,
      users: 0,
      memberships: 0,
      listings: 0,
      bookings: 0,
    });
  });

  it('keeps data changed after the first run', async () => {
    const listing = await prisma.listing.findUniqueOrThrow({
      where: { id: LISTING_ID },
    });
    expect(listing.pricePerNightCents).toBe(EDITED_PRICE_CENTS);
  });

  it('rejects overlapping stays and then writes nothing', async () => {
    const listing = { ...input.listings[0]!, id: randomUUID() };
    const stay = (checkIn: string, checkOut: string) => ({
      id: randomUUID(),
      listingId: listing.id,
      checkIn,
      checkOut,
      guests: 1,
      status: 'confirmed' as const,
    });

    await expect(
      seed(prisma, {
        listings: [listing],
        bookings: [
          stay(addDays(D, 7), addDays(D, 10)),
          stay(addDays(D, 9), addDays(D, 11)),
        ],
        password: PASSWORD,
      }),
    ).rejects.toThrow('1 bookings overlap an active stay on the same listing');
    expect(await prisma.listing.count({ where: { id: listing.id } })).toBe(0);
  });

  it('assigns the listings to the tenants by country', async () => {
    const perTenant = await Promise.all(
      SLUGS.map((slug) =>
        prisma.listing.count({ where: { tenant: { slug } } }),
      ),
    );
    expect(perTenant).toEqual([363, 428, 209]);
    expect(
      await prisma.booking.count({
        where: { listing: { tenant: { slug: { in: SLUGS } } } },
      }),
    ).toBe(12_757);
  });

  it('stores a CSV row with its values unchanged', async () => {
    const listing = await prisma.listing.findFirstOrThrow({
      where: { id: LISTING_ID },
      include: { tenant: true },
    });

    expect(listing).toMatchObject({
      tenant: { slug: 'west-europe' },
      country: 'PT',
      maxGuests: 3,
      createdAt: new Date('2025-08-22T00:00:00.000Z'),
    });
    expect(listing.rating?.toString()).toBe('4.2');
  });

  it('gives every host a membership in their tenant only', async () => {
    const host = await prisma.user.findUniqueOrThrow({
      where: { email: 'host1.adriatic@example.com' },
      include: { memberships: { include: { tenant: true } } },
    });

    expect(host.isSuperadmin).toBe(false);
    expect(host.memberships.map((m) => m.tenant.slug)).toEqual(['adriatic']);
  });

  it('stores the demo password as a bcrypt hash', async () => {
    const admin = await prisma.user.findUniqueOrThrow({
      where: { email: 'admin@example.com' },
    });

    expect(admin.isSuperadmin).toBe(true);
    expect(admin.passwordHash).not.toBe(PASSWORD);
    expect(await compare(PASSWORD, admin.passwordHash)).toBe(true);
  });
});
