import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from '../auth/auth-user.js';
import type { TenantRequest } from '../tenants/tenant-request.js';
import { InsufficientPermissionsError } from './access.errors.js';
import { AccessService } from './access.service.js';
import type { Permission } from './permissions.js';
import { PERMISSIONS_KEY } from './require-permissions.decorator.js';

/**
 * "What you may do": checks the handler's `@RequirePermissions(...)` against
 * the user's role in the tenant of the URL (none on platform routes). Runs
 * after the global `AuthGuard` and, on tenant routes, after `TenantGuard`:
 * `@UseGuards(TenantGuard, PermissionsGuard)`. The controller's module
 * imports `AccessModule`.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly access: AccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<Permission[] | undefined>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    // Possible improvement (not in the plan): check at startup that every
    // handler with `@RequirePermissions` is behind this guard, and every
    // handler behind it declares its permissions.
    if (required === undefined || required.length === 0) {
      // Forgetting `@RequirePermissions` denies instead of allowing.
      throw new InsufficientPermissionsError();
    }

    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest & TenantRequest>();
    if (request.user === undefined) {
      throw new Error('PermissionsGuard is applied to a @Public() route');
    }
    if (
      request.params.tenantSlug !== undefined &&
      request.tenant === undefined
    ) {
      throw new Error('TenantGuard must run before PermissionsGuard');
    }

    const allowed = await this.access.can(
      request.user.id,
      request.tenant?.id ?? null,
      required,
    );
    if (!allowed) {
      throw new InsufficientPermissionsError();
    }
    return true;
  }
}
