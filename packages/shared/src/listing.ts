import { z } from 'zod';
import type { ListingDto } from './contracts.js';
import { isoDateSchema } from './date.js';
import { pageSchema } from './pagination.js';

/** The only currency in the data (display only; there are no exchange rates). */
export const currencySchema = z.literal('EUR');

export const propertyTypeSchema = z.enum([
  'apartment',
  'studio',
  'house',
  'loft',
  'room',
]);

/** The largest value of a listing's integer columns (Postgres `integer`). */
export const MAX_LISTING_INT = 2_147_483_647;

/**
 * A listing's text (title, city) as a request sends it: trimmed, not blank,
 * without control characters — Postgres text cannot hold a NUL byte, and no
 * title or city has a control character.
 */
export const listingTextSchema = z
  .string()
  .trim()
  .min(1)
  .regex(/^\P{Cc}*$/u, 'Must not contain control characters');

/** A listing's id, also the `:id` of listing routes: a uuid (the data uses v4). */
export const listingIdSchema = z.uuid();

/**
 * A listing (`ListingDto`) with the value rules `contracts.ts` states for
 * single fields. Rules across fields (0 bedrooms for a studio, no reviews
 * without a rating) are enforced by the database.
 */
export const listingDtoSchema = z.object({
  id: listingIdSchema,
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

/** A page of the portal's listing list. */
export const listingPageSchema = pageSchema(listingDtoSchema);

/**
 * When a listing is taken within `[from, to)`: the days an active booking or a
 * blocked day occupies, sorted. The portal does not say which of the two it is.
 */
export const listingAvailabilitySchema = z.object({
  from: isoDateSchema,
  to: isoDateSchema,
  unavailableDays: z.array(isoDateSchema),
});

export type ListingAvailability = z.infer<typeof listingAvailabilitySchema>;

/**
 * A host's listing edit: the editor always sends every editable field, so the
 * studio rule sees both the type and the bedrooms. Integer fields stop at the
 * column's range. Lowering `maxGuests` below a booking is checked by the API
 * (D-014).
 */
export const listingUpdateSchema = z
  .object({
    // Possible improvement (not in the plan): a maximum title length.
    title: listingTextSchema,
    propertyType: propertyTypeSchema,
    pricePerNightCents: z.number().int().min(0).max(MAX_LISTING_INT),
    maxGuests: listingDtoSchema.shape.maxGuests,
    bedrooms: z.number().int().min(0).max(MAX_LISTING_INT),
  })
  .refine(
    ({ propertyType, bedrooms }) => propertyType !== 'studio' || bedrooms === 0,
    { message: 'A studio has 0 bedrooms', path: ['bedrooms'] },
  );

export type ListingUpdateInput = z.infer<typeof listingUpdateSchema>;
