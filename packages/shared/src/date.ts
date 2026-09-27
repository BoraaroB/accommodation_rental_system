import { z } from 'zod';
import type { IsoDate } from './contracts.js';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 86_400_000;
/** Postgres counts years from 1 AD; there is no year 0. */
const FIRST_ISO_DATE = '0001-01-01';

/**
 * Today's calendar date in UTC.
 *
 * `now` is injectable so callers and tests control the clock instead of
 * depending on the machine's time zone or the day the tests run.
 */
export function today(now: Date = new Date()): IsoDate {
  return toIsoDate(now);
}

/** Moves an ISO date by a whole number of days; negative values move backwards. */
export function addDays(date: IsoDate, days: number): IsoDate {
  if (!Number.isInteger(days)) {
    throw new RangeError(`days must be an integer, got ${days}`);
  }
  const shifted = parseIsoDate(date);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return toIsoDate(shifted);
}

/**
 * Moves an ISO date by a whole number of months; the day is kept, or clamped
 * to the last day of a shorter month (2027-01-31 + 1 month is 2027-02-28).
 */
export function addMonths(date: IsoDate, months: number): IsoDate {
  if (!Number.isInteger(months)) {
    throw new RangeError(`months must be an integer, got ${months}`);
  }
  const parsed = parseIsoDate(date);
  const year = parsed.getUTCFullYear();
  const month = parsed.getUTCMonth() + months;
  // setUTCFullYear, unlike Date.UTC, does not turn years 0–99 into 1900–1999.
  const shifted = new Date(0);
  // Day 0 of the next month is the last day of this one.
  shifted.setUTCFullYear(year, month + 1, 0);
  const day = Math.min(parsed.getUTCDate(), shifted.getUTCDate());
  shifted.setUTCFullYear(year, month, day);
  return toIsoDate(shifted);
}

/** The first day of the date's month. */
export function startOfMonth(date: IsoDate): IsoDate {
  return `${parseIsoDate(date).toISOString().slice(0, 7)}-01`;
}

/** Whole days from `from` to `to` (negative when `to` is earlier): the nights of a stay. */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  // Both are UTC midnights, so the difference is an exact number of days.
  return (
    (parseIsoDate(to).getTime() - parseIsoDate(from).getTime()) / MS_PER_DAY
  );
}

/** Every day of `[from, to)`, in order; empty when `to` is not after `from`. */
export function eachDay(from: IsoDate, to: IsoDate): IsoDate[] {
  const days: IsoDate[] = [];
  // `YYYY-MM-DD` strings compare in calendar order.
  for (let day = from; day < to; day = addDays(day, 1)) {
    days.push(day);
  }
  return days;
}

/** Whether the value is a calendar date that exists, in `YYYY-MM-DD` form. */
export function isIsoDate(value: string): boolean {
  try {
    parseIsoDate(value);
    return true;
  } catch {
    return false;
  }
}

/** An `IsoDate`: a calendar date that exists, in `YYYY-MM-DD` form. */
export const isoDateSchema = z.string().refine(isIsoDate, {
  message: 'Expected an existing date in YYYY-MM-DD form',
});

/**
 * The UTC midnight of an ISO date — how a `date` column is written through
 * Prisma. Rejects anything that is not an existing `YYYY-MM-DD` date, and the
 * year 0000, which a Postgres `date` does not have.
 */
export function parseIsoDate(value: string): Date {
  if (ISO_DATE_PATTERN.test(value) && value >= FIRST_ISO_DATE) {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    // The round trip rejects dates that do not exist, such as 2026-02-30.
    if (!Number.isNaN(parsed.getTime()) && toIsoDate(parsed) === value) {
      return parsed;
    }
  }
  throw new RangeError(`Invalid ISO date: "${value}"`);
}

/**
 * The UTC calendar date of a `Date` — how a `date` column read through Prisma
 * becomes an `IsoDate`.
 */
export function toIsoDate(date: Date): IsoDate {
  if (Number.isNaN(date.getTime())) {
    throw new RangeError('Invalid Date');
  }
  const isoDate = date.toISOString().slice(0, 10);
  // Years outside 0000–9999 have no YYYY-MM-DD form (toISOString gives "+010000-…").
  if (!ISO_DATE_PATTERN.test(isoDate)) {
    throw new RangeError(
      `Date outside the YYYY-MM-DD range: ${date.toISOString()}`,
    );
  }
  return isoDate;
}
