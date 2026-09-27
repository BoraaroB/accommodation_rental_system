import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { env } from '../config/env';
import { selectToken } from '../store/authSlice';
import type { RootState } from '../store/store';

/**
 * The one RTK Query API. Features add their endpoints with `injectEndpoints`.
 */
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: env.apiBaseUrl,
    // Only the identity travels with a request; the API computes the rights
    // for every request (D-007).
    prepareHeaders: (headers, { getState }) => {
      const token = selectToken(getState() as RootState);
      if (token !== null) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  endpoints: () => ({}),
  // What the host's changes make stale: a listing (`id`) or the lists of
  // listings (`LIST`), a listing's availability, the bookings (`LIST`) (D-067).
  tagTypes: ['Listing', 'Availability', 'Booking'],
  // Endpoints declare `argSchema` / `responseSchema` from @ars/shared. They are
  // checked in development and tests and skipped in production (D-021).
  skipSchemaValidation: env.isProduction,
  // A mismatch becomes a normal request error, so the page shows its error state.
  // Possible improvement (not in the plan): also send mismatches to `reportError`
  // through `onSchemaFailure`, so contract drift is visible in the logs.
  catchSchemaFailure: (error) => ({
    status: 'CUSTOM_ERROR' as const,
    error: `${error.schemaName} failed validation`,
    data: error.issues,
  }),
});
