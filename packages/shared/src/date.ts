import { z } from 'zod';
import type { IsoDate } from './contracts.js';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

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
 * Prisma. Rejects anything that is not an existing `YYYY-MM-DD` date.
 */
export function parseIsoDate(value: string): Date {
  if (ISO_DATE_PATTERN.test(value)) {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    // The round trip rejects dates that do not exist, such as 2026-02-30.
    if (!Number.isNaN(parsed.getTime()) && toIsoDate(parsed) === value) {
      return parsed;
    }
  }
  throw new RangeError(`Invalid ISO date: "${value}"`);
}

function toIsoDate(date: Date): IsoDate {
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
