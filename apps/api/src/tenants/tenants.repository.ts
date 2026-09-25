import type { TenantRecord } from './tenant-request.js';

export const TENANTS_REPOSITORY = Symbol('TENANTS_REPOSITORY');

/** Tenants (portals), looked up by the slug in the URL. */
export interface TenantsRepository {
  findBySlug(slug: string): Promise<TenantRecord | null>;
  /** Every tenant, ordered by slug. */
  findAll(): Promise<TenantRecord[]>;
}
