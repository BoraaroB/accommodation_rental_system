import { z } from 'zod';
import { bookingStatusSchema } from './booking.js';
import { checkOptionalRange, checkRangeOrder } from './date-range.js';
import { isoDateSchema } from './date.js';
import { listingIdSchema } from './listing.js';
import { paginationQuerySchema } from './pagination.js';

/**
 * The host panel's booking table: a page, filtered by listing, status and a
 * range `[from, to)` that keeps the stays taking any of its days. Past dates
 * are allowed: the host sees the booking history too.
 */
export const hostBookingQuerySchema = paginationQuerySchema
  .extend({
    listingId: listingIdSchema.optional(),
    status: bookingStatusSchema.optional(),
    from: isoDateSchema.optional(),
    to: isoDateSchema.optional(),
  })
  .superRefine((query, ctx) => {
    checkOptionalRange(query, ctx, checkRangeOrder);
  });

export type HostBookingQuery = z.infer<typeof hostBookingQuerySchema>;
