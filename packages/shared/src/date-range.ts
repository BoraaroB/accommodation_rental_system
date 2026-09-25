import { z } from 'zod';
import type { IsoDate } from './contracts.js';
import { isoDateSchema, today } from './date.js';

/** Days `[from, to)`: `from` is included and `to` is not, like a stay. */
export interface DateRange {
  from: IsoDate;
  to: IsoDate;
}

/** Adds an issue on `to` unless it is after `from`. */
export function checkRangeOrder(
  { from, to }: DateRange,
  ctx: z.RefinementCtx,
): void {
  // `YYYY-MM-DD` strings compare in calendar order.
  if (to <= from) {
    ctx.addIssue({
      code: 'custom',
      message: 'Must be after from',
      path: ['to'],
    });
  }
}

/** Adds the issues of a range from today on: `to` after `from`, `from` not in the past. */
export function checkUpcomingRange(
  range: DateRange,
  ctx: z.RefinementCtx,
): void {
  checkRangeOrder(range, ctx);
  if (range.from < today()) {
    ctx.addIssue({
      code: 'custom',
      message: 'Must not be in the past',
      path: ['from'],
    });
  }
}

/** Adds the issues of an optional range: `from` and `to` come together, then `check` runs on both. */
export function checkOptionalRange(
  { from, to }: Partial<DateRange>,
  ctx: z.RefinementCtx,
  check: (range: DateRange, ctx: z.RefinementCtx) => void,
): void {
  if (from !== undefined && to !== undefined) {
    check({ from, to }, ctx);
  } else if (from !== undefined || to !== undefined) {
    ctx.addIssue({
      code: 'custom',
      message: 'from and to go together',
      path: [from === undefined ? 'from' : 'to'],
    });
  }
}

const dateRangeShape = { from: isoDateSchema, to: isoDateSchema };

/** A range `[from, to)` with `to` after `from`; past dates are allowed. */
export const dateRangeSchema = z
  .object(dateRangeShape)
  .superRefine(checkRangeOrder);

/** A range `[from, to)` from today on. */
export const upcomingDateRangeSchema = z
  .object(dateRangeShape)
  .superRefine(checkUpcomingRange);
