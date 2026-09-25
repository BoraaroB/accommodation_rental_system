import type { TenantHost } from '@ars/shared';
import type { NewUser } from '../users/users.repository.js';

export const HOSTS_REPOSITORY = Symbol('HOSTS_REPOSITORY');

/** A tenant's hosts: users with a membership in it (D-005, D-008). */
export interface HostsRepository {
  /** The tenant's hosts, ordered by e-mail. */
  findByTenant(tenantId: string): Promise<TenantHost[]>;
  isHost(tenantId: string, userId: string): Promise<boolean>;
  /** Makes an existing user a host of the tenant. */
  add(tenantId: string, userId: string): Promise<TenantHost>;
  /** Creates the account and its membership together, or neither. */
  createWithAccount(tenantId: string, account: NewUser): Promise<TenantHost>;
  /** Ends the membership; the account stays. `false` when the user does not host the tenant. */
  remove(tenantId: string, userId: string): Promise<boolean>;
}
