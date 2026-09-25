import { z } from 'zod';
import type { IsoDate } from './contracts.js';
import { isoDateSchema, today } from './date.js';
import { paginationQuerySchema } from './pagination.js';
import { emptyAsUnset } from './query-param.js';

export const listingSortSchema = z.enum([
  'newest',
  'price_asc',
  'price_desc',
  'rating_desc',
]);

/** The largest price the database stores: the column is a 32-bit integer. */
const MAX_CENTS = 2_147_483_647;

const centsSchema = emptyAsUnset(
  z.coerce.number().int().min(0).max(MAX_CENTS).optional(),
);

/** Adds the issues of a stay-like range `[from, to)`: `to` after `from`, `from` not in the past. */
function checkDateRange(
  { from, to }: { from: IsoDate; to: IsoDate },
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
  if (from < today()) {
    ctx.addIssue({
      code: 'custom',
      message: 'Must not be in the past',
      path: ['from'],
    });
  }
}

/**
 * The portal's listing filters, sort and page: the URL search parameters of
 * the web app and the query of `GET /t/:tenantSlug/listings` (D-017).
 * `from` (arrival, inclusive) and `to` (departure, exclusive) come together.
 */
export const listingQuerySchema = paginationQuerySchema
  .extend({
    city: z
      .string()
      .trim()
      .min(1)
      // Postgres text cannot hold a NUL byte; no city has a control character.
      .regex(/^\P{Cc}*$/u, 'Must not contain control characters')
      .optional(),
    guests: emptyAsUnset(z.coerce.number().int().min(1).max(12).optional()),
    minPriceCents: centsSchema,
    maxPriceCents: centsSchema,
    from: isoDateSchema.optional(),
    to: isoDateSchema.optional(),
    sort: listingSortSchema.default('newest'),
  })
  .superRefine((query, ctx) => {
    const { from, to, minPriceCents, maxPriceCents } = query;
    if (from !== undefined && to !== undefined) {
      checkDateRange({ from, to }, ctx);
    } else if (from !== undefined || to !== undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'from and to go together',
        path: [from === undefined ? 'from' : 'to'],
      });
    }
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

/** The range of `GET /t/:tenantSlug/listings/:id/availability`: `[from, to)`, from today on. */
export const availabilityQuerySchema = z
  .object({ from: isoDateSchema, to: isoDateSchema })
  .superRefine(checkDateRange);

export type ListingSort = z.infer<typeof listingSortSchema>;
export type ListingQuery = z.infer<typeof listingQuerySchema>;
export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;
