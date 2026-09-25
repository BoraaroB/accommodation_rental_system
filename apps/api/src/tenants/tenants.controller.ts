import type { PublicTenant } from '@ars/shared';
import { Controller, Get, UseGuards } from '@nestjs/common';
import { Public } from '../auth/public.decorator.js';
import { CurrentTenant } from './current-tenant.decorator.js';
import { TenantGuard } from './tenant.guard.js';
import { toPublicTenant } from './tenants.mapper.js';
import type { TenantRecord } from './tenant-request.js';
import { TenantsService } from './tenants.service.js';

/** The portals as visitors see them: public, no sign-in. */
@Public()
@Controller()
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  /** Every portal, for the landing page. */
  @Get('tenants')
  list(): Promise<PublicTenant[]> {
    return this.tenants.listPublic();
  }

  /** The portal's configuration and branding. */
  @Get('t/:tenantSlug')
  // On this handler only: `TenantGuard` needs the `:tenantSlug` that `GET /tenants` has not.
  @UseGuards(TenantGuard)
  get(@CurrentTenant() tenant: TenantRecord): PublicTenant {
    return toPublicTenant(tenant);
  }
}
