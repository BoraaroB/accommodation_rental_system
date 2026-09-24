import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from '@nestjs/common';
import type { TenantRequest } from './tenant-request.js';
import { TenantsService } from './tenants.service.js';

/**
 * Resolves the `:tenantSlug` of a tenant route and puts the tenant on the
 * request for `@CurrentTenant()` and `PermissionsGuard`; an unknown slug is a
 * 404 (D-006). Applied per controller, before `PermissionsGuard`:
 * `@UseGuards(TenantGuard, PermissionsGuard)`. The controller's module imports
 * `TenantsModule`.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly tenants: TenantsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<TenantRequest>();
    const slug = request.params.tenantSlug;
    if (slug === undefined) {
      throw new Error('TenantGuard is applied to a route without :tenantSlug');
    }
    request.tenant = await this.tenants.getBySlug(slug);
    return true;
  }
}
