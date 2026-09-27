import {
  publicTenantSchema,
  tenantSlugSchema,
  type PublicTenant,
} from '@ars/shared';
import { z } from 'zod';
import { baseApi } from '../../api/baseApi';

/**
 * The portals and their configuration (D-047). The admin panel's changes to a
 * tenant make both answers stale (`Tenant`), so the landing page and a
 * portal's branding follow them.
 */
export const tenantsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /** Every portal, for the landing page. */
    getTenants: build.query<PublicTenant[], void>({
      query: () => '/tenants',
      responseSchema: z.array(publicTenantSchema),
      providesTags: ['Tenant'],
    }),
    /** One portal's name and branding. */
    getTenant: build.query<PublicTenant, string>({
      query: (tenantSlug) => `/tenants/${tenantSlug}`,
      argSchema: tenantSlugSchema,
      responseSchema: publicTenantSchema,
      providesTags: ['Tenant'],
    }),
  }),
});

export const { useGetTenantsQuery, useGetTenantQuery } = tenantsApi;
