import {
  hostInputSchema,
  tenantIdSchema,
  userIdSchema,
  type AddedHost,
  type HostInput,
  type TenantHost,
} from '@ars/shared';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PermissionsGuard } from '../access/permissions.guard.js';
import { RequirePermissions } from '../access/require-permissions.decorator.js';
import { HostsService } from './hosts.service.js';

/**
 * The admin panel's hosts of one tenant: a platform route (no
 * `:tenantSlug`), so only the superadmin has the permissions (D-041).
 */
@UseGuards(PermissionsGuard)
@Controller('admin/tenants/:tenantId/hosts')
export class HostsController {
  constructor(private readonly hosts: HostsService) {}

  @Get()
  @RequirePermissions('host:read')
  list(
    @Param('tenantId', { schema: tenantIdSchema }) tenantId: string,
  ): Promise<TenantHost[]> {
    return this.hosts.list(tenantId);
  }

  @Post()
  @RequirePermissions('host:write')
  add(
    @Param('tenantId', { schema: tenantIdSchema }) tenantId: string,
    @Body({ schema: hostInputSchema }) input: HostInput,
  ): Promise<AddedHost> {
    return this.hosts.add(tenantId, input);
  }

  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('host:write')
  remove(
    @Param('tenantId', { schema: tenantIdSchema }) tenantId: string,
    @Param('userId', { schema: userIdSchema }) userId: string,
  ): Promise<void> {
    return this.hosts.remove(tenantId, userId);
  }
}
