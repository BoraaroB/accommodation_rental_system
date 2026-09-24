import { SetMetadata } from '@nestjs/common';
import type { Permission } from './permissions.js';

export const PERMISSIONS_KEY = 'permissions';

/**
 * The permissions a handler (or every handler of a controller) needs; the
 * user must have all of them. Only metadata: it is enforced by
 * `PermissionsGuard`, which the controller must apply with `@UseGuards` —
 * without it, any signed-in user gets in.
 */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
