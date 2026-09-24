export const TENANTS_REPOSITORY = Symbol('TENANTS_REPOSITORY');

/** A tenant as a tenant route needs it; `TenantGuard` puts it on the request. */
export interface TenantRecord {
  id: string;
  slug: string;
  name: string;
}

/** Tenants (portals), looked up by the slug in the URL. */
export interface TenantsRepository {
  findBySlug(slug: string): Promise<TenantRecord | null>;
}
