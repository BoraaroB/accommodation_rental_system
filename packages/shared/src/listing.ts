import { z } from 'zod';
import type { ListingDto } from './contracts.js';
import { isoDateSchema } from './date.js';

/** The only currency in the data (display only; there are no exchange rates). */
export const currencySchema = z.literal('EUR');

export const propertyTypeSchema = z.enum([
  'apartment',
  'studio',
  'house',
  'loft',
  'room',
]);

/**
 * A listing (`ListingDto`) with the value rules `contracts.ts` states for
 * single fields. Rules across fields (0 bedrooms for a studio, no reviews
 * without a rating) are enforced by the database.
 */
export const listingDtoSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1),
  city: z.string().min(1),
  /** ISO 3166-1 alpha-2. */
  country: z.string().regex(/^[A-Z]{2}$/),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  propertyType: propertyTypeSchema,
  maxGuests: z.number().int().min(1).max(12),
  bedrooms: z.number().int().min(0),
  /** Integer cents, never a float. */
  pricePerNightCents: z.number().int().min(0),
  currency: currencySchema,
  /** 5-point scale, one decimal; `null` until the listing is reviewed. */
  rating: z.number().min(0).max(5).multipleOf(0.1).nullable(),
  reviewCount: z.number().int().min(0),
  createdAt: isoDateSchema,
}) satisfies z.ZodType<ListingDto>;
