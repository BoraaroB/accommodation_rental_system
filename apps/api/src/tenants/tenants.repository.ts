import type { TenantCreateInput, TenantUpdateInput } from '@ars/shared';
import type { TenantRecord } from './tenant-request.js';

export const TENANTS_REPOSITORY = Symbol('TENANTS_REPOSITORY');

/** Tenants (portals): looked up by the slug in the URL, managed by the admin panel. */
export interface TenantsRepository {
  findBySlug(slug: string): Promise<TenantRecord | null>;
  findById(id: string): Promise<TenantRecord | null>;
  /** Every tenant, ordered by slug. */
  findAll(): Promise<TenantRecord[]>;
  create(tenant: TenantCreateInput): Promise<TenantRecord>;
  /** Writes the fields that are set; `null` clears one. */
  update(id: string, changes: TenantUpdateInput): Promise<TenantRecord>;
  /**
   * Deletes the tenant with its listings, bookings, blocked days and host
   * memberships (D-029); `false` when no tenant has this id.
   */
  remove(id: string): Promise<boolean>;
}
