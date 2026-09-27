import { listingQuerySchema, type ListingQuery } from '@ars/shared';
import type { z } from 'zod';

/** The values of a filter form, validated by `listingQuerySchema` as the API does. */
export type ListingFiltersForm = z.input<typeof listingQuerySchema>;

/**
 * The URL parameters of the portal's list, in the order they are written.
 * `pageSize` is not one of them: the portal always shows the default page.
 */
const URL_KEYS = [
  'city',
  'guests',
  'minPriceCents',
  'maxPriceCents',
  'from',
  'to',
  'sort',
  'page',
] as const satisfies readonly (keyof ListingQuery)[];

/** What the schema fills in when the URL has nothing: page 1, the default sort and page size. */
const DEFAULTS = listingQuerySchema.parse({});

/**
 * The list's filters from the URL (D-017), parsed with the API's
 * `listingQuerySchema`. A parameter that fails its own rule drops only
 * itself; then a failing rule across fields drops what it names — both
 * dates for a bad range, the maximum when it is below the minimum.
 */
export function parseListingFilters(params: URLSearchParams): ListingQuery {
  const values: Partial<Record<(typeof URL_KEYS)[number], string>> = {};
  for (const key of URL_KEYS) {
    const raw = params.get(key);
    if (raw !== null && listingQuerySchema.shape[key].safeParse(raw).success) {
      values[key] = raw;
    }
  }

  const result = listingQuerySchema.safeParse(values);
  if (result.success) {
    return result.data;
  }
  for (const issue of result.error.issues) {
    const [key] = issue.path;
    if (key === 'from' || key === 'to') {
      delete values.from;
      delete values.to;
    } else if (key === 'maxPriceCents') {
      delete values.maxPriceCents;
    }
  }
  return listingQuerySchema.parse(values);
}

/** The URL parameters of `filters`, without empty and default values. */
export function toSearchParams(
  filters: Partial<ListingQuery>,
): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of URL_KEYS) {
    const value = filters[key];
    if (value !== undefined && value !== '' && value !== DEFAULTS[key]) {
      params.set(key, String(value));
    }
  }
  return params;
}
