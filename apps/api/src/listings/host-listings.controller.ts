import {
  hostListingQuerySchema,
  listingIdSchema,
  listingUpdateSchema,
  type HostListingQuery,
  type ListingDto,
  type ListingUpdateInput,
  type Page,
} from '@ars/shared';
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PermissionsGuard } from '../access/permissions.guard.js';
import { RequirePermissions } from '../access/require-permissions.decorator.js';
import { CurrentTenant } from '../tenants/current-tenant.decorator.js';
import { TenantGuard } from '../tenants/tenant.guard.js';
import type { TenantRecord } from '../tenants/tenant-request.js';
import { ListingsService } from './listings.service.js';

/** The host panel's listings: the tenant's table, one listing and its edit (D-005). */
@UseGuards(TenantGuard, PermissionsGuard)
@Controller('t/:tenantSlug/host/listings')
export class HostListingsController {
  constructor(private readonly listings: ListingsService) {}

  @Get()
  @RequirePermissions('listing:read')
  list(
    @CurrentTenant() tenant: TenantRecord,
    @Query({ schema: hostListingQuerySchema }) query: HostListingQuery,
  ): Promise<Page<ListingDto>> {
    return this.listings.listForHost(tenant.id, query);
  }

  @Get(':id')
  @RequirePermissions('listing:read')
  get(
    @CurrentTenant() tenant: TenantRecord,
    @Param('id', { schema: listingIdSchema }) id: string,
  ): Promise<ListingDto> {
    return this.listings.get(tenant.id, id);
  }

  @Patch(':id')
  @RequirePermissions('listing:update')
  update(
    @CurrentTenant() tenant: TenantRecord,
    @Param('id', { schema: listingIdSchema }) id: string,
    @Body({ schema: listingUpdateSchema }) changes: ListingUpdateInput,
  ): Promise<ListingDto> {
    return this.listings.update(tenant.id, id, changes);
  }
}
