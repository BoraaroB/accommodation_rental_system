import type { UserProfile } from '@ars/shared';

// What the web app shows follows the API's `ROLE_PERMISSIONS`: a host works
// in their own tenants, a superadmin everywhere. It is UI gating only; the API
// checks every request (D-007).

/** Whether `user` may open the host panel of the tenant `tenantSlug`. */
export function canUseHostPanel(
  user: UserProfile,
  tenantSlug: string,
): boolean {
  return (
    user.isSuperadmin ||
    user.hostOf.some((tenant) => tenant.slug === tenantSlug)
  );
}

/** Whether `user` may open the admin panel. */
export function canUseAdminPanel(user: UserProfile): boolean {
  return user.isSuperadmin;
}
