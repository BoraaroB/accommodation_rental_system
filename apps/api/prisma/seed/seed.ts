import { parseIsoDate, type BookingDto, type ListingDto } from '@ars/shared';
import { BcryptPasswordHasher } from '../../src/auth/bcrypt-password-hasher.js';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { SEED_TENANTS, SEED_USERS, tenantSlugForCountry } from './accounts.js';

/** Rows per `createMany`, well below Postgres' limit of 65,535 bind parameters. */
const BATCH_SIZE = 1000;

/** 13.7 thousand rows need more than Prisma's default of 5 s. */
const TRANSACTION_TIMEOUT_MS = 120_000;

export interface SeedInput {
  listings: readonly ListingDto[];
  bookings: readonly BookingDto[];
  /** The password of every seeded account. */
  password: string;
}

/** Rows this run inserted, per table; 0 everywhere on a repeated run. */
export interface SeedCounts {
  tenants: number;
  users: number;
  memberships: number;
  listings: number;
  bookings: number;
}

/** The id of a row looked up by its unique key right after inserting it. */
function idOf(ids: ReadonlyMap<string, string>, key: string): string {
  const id = ids.get(key);
  if (id === undefined) {
    throw new Error(`Seeded row "${key}" is missing`);
  }
  return id;
}

function batches<T>(items: readonly T[]): T[][] {
  const result: T[][] = [];
  for (let start = 0; start < items.length; start += BATCH_SIZE) {
    result.push(items.slice(start, start + BATCH_SIZE));
  }
  return result;
}

/**
 * Every booking fits its listing: `guests` is at most the listing's
 * `maxGuests` (`contracts.ts`), a rule the database cannot check across
 * tables. Bookings of a listing that is not in the input are left to the
 * foreign key.
 */
export function assertGuestsFit(
  listings: readonly ListingDto[],
  bookings: readonly BookingDto[],
): void {
  const maxGuests = new Map(
    listings.map((listing) => [listing.id, listing.maxGuests]),
  );
  for (const booking of bookings) {
    const max = maxGuests.get(booking.listingId);
    if (max !== undefined && booking.guests > max) {
      throw new Error(
        `Booking ${booking.id} has ${booking.guests} guests; its listing allows ${max}`,
      );
    }
  }
}

/**
 * Loads the tenants, accounts, listings and bookings in one transaction.
 * Idempotent: every insert skips rows that already exist (same slug, e-mail,
 * membership or id), so a repeated run inserts nothing and never overwrites
 * or deletes data, e.g. a host's edits.
 */
export async function seed(
  prisma: PrismaClient,
  input: SeedInput,
): Promise<SeedCounts> {
  // Both checks throw before anything is written.
  assertGuestsFit(input.listings, input.bookings);
  const listings = input.listings.map((listing) => ({
    listing,
    tenantSlug: tenantSlugForCountry(listing.country),
  }));
  // Hashed like every password the API stores; a salt per account, so equal
  // passwords still get different hashes.
  const passwords = new BcryptPasswordHasher();
  const users = await Promise.all(
    SEED_USERS.map(async ({ email, name, isSuperadmin }) => ({
      email,
      name,
      isSuperadmin,
      passwordHash: await passwords.hash(input.password),
    })),
  );

  return prisma.$transaction(
    async (tx) => {
      const insertedTenants = await tx.tenant.createMany({
        data: SEED_TENANTS.map(({ slug, name, contactEmail }) => ({
          slug,
          name,
          contactEmail,
        })),
        skipDuplicates: true,
      });
      const tenantIds = new Map(
        (
          await tx.tenant.findMany({
            where: { slug: { in: SEED_TENANTS.map((t) => t.slug) } },
            select: { id: true, slug: true },
          })
        ).map((tenant) => [tenant.slug, tenant.id]),
      );

      const insertedUsers = await tx.user.createMany({
        data: users,
        skipDuplicates: true,
      });
      const userIds = new Map(
        (
          await tx.user.findMany({
            where: { email: { in: SEED_USERS.map((u) => u.email) } },
            select: { id: true, email: true },
          })
        ).map((user) => [user.email, user.id]),
      );

      const insertedMemberships = await tx.tenantMembership.createMany({
        data: SEED_USERS.flatMap((user) =>
          user.hostOf.map((slug) => ({
            userId: idOf(userIds, user.email),
            tenantId: idOf(tenantIds, slug),
          })),
        ),
        skipDuplicates: true,
      });

      let insertedListings = 0;
      for (const batch of batches(
        listings.map(({ listing, tenantSlug }) => ({
          ...listing,
          tenantId: idOf(tenantIds, tenantSlug),
          createdAt: parseIsoDate(listing.createdAt),
        })),
      )) {
        insertedListings += (
          await tx.listing.createMany({ data: batch, skipDuplicates: true })
        ).count;
      }

      let insertedBookings = 0;
      for (const batch of batches(
        input.bookings.map((booking) => ({
          ...booking,
          checkIn: parseIsoDate(booking.checkIn),
          checkOut: parseIsoDate(booking.checkOut),
        })),
      )) {
        insertedBookings += (
          await tx.booking.createMany({ data: batch, skipDuplicates: true })
        ).count;
        // `skipDuplicates` (ON CONFLICT DO NOTHING) also skips a stay that
        // overlaps an active one (bookings_no_overlap_excl). A booking whose id
        // already exists is still found here, so a repeated run passes; an
        // overlapping one is not, and the whole seed rolls back.
        const stored = await tx.booking.count({
          where: { id: { in: batch.map((booking) => booking.id) } },
        });
        if (stored !== batch.length) {
          throw new Error(
            `${batch.length - stored} bookings overlap an active stay on the same listing`,
          );
        }
      }

      return {
        tenants: insertedTenants.count,
        users: insertedUsers.count,
        memberships: insertedMemberships.count,
        listings: insertedListings,
        bookings: insertedBookings,
      };
    },
    { timeout: TRANSACTION_TIMEOUT_MS },
  );
}
