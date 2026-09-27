import {
  hostBookingQuerySchema,
  hostListingQuerySchema,
  type HostBookingQuery,
  type HostListingQuery,
} from '@ars/shared';
import type { z } from 'zod';

/**
 * The URL parameters of the host tables (D-017, D-068), in the order they are
 * written. `pageSize` is not one of them: the tables show the default page.
 */
const LISTING_KEYS = [
  'q',
  'page',
] as const satisfies readonly (keyof HostListingQuery)[];
const BOOKING_KEYS = [
  'listingId',
  'status',
  'from',
  'to',
  'page',
] as const satisfies readonly (keyof HostBookingQuery)[];

const LISTING_DEFAULTS = hostListingQuerySchema.parse({});
const BOOKING_DEFAULTS = hostBookingQuerySchema.parse({});

/** The parameters of `keys` that pass their own rule; a bad one drops only itself. */
function validValues<K extends string>(
  shape: Record<K, z.ZodType>,
  keys: readonly K[],
  params: URLSearchParams,
): Partial<Record<K, string>> {
  const values: Partial<Record<K, string>> = {};
  for (const key of keys) {
    const raw = params.get(key);
    if (raw !== null && shape[key].safeParse(raw).success) {
      values[key] = raw;
    }
  }
  return values;
}

/** The URL parameters of `filters`: `keys` only, without empty and default values. */
function toParams<K extends string>(
  keys: readonly K[],
  filters: Partial<Record<K, unknown>>,
  defaults: Partial<Record<K, unknown>>,
): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of keys) {
    const value = filters[key];
    if (value !== undefined && value !== '' && value !== defaults[key]) {
      params.set(key, String(value));
    }
  }
  return params;
}

/** The listing table's search and page from the URL, parsed with the API's schema. */
export function parseHostListingFilters(
  params: URLSearchParams,
): HostListingQuery {
  return hostListingQuerySchema.parse(
    validValues(hostListingQuerySchema.shape, LISTING_KEYS, params),
  );
}

export function hostListingSearchParams(
  filters: Partial<HostListingQuery>,
): URLSearchParams {
  return toParams(LISTING_KEYS, filters, LISTING_DEFAULTS);
}

/**
 * The booking table's filters and page from the URL, parsed with the API's
 * schema; a date range that fails its rule (one date only, `to` not after
 * `from`) drops both dates.
 */
export function parseHostBookingFilters(
  params: URLSearchParams,
): HostBookingQuery {
  const values = validValues(
    hostBookingQuerySchema.shape,
    BOOKING_KEYS,
    params,
  );
  const result = hostBookingQuerySchema.safeParse(values);
  if (result.success) {
    return result.data;
  }
  delete values.from;
  delete values.to;
  return hostBookingQuerySchema.parse(values);
}

export function hostBookingSearchParams(
  filters: Partial<HostBookingQuery>,
): URLSearchParams {
  return toParams(BOOKING_KEYS, filters, BOOKING_DEFAULTS);
}

/** Whether the booking table is filtered at all (the page does not count). */
export function hasBookingFilters({
  listingId,
  status,
  from,
  to,
}: HostBookingQuery): boolean {
  return [listingId, status, from, to].some((value) => value !== undefined);
}
