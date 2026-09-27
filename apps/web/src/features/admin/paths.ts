/** The admin panel's tenant table. */
export const ADMIN_TENANTS_PATH = '/admin/tenants';

/** The form for a new tenant. */
export const NEW_TENANT_PATH = `${ADMIN_TENANTS_PATH}/new`;

/** One tenant's configuration and hosts, by id (D-051). */
export function adminTenantPath(tenantId: string): string {
  return `${ADMIN_TENANTS_PATH}/${tenantId}`;
}

/** The tenant's public portal. */
export function portalPath(slug: string): string {
  return `/${slug}`;
}
