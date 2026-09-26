import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { env } from '../config/env';

/**
 * The one RTK Query API. Features add their endpoints with `injectEndpoints`.
 */
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: env.apiBaseUrl }),
  endpoints: () => ({}),
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
