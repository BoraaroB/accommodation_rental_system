import {
  blockDaysSchema,
  dateRangeSchema,
  hostBookingPageSchema,
  listingBlockedDaysSchema,
  listingDtoSchema,
  listingPageSchema,
  listingUpdateSchema,
  upcomingDateRangeSchema,
  type DateRange,
  type HostBooking,
  type HostBookingQuery,
  type HostListingQuery,
  type ListingBlockedDays,
  type ListingDto,
  type ListingUpdateInput,
  type Page,
} from '@ars/shared';
import { baseApi } from '../../api/baseApi';
import { listingArgsSchema } from '../../api/listingArgs';

export interface HostListingsArgs {
  tenantSlug: string;
  query: HostListingQuery;
}

export interface HostListingArgs {
  tenantSlug: string;
  id: string;
}

export interface ListingUpdateArgs extends HostListingArgs {
  changes: ListingUpdateInput;
}

export interface BlockedDaysArgs extends HostListingArgs {
  range: DateRange;
}

export interface HostBookingsArgs {
  tenantSlug: string;
  query: HostBookingQuery;
}

/**
 * The host panel (`/tenants/:tenantSlug/host/...`): the tenant's listings and
 * their edit, a listing's blocked days, the tenant's bookings. The queries
 * (no `argSchema`) are already the output of the coercing host query schemas,
 * like the portal's list. A mutation that failed changed nothing, so it makes
 * nothing stale.
 */
export const hostApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getHostListings: build.query<Page<ListingDto>, HostListingsArgs>({
      query: ({ tenantSlug, query }) => ({
        url: `/tenants/${tenantSlug}/host/listings`,
        params: query,
      }),
      responseSchema: listingPageSchema,
      providesTags: [{ type: 'Listing', id: 'LIST' }],
    }),
    getHostListing: build.query<ListingDto, HostListingArgs>({
      query: ({ tenantSlug, id }) =>
        `/tenants/${tenantSlug}/host/listings/${id}`,
      argSchema: listingArgsSchema,
      responseSchema: listingDtoSchema,
      providesTags: (_result, _error, { id }) => [{ type: 'Listing', id }],
    }),
    /** The editor's save: every editable field (D-014). */
    updateListing: build.mutation<ListingDto, ListingUpdateArgs>({
      query: ({ tenantSlug, id, changes }) => ({
        url: `/tenants/${tenantSlug}/host/listings/${id}`,
        method: 'PATCH',
        body: changes,
      }),
      argSchema: listingArgsSchema.extend({ changes: listingUpdateSchema }),
      responseSchema: listingDtoSchema,
      // The bookings show the listing's title and a total at its price (D-048).
      invalidatesTags: (_result, error, { id }) =>
        error === undefined
          ? [
              { type: 'Listing', id },
              { type: 'Listing', id: 'LIST' },
              { type: 'Booking', id: 'LIST' },
            ]
          : [],
    }),
    /** The listing's blocked days within `[from, to)`; past ranges are allowed. */
    getBlockedDays: build.query<ListingBlockedDays, BlockedDaysArgs>({
      query: ({ tenantSlug, id, range }) => ({
        url: `/tenants/${tenantSlug}/host/listings/${id}/blocked-days`,
        params: range,
      }),
      argSchema: listingArgsSchema.extend({ range: dateRangeSchema }),
      responseSchema: listingBlockedDaysSchema,
      providesTags: (_result, _error, { id }) => [{ type: 'Availability', id }],
    }),
    /** Blocks `[from, to)`; 409 `DAY_ALREADY_BOOKED` when a booking takes a day of it. */
    blockDays: build.mutation<ListingBlockedDays, BlockedDaysArgs>({
      query: ({ tenantSlug, id, range }) => ({
        url: `/tenants/${tenantSlug}/host/listings/${id}/blocked-days`,
        method: 'POST',
        body: range,
      }),
      argSchema: listingArgsSchema.extend({ range: blockDaysSchema }),
      responseSchema: listingBlockedDaysSchema,
      // Blocked days also decide the portal's search by dates.
      // Possible improvement (not in the plan): write the answer into the
      // blocked days' cache (`updateQueryData`) instead of refetching it, so a
      // day just blocked cannot show as booked while the availability arrives
      // first.
      invalidatesTags: (_result, error, { id }) =>
        error === undefined
          ? [
              { type: 'Availability', id },
              { type: 'Listing', id: 'LIST' },
            ]
          : [],
    }),
    /** Unblocks `[from, to)`; the API answers 204. */
    unblockDays: build.mutation<void, BlockedDaysArgs>({
      query: ({ tenantSlug, id, range }) => ({
        url: `/tenants/${tenantSlug}/host/listings/${id}/blocked-days`,
        method: 'DELETE',
        params: range,
      }),
      argSchema: listingArgsSchema.extend({ range: upcomingDateRangeSchema }),
      invalidatesTags: (_result, error, { id }) =>
        error === undefined
          ? [
              { type: 'Availability', id },
              { type: 'Listing', id: 'LIST' },
            ]
          : [],
    }),
    getHostBookings: build.query<Page<HostBooking>, HostBookingsArgs>({
      query: ({ tenantSlug, query }) => ({
        url: `/tenants/${tenantSlug}/host/bookings`,
        params: query,
      }),
      responseSchema: hostBookingPageSchema,
      providesTags: [{ type: 'Booking', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetHostListingsQuery,
  useGetHostListingQuery,
  useUpdateListingMutation,
  useGetBlockedDaysQuery,
  useBlockDaysMutation,
  useUnblockDaysMutation,
  useGetHostBookingsQuery,
} = hostApi;
