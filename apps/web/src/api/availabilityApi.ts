import {
  availabilityQuerySchema,
  listingAvailabilitySchema,
  type DateRange,
  type ListingAvailability,
} from '@ars/shared';
import { baseApi } from './baseApi';
import { listingArgsSchema } from './listingArgs';

export interface AvailabilityArgs {
  tenantSlug: string;
  id: string;
  range: DateRange;
}

/**
 * A listing's public availability, read by the portal's calendar and by the
 * host's, which tells booked days from blocked ones (D-058: shared, because
 * two features use it).
 */
export const availabilityApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /** The days of `[from, to)` on which the listing is taken (D-046). */
    getAvailability: build.query<ListingAvailability, AvailabilityArgs>({
      query: ({ tenantSlug, id, range }) => ({
        url: `/tenants/${tenantSlug}/listings/${id}/availability`,
        params: range,
      }),
      argSchema: listingArgsSchema.extend({ range: availabilityQuerySchema }),
      responseSchema: listingAvailabilitySchema,
      providesTags: (_result, _error, { id }) => [{ type: 'Availability', id }],
    }),
  }),
});

export const { useGetAvailabilityQuery } = availabilityApi;
