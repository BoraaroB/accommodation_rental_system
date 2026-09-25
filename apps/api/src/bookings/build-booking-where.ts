import type { Prisma } from '../generated/prisma/client.js';
import { staysOverlapping } from '../listings/build-listing-query.js';
import type { BookingFilters } from './bookings.repository.js';

/**
 * The `where` of the host booking table: always the tenant (through the
 * listing), then each filter given. A date range keeps the stays that take a
 * day of `[from, to)` — the calendar's rule, whatever the status.
 */
export function buildBookingWhere(
  tenantId: string,
  { listingId, status, from, to }: BookingFilters,
): Prisma.BookingWhereInput {
  const where: Prisma.BookingWhereInput = { listing: { tenantId } };
  if (listingId !== undefined) {
    where.listingId = listingId;
  }
  if (status !== undefined) {
    where.status = status;
  }
  if (from !== undefined && to !== undefined) {
    Object.assign(where, staysOverlapping({ from, to }));
  }
  return where;
}
