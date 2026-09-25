import { Controller, Get, UseGuards } from '@nestjs/common';
import { PermissionsGuard } from '../src/access/permissions.guard.js';
import { RequirePermissions } from '../src/access/require-permissions.decorator.js';
import type { AuthUser } from '../src/auth/auth-user.js';
import { CurrentUser } from '../src/auth/current-user.decorator.js';
import { CurrentTenant } from '../src/tenants/current-tenant.decorator.js';
import { TenantGuard } from '../src/tenants/tenant.guard.js';
import type { TenantRecord } from '../src/tenants/tenant-request.js';

/**
 * A tenant route that exists only in the e2e tests
 * (`/api/v1/t/:tenantSlug/access-check`). It carries the host panel's guards,
 * so their order and answers — including a handler that declares no
 * permission — are tested apart from any real route.
 */
@Controller('t/:tenantSlug/access-check')
@UseGuards(TenantGuard, PermissionsGuard)
export class TenantAccessRoutesController {
  @Get()
  @RequirePermissions('listing:update')
  check(
    @CurrentTenant() tenant: TenantRecord,
    @CurrentUser() user: AuthUser,
  ): { tenantSlug: string; userId: string } {
    return { tenantSlug: tenant.slug, userId: user.id };
  }

  /** Declares no permission, so it is denied to everyone. */
  @Get('undeclared')
  undeclared(): { reached: true } {
    return { reached: true };
  }
}
