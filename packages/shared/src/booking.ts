import { z } from 'zod';
import type { BookingDto } from './contracts.js';
import { isoDateSchema } from './date.js';

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
