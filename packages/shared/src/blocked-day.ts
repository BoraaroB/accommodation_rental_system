import { z } from 'zod';
import { checkUpcomingRange } from './date-range.js';
import { daysBetween, isIsoDate, isoDateSchema } from './date.js';

/** The longest range one blocking request may cover. */
export const MAX_BLOCKED_RANGE_DAYS = 366;

/**
 * Days a host blocks: `[from, to)` from today on, at most
 * `MAX_BLOCKED_RANGE_DAYS` long, so one request writes a bounded number of
 * rows. A click in the calendar is a one-day range.
 */
export const blockDaysSchema = z
  .object({ from: isoDateSchema, to: isoDateSchema })
  .superRefine((range, ctx) => {
    checkUpcomingRange(range, ctx);
    // zod runs this even when a date failed its own check; only valid dates
    // can be counted.
    if (
      isIsoDate(range.from) &&
      isIsoDate(range.to) &&
      daysBetween(range.from, range.to) > MAX_BLOCKED_RANGE_DAYS
    ) {
      ctx.addIssue({
        code: 'custom',
        message: `Must be at most ${MAX_BLOCKED_RANGE_DAYS} days after from`,
        path: ['to'],
      });
    }
  });

/** A listing's blocked days within `[from, to)`, sorted. */
export const listingBlockedDaysSchema = z.object({
  from: isoDateSchema,
  to: isoDateSchema,
  days: z.array(isoDateSchema),
});

export type BlockDaysInput = z.infer<typeof blockDaysSchema>;
export type ListingBlockedDays = z.infer<typeof listingBlockedDaysSchema>;
