import { useParams } from 'react-router';

/** The `:tenantSlug` of the current route; only for pages under `/:tenantSlug`. */
export function useTenantSlug(): string {
  const { tenantSlug } = useParams();
  if (tenantSlug === undefined) {
    throw new Error('useTenantSlug is used outside a /:tenantSlug route');
  }
  return tenantSlug;
}
