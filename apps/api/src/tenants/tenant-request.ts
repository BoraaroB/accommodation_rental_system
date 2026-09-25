import type { Currency } from '@ars/shared';

/**
 * The tenant of a tenant route, as `TenantGuard` puts it on the request. It
 * carries the portal's public configuration, so the portal needs no second
 * query for it.
 */
export interface TenantRecord {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  primaryColor: string | null;
  contactEmail: string | null;
  currency: Currency;
}

/** The request fields `TenantGuard` reads and sets. */
export interface TenantRequest {
  params: Record<string, string | undefined>;
  /** Set by `TenantGuard` on a tenant route. */
  tenant?: TenantRecord;
}
