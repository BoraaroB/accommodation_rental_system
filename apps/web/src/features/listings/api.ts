import {
  availabilityQuerySchema,
  listingAvailabilitySchema,
  listingDtoSchema,
  listingIdSchema,
  listingPageSchema,
  tenantSlugSchema,
  type DateRange,
  type ListingAvailability,
  type ListingDto,
  type ListingQuery,
  type Page,
} from '@ars/shared';
import { z } from 'zod';
import { baseApi } from '../../api/baseApi';

export interface ListingsArgs {
  tenantSlug: string;
  query: ListingQuery;
}

export interface ListingArgs {
  tenantSlug: string;
  id: string;
}

export interface AvailabilityArgs extends ListingArgs {
  range: DateRange;
}

const listingArgsSchema = z.object({
  tenantSlug: tenantSlugSchema,
  id: listingIdSchema,
});

/** The public portal's listings (`/t/:tenantSlug/...`). */
export const listingsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /** The tenant's cities, the options of the city filter. */
    getCities: build.query<string[], string>({
      query: (tenantSlug) => `/t/${tenantSlug}/cities`,
      argSchema: tenantSlugSchema,
      responseSchema: z.array(z.string()),
    }),
    /** One page of listings; the query is the URL's filters (D-017). */
    getListings: build.query<Page<ListingDto>, ListingsArgs>({
      query: ({ tenantSlug, query }) => ({
        url: `/t/${tenantSlug}/listings`,
        // `undefined` values are left out of the query string.
        params: query,
      }),
      // No `argSchema`: the query is already the output of `listingQuerySchema`
      // (`useListingFilters`), and RTK Query needs a schema whose input type is
      // its output type, which a coercing schema is not.
      responseSchema: listingPageSchema,
    }),
    getListing: build.query<ListingDto, ListingArgs>({
      query: ({ tenantSlug, id }) => `/t/${tenantSlug}/listings/${id}`,
      argSchema: listingArgsSchema,
      responseSchema: listingDtoSchema,
    }),
    /** The days of `[from, to)` on which the listing is taken (D-046). */
    getAvailability: build.query<ListingAvailability, AvailabilityArgs>({
      query: ({ tenantSlug, id, range }) => ({
        url: `/t/${tenantSlug}/listings/${id}/availability`,
        params: range,
      }),
      argSchema: listingArgsSchema.extend({ range: availabilityQuerySchema }),
      responseSchema: listingAvailabilitySchema,
    }),
  }),
});

export const {
  useGetCitiesQuery,
  useGetListingsQuery,
  useGetListingQuery,
  useGetAvailabilityQuery,
} = listingsApi;
