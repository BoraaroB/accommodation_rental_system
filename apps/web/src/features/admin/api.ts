import {
  addedHostSchema,
  adminTenantSchema,
  hostInputSchema,
  tenantCreateSchema,
  tenantHostSchema,
  tenantIdSchema,
  tenantUpdateSchema,
  userIdSchema,
  type AddedHost,
  type AdminTenant,
  type HostInput,
  type TenantCreateInput,
  type TenantHost,
  type TenantUpdateInput,
} from '@ars/shared';
import { z } from 'zod';
import { baseApi } from '../../api/baseApi';
import { getErrorStatus } from '../../api/errors';

export interface TenantUpdateArgs {
  tenantId: string;
  changes: TenantUpdateInput;
}

export interface AddHostArgs {
  tenantId: string;
  host: HostInput;
}

export interface RemoveHostArgs {
  tenantId: string;
  userId: string;
}

/**
 * A change that succeeded makes the cached answers stale. So does a 404 on a
 * deletion: someone else deleted the row first, so the list still showing it
 * is out of date.
 */
function changedData(error: unknown, { deletion = false } = {}): boolean {
  return error === undefined || (deletion && getErrorStatus(error) === 404);
}

/**
 * The admin panel (`/admin/tenants/...`, superadmin only): the tenants and
 * their configuration (D-051, D-052), and each tenant's hosts (D-053).
 * Tenants are addressed by id, so an admin URL survives a slug change.
 */
export const adminApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getAdminTenants: build.query<AdminTenant[], void>({
      query: () => '/admin/tenants',
      responseSchema: z.array(adminTenantSchema),
      providesTags: ['Tenant'],
    }),
    getAdminTenant: build.query<AdminTenant, string>({
      query: (tenantId) => `/admin/tenants/${tenantId}`,
      argSchema: tenantIdSchema,
      responseSchema: adminTenantSchema,
      providesTags: ['Tenant'],
    }),
    /** 409 `SLUG_TAKEN` when another tenant has the slug. */
    createTenant: build.mutation<AdminTenant, TenantCreateInput>({
      query: (input) => ({
        url: '/admin/tenants',
        method: 'POST',
        body: input,
      }),
      argSchema: tenantCreateSchema,
      responseSchema: adminTenantSchema,
      invalidatesTags: (_result, error) =>
        changedData(error) ? ['Tenant'] : [],
    }),
    /** A merge patch: only the fields sent change, `null` clears one (D-052). */
    updateTenant: build.mutation<AdminTenant, TenantUpdateArgs>({
      query: ({ tenantId, changes }) => ({
        url: `/admin/tenants/${tenantId}`,
        method: 'PATCH',
        body: changes,
      }),
      argSchema: z.object({
        tenantId: tenantIdSchema,
        changes: tenantUpdateSchema,
      }),
      responseSchema: adminTenantSchema,
      // Every tenant answer, public ones included: the landing page and the
      // portal show the new name, slug and branding at once.
      // Possible improvement (not in the plan): also invalidate on a 404 (the
      // tenant was deleted elsewhere), so the page says "Tenant not found"
      // instead of keeping the form; the same for adding a host. And tag
      // `GET /auth/me`, so a superadmin who hosts the tenant gets its new slug
      // in the account menu without a reload.
      invalidatesTags: (_result, error) =>
        changedData(error) ? ['Tenant'] : [],
    }),
    /** Deletes the tenant and everything in it; accounts stay (D-029). */
    deleteTenant: build.mutation<void, string>({
      query: (tenantId) => ({
        url: `/admin/tenants/${tenantId}`,
        method: 'DELETE',
      }),
      argSchema: tenantIdSchema,
      invalidatesTags: (_result, error) =>
        changedData(error, { deletion: true }) ? ['Tenant'] : [],
    }),
    getTenantHosts: build.query<TenantHost[], string>({
      query: (tenantId) => `/admin/tenants/${tenantId}/hosts`,
      argSchema: tenantIdSchema,
      responseSchema: z.array(tenantHostSchema),
      providesTags: (_result, _error, tenantId) => [
        { type: 'Host', id: tenantId },
      ],
    }),
    /**
     * Adds a host; an existing account keeps its name and password
     * (`accountCreated: false`). 409 `ALREADY_HOST` when it hosts the tenant.
     */
    addHost: build.mutation<AddedHost, AddHostArgs>({
      query: ({ tenantId, host }) => ({
        url: `/admin/tenants/${tenantId}/hosts`,
        method: 'POST',
        body: host,
      }),
      argSchema: z.object({ tenantId: tenantIdSchema, host: hostInputSchema }),
      responseSchema: addedHostSchema,
      invalidatesTags: (_result, error, { tenantId }) =>
        changedData(error) ? [{ type: 'Host', id: tenantId }] : [],
    }),
    /** Removes the membership only; the account stays. */
    removeHost: build.mutation<void, RemoveHostArgs>({
      query: ({ tenantId, userId }) => ({
        url: `/admin/tenants/${tenantId}/hosts/${userId}`,
        method: 'DELETE',
      }),
      argSchema: z.object({ tenantId: tenantIdSchema, userId: userIdSchema }),
      invalidatesTags: (_result, error, { tenantId }) =>
        changedData(error, { deletion: true })
          ? [{ type: 'Host', id: tenantId }]
          : [],
    }),
  }),
});

export const {
  useGetAdminTenantsQuery,
  useGetAdminTenantQuery,
  useCreateTenantMutation,
  useUpdateTenantMutation,
  useDeleteTenantMutation,
  useGetTenantHostsQuery,
  useAddHostMutation,
  useRemoveHostMutation,
} = adminApi;
