import { addDays, type IsoDate } from '@ars/shared';
import type { DateRange, ListingOccupancy } from './listings.repository.js';

/**
 * The days of `[from, to)` on which a listing is taken, sorted: every night of
 * an active stay (`checkIn ≤ day < checkOut`, so the checkout day is free) and
 * every blocked day, clipped to the range.
 */
export function unavailableDays(
  { from, to }: DateRange,
  { stays, blockedDays }: ListingOccupancy,
): IsoDate[] {
  const days = new Set<IsoDate>();
  // `YYYY-MM-DD` strings compare in calendar order.
  for (const { checkIn, checkOut } of stays) {
    const first = checkIn > from ? checkIn : from;
    const end = checkOut < to ? checkOut : to;
    for (let day = first; day < end; day = addDays(day, 1)) {
      days.add(day);
    }
  }
  for (const day of blockedDays) {
    if (day >= from && day < to) {
      days.add(day);
    }
  }
  return [...days].toSorted();
}
