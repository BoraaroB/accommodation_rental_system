import {
  listingDtoSchema,
  listingPageSchema,
  tenantSlugSchema,
  type ListingDto,
  type ListingQuery,
  type Page,
} from '@ars/shared';
import { z } from 'zod';
import { baseApi } from '../../api/baseApi';
import { listingArgsSchema } from '../../api/listingArgs';

export interface ListingsArgs {
  tenantSlug: string;
  query: ListingQuery;
}

export interface ListingArgs {
  tenantSlug: string;
  id: string;
}

/** The public portal's listings (`/tenants/:tenantSlug/...`). */
export const listingsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /** The tenant's cities, the options of the city filter. */
    getCities: build.query<string[], string>({
      query: (tenantSlug) => `/tenants/${tenantSlug}/cities`,
      argSchema: tenantSlugSchema,
      responseSchema: z.array(z.string()),
    }),
    /** One page of listings; the query is the URL's filters (D-017). */
    getListings: build.query<Page<ListingDto>, ListingsArgs>({
      query: ({ tenantSlug, query }) => ({
        url: `/tenants/${tenantSlug}/listings`,
        // `undefined` values are left out of the query string.
        params: query,
      }),
      // No `argSchema`: the query is already the output of `listingQuerySchema`
      // (`useListingFilters`), and RTK Query needs a schema whose input type is
      // its output type, which a coercing schema is not.
      responseSchema: listingPageSchema,
      providesTags: [{ type: 'Listing', id: 'LIST' }],
    }),
    getListing: build.query<ListingDto, ListingArgs>({
      query: ({ tenantSlug, id }) => `/tenants/${tenantSlug}/listings/${id}`,
      argSchema: listingArgsSchema,
      responseSchema: listingDtoSchema,
      providesTags: (_result, _error, { id }) => [{ type: 'Listing', id }],
    }),
  }),
});

export const { useGetCitiesQuery, useGetListingsQuery, useGetListingQuery } =
  listingsApi;
