import type { TenantRecord } from './tenants.repository.js';

/** The request fields `TenantGuard` reads and sets. */
export interface TenantRequest {
  params: Record<string, string | undefined>;
  /** Set by `TenantGuard` on a tenant route. */
  tenant?: TenantRecord;
}
