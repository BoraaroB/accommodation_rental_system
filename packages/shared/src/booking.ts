import { z } from 'zod';
import type { BookingDto } from './contracts.js';
import { isoDateSchema } from './date.js';
import { listingDtoSchema } from './listing.js';
import { pageSchema } from './pagination.js';

/** `cancelled` blocks nothing; `confirmed` and `completed` both occupy their days. */
export const bookingStatusSchema = z.enum([
  'confirmed',
  'completed',
  'cancelled',
]);

/**
 * A booking (`BookingDto`), a stay of [checkIn, checkOut), with the value
 * rules `contracts.ts` states for single fields. `checkOut > checkIn` and the
 * no-overlap rule are enforced by the database; `guests ≤ maxGuests` needs the
 * listing and is checked where one is written.
 */
export const bookingDtoSchema = z.object({
  id: z.uuid(),
  listingId: z.uuid(),
  checkIn: isoDateSchema,
  checkOut: isoDateSchema,
  /** 1 .. the listing's `maxGuests`, which is at most 12. */
  guests: z.number().int().min(1).max(12),
  status: bookingStatusSchema,
}) satisfies z.ZodType<BookingDto>;

/**
 * A booking in the host panel's table: the booking plus its listing's title
 * and the stay's total. The total is stored on the booking when it is made
 * (D-074), so a later change of the listing's price does not change it.
 */
export const hostBookingSchema = bookingDtoSchema.extend({
  listingTitle: listingDtoSchema.shape.title,
  totalCents: z.number().int().min(0),
});

/** A page of the host panel's booking table. */
export const hostBookingPageSchema = pageSchema(hostBookingSchema);

export type HostBooking = z.infer<typeof hostBookingSchema>;
