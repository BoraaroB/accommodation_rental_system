import {
  hostBookingQuerySchema,
  type HostBooking,
  type HostBookingQuery,
  type Page,
} from '@ars/shared';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PermissionsGuard } from '../access/permissions.guard.js';
import { RequirePermissions } from '../access/require-permissions.decorator.js';
import { CurrentTenant } from '../tenants/current-tenant.decorator.js';
import { TenantGuard } from '../tenants/tenant.guard.js';
import type { TenantRecord } from '../tenants/tenant-request.js';
import { BookingsService } from './bookings.service.js';

/** The host panel's bookings: read-only, since bookings come from the data. */
@UseGuards(TenantGuard, PermissionsGuard)
@Controller('tenants/:tenantSlug/host/bookings')
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Get()
  @RequirePermissions('booking:read')
  list(
    @CurrentTenant() tenant: TenantRecord,
    @Query({ schema: hostBookingQuerySchema }) query: HostBookingQuery,
  ): Promise<Page<HostBooking>> {
    return this.bookings.list(tenant.id, query);
  }
}
