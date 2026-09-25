import {
  blockDaysSchema,
  dateRangeSchema,
  listingIdSchema,
  upcomingDateRangeSchema,
  type BlockDaysInput,
  type DateRange,
  type ListingBlockedDays,
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
  Query,
  UseGuards,
} from '@nestjs/common';
import { PermissionsGuard } from '../access/permissions.guard.js';
import { RequirePermissions } from '../access/require-permissions.decorator.js';
import type { AuthUser } from '../auth/auth-user.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { CurrentTenant } from '../tenants/current-tenant.decorator.js';
import { TenantGuard } from '../tenants/tenant.guard.js';
import type { TenantRecord } from '../tenants/tenant-request.js';
import { BlockedDaysService } from './blocked-days.service.js';

/** The host calendar of one listing: its blocked days, `[from, to)` at a time. */
@UseGuards(TenantGuard, PermissionsGuard)
@Controller('t/:tenantSlug/host/listings/:id/blocked-days')
export class BlockedDaysController {
  constructor(private readonly blockedDays: BlockedDaysService) {}

  /** The blocked days of a range; past ranges are allowed. */
  @Get()
  @RequirePermissions('blocked-day:read')
  list(
    @CurrentTenant() tenant: TenantRecord,
    @Param('id', { schema: listingIdSchema }) id: string,
    @Query({ schema: dateRangeSchema }) range: DateRange,
  ): Promise<ListingBlockedDays> {
    return this.blockedDays.list(tenant.id, id, range);
  }

  @Post()
  @RequirePermissions('blocked-day:write')
  block(
    @CurrentTenant() tenant: TenantRecord,
    @CurrentUser() user: AuthUser,
    @Param('id', { schema: listingIdSchema }) id: string,
    @Body({ schema: blockDaysSchema }) range: BlockDaysInput,
  ): Promise<ListingBlockedDays> {
    return this.blockedDays.block(tenant.id, id, range, user.id);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('blocked-day:write')
  unblock(
    @CurrentTenant() tenant: TenantRecord,
    @CurrentUser() user: AuthUser,
    @Param('id', { schema: listingIdSchema }) id: string,
    @Query({ schema: upcomingDateRangeSchema }) range: DateRange,
  ): Promise<void> {
    return this.blockedDays.unblock(tenant.id, id, range, user.id);
  }
}
