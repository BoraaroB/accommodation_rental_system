import {
  publicTenantSchema,
  tenantSlugSchema,
  type PublicTenant,
} from '@ars/shared';
import { z } from 'zod';
import { baseApi } from '../../api/baseApi';

/** The portals and their configuration (D-047). */
export const tenantsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /** Every portal, for the landing page. */
    getTenants: build.query<PublicTenant[], void>({
      query: () => '/tenants',
      responseSchema: z.array(publicTenantSchema),
    }),
    /** One portal's name and branding. */
    getTenant: build.query<PublicTenant, string>({
      query: (tenantSlug) => `/t/${tenantSlug}`,
      argSchema: tenantSlugSchema,
      responseSchema: publicTenantSchema,
    }),
  }),
});

export const { useGetTenantsQuery, useGetTenantQuery } = tenantsApi;
