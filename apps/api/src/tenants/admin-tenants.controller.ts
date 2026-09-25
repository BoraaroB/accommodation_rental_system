import {
  tenantCreateSchema,
  tenantIdSchema,
  tenantUpdateSchema,
  type AdminTenant,
  type TenantCreateInput,
  type TenantUpdateInput,
} from '@ars/shared';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PermissionsGuard } from '../access/permissions.guard.js';
import { RequirePermissions } from '../access/require-permissions.decorator.js';
import { TenantsService } from './tenants.service.js';

/**
 * The admin panel's tenants: a platform route (no `:tenantSlug`), so only the
 * superadmin has the permissions (D-041).
 */
@UseGuards(PermissionsGuard)
@Controller('admin/tenants')
export class AdminTenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @Get()
  @RequirePermissions('tenant:read')
  list(): Promise<AdminTenant[]> {
    return this.tenants.listForAdmin();
  }

  @Get(':tenantId')
  @RequirePermissions('tenant:read')
  get(
    @Param('tenantId', { schema: tenantIdSchema }) tenantId: string,
  ): Promise<AdminTenant> {
    return this.tenants.getForAdmin(tenantId);
  }

  @Post()
  @RequirePermissions('tenant:write')
  create(
    @Body({ schema: tenantCreateSchema }) input: TenantCreateInput,
  ): Promise<AdminTenant> {
    return this.tenants.create(input);
  }

  @Patch(':tenantId')
  @RequirePermissions('tenant:write')
  update(
    @Param('tenantId', { schema: tenantIdSchema }) tenantId: string,
    @Body({ schema: tenantUpdateSchema }) changes: TenantUpdateInput,
  ): Promise<AdminTenant> {
    return this.tenants.update(tenantId, changes);
  }

  @Delete(':tenantId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('tenant:write')
  remove(
    @Param('tenantId', { schema: tenantIdSchema }) tenantId: string,
  ): Promise<void> {
    return this.tenants.remove(tenantId);
  }
}
