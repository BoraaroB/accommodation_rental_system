import { parseIsoDate, type ListingSort } from '@ars/shared';
import type { Prisma } from '../generated/prisma/client.js';
import type { DateRange, ListingFilters } from './listings.repository.js';

/**
 * Bookings that take a day of `[from, to)`: not cancelled, and
 * `checkIn < to AND checkOut > from`, so a stay that ends on `from` does not
 * count (D-009).
 */
export function activeStaysOverlapping({
  from,
  to,
}: DateRange): Prisma.BookingWhereInput {
  return {
    status: { not: 'cancelled' },
    checkIn: { lt: parseIsoDate(to) },
    checkOut: { gt: parseIsoDate(from) },
  };
}

/** Blocked days within `[from, to)`. */
export function blockedDaysWithin({
  from,
  to,
}: DateRange): Prisma.BlockedDayWhereInput {
  return { day: { gte: parseIsoDate(from), lt: parseIsoDate(to) } };
}

/** The `where` of the portal's listing list: always the tenant, then each filter given. */
export function buildListingWhere(
  tenantId: string,
  filters: ListingFilters,
): Prisma.ListingWhereInput {
  const { city, guests, minPriceCents, maxPriceCents, from, to } = filters;
  const where: Prisma.ListingWhereInput = { tenantId };
  if (city !== undefined) {
    where.city = city;
  }
  if (guests !== undefined) {
    where.maxGuests = { gte: guests };
  }
  if (minPriceCents !== undefined || maxPriceCents !== undefined) {
    where.pricePerNightCents = {
      ...(minPriceCents !== undefined && { gte: minPriceCents }),
      ...(maxPriceCents !== undefined && { lte: maxPriceCents }),
    };
  }
  if (from !== undefined && to !== undefined) {
    // Free for the whole stay: no active booking and no blocked day in it.
    where.bookings = { none: activeStaysOverlapping({ from, to }) };
    where.blockedDays = { none: blockedDaysWithin({ from, to }) };
  }
  return where;
}

const SORT_ORDER: Readonly<
  Record<ListingSort, Prisma.ListingOrderByWithRelationInput>
> = {
  newest: { createdAt: 'desc' },
  price_asc: { pricePerNightCents: 'asc' },
  price_desc: { pricePerNightCents: 'desc' },
  // Postgres puts nulls first in descending order; unreviewed listings go last (D-023).
  rating_desc: { rating: { sort: 'desc', nulls: 'last' } },
};

/** The `orderBy` of a sort. `id` breaks ties, so a listing never moves between pages. */
export function buildListingOrderBy(
  sort: ListingSort,
): Prisma.ListingOrderByWithRelationInput[] {
  return [SORT_ORDER[sort], { id: 'asc' }];
}
