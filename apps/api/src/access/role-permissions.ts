import { PERMISSIONS, type Permission } from './permissions.js';

/** A user's effective role in one tenant, computed per request (D-007). */
export type Role = 'client' | 'host' | 'superadmin';

/**
 * What each role may do: the only place roles meet permissions. A client
 * searches and views listings, which are public; a host manages the listings
 * and calendar of their tenant; a superadmin may do everything, on every
 * tenant.
 */
export const ROLE_PERMISSIONS: Readonly<Record<Role, readonly Permission[]>> = {
  client: [],
  host: [
    'listing:read',
    'listing:update',
    'blocked-day:read',
    'blocked-day:write',
    'booking:read',
  ],
  superadmin: PERMISSIONS,
};

/** Whether `role` has every permission in `required`. */
export function hasPermissions(
  role: Role,
  required: readonly Permission[],
): boolean {
  const granted = ROLE_PERMISSIONS[role];
  return required.every((permission) => granted.includes(permission));
}
