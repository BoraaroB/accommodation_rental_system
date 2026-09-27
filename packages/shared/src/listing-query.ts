import { z } from 'zod';
import {
  checkOptionalRange,
  checkUpcomingRange,
  upcomingDateRangeSchema,
} from './date-range.js';
import { isoDateSchema } from './date.js';
import { MAX_LISTING_INT } from './listing.js';
import { paginationQuerySchema } from './pagination.js';
import { blankAsUnset, emptyAsUnset } from './query-param.js';
import { plainTextSchema } from './text.js';

export const listingSortSchema = z.enum([
  'newest',
  'price_asc',
  'price_desc',
  'rating_desc',
]);

const centsSchema = emptyAsUnset(
  z.coerce.number().int().min(0).max(MAX_LISTING_INT).optional(),
);

/**
 * The portal's listing filters, sort and page: the URL search parameters of
 * the web app and the query of `GET /tenants/:tenantSlug/listings` (D-017).
 * `from` (arrival, inclusive) and `to` (departure, exclusive) come together.
 */
export const listingQuerySchema = paginationQuerySchema
  .extend({
    city: plainTextSchema.optional(),
    guests: emptyAsUnset(z.coerce.number().int().min(1).max(12).optional()),
    minPriceCents: centsSchema,
    maxPriceCents: centsSchema,
    from: isoDateSchema.optional(),
    to: isoDateSchema.optional(),
    sort: listingSortSchema.default('newest'),
  })
  .superRefine((query, ctx) => {
    checkOptionalRange(query, ctx, checkUpcomingRange);
    const { minPriceCents, maxPriceCents } = query;
    if (
      minPriceCents !== undefined &&
      maxPriceCents !== undefined &&
      minPriceCents > maxPriceCents
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'Must not be below minPriceCents',
        path: ['maxPriceCents'],
      });
    }
  });

/** The range of `GET /tenants/:tenantSlug/listings/:id/availability`: `[from, to)`, from today on. */
export const availabilityQuerySchema = upcomingDateRangeSchema;

/**
 * The host panel's listing table: a page, optionally searched by `q`, which
 * matches the title or the city regardless of case.
 */
export const hostListingQuerySchema = paginationQuerySchema.extend({
  q: blankAsUnset(plainTextSchema.optional()),
});

export type ListingSort = z.infer<typeof listingSortSchema>;
export type ListingQuery = z.infer<typeof listingQuerySchema>;
export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;
export type HostListingQuery = z.infer<typeof hostListingQuerySchema>;
