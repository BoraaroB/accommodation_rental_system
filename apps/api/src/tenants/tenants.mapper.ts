import type { AdminTenant, PublicTenant } from '@ars/shared';
import type { TenantRecord } from './tenant-request.js';

/** A tenant → what its portal shows visitors; the id stays inside the API. */
export function toPublicTenant(tenant: TenantRecord): PublicTenant {
  return {
    slug: tenant.slug,
    name: tenant.name,
    logoUrl: tenant.logoUrl,
    primaryColor: tenant.primaryColor,
    contactEmail: tenant.contactEmail,
    currency: tenant.currency,
  };
}

/** A tenant → the admin panel's view: the configuration and the id its routes use. */
export function toAdminTenant(tenant: TenantRecord): AdminTenant {
  return { id: tenant.id, ...toPublicTenant(tenant) };
}
