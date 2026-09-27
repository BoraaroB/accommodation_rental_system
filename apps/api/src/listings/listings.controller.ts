import {
  availabilityQuerySchema,
  listingIdSchema,
  listingQuerySchema,
  type AvailabilityQuery,
  type ListingAvailability,
  type ListingDto,
  type ListingQuery,
  type Page,
} from '@ars/shared';
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { Public } from '../auth/public.decorator.js';
import { CurrentTenant } from '../tenants/current-tenant.decorator.js';
import { TenantGuard } from '../tenants/tenant.guard.js';
import type { TenantRecord } from '../tenants/tenant-request.js';
import { ListingsService } from './listings.service.js';

/** The public portal's listings: anyone may read them without signing in. */
@Public()
@UseGuards(TenantGuard)
@Controller('tenants/:tenantSlug')
export class ListingsController {
  constructor(private readonly listings: ListingsService) {}

  /** The tenant's cities, the options of the city filter. */
  @Get('cities')
  listCities(@CurrentTenant() tenant: TenantRecord): Promise<string[]> {
    return this.listings.listCities(tenant.id);
  }

  /** The portal's listings, filtered, sorted and paginated (D-017). */
  @Get('listings')
  list(
    @CurrentTenant() tenant: TenantRecord,
    @Query({ schema: listingQuerySchema }) query: ListingQuery,
  ): Promise<Page<ListingDto>> {
    return this.listings.list(tenant.id, query);
  }

  @Get('listings/:id')
  get(
    @CurrentTenant() tenant: TenantRecord,
    @Param('id', { schema: listingIdSchema }) id: string,
  ): Promise<ListingDto> {
    return this.listings.get(tenant.id, id);
  }

  /** The days of `[from, to)` on which the listing is taken. */
  @Get('listings/:id/availability')
  getAvailability(
    @CurrentTenant() tenant: TenantRecord,
    @Param('id', { schema: listingIdSchema }) id: string,
    @Query({ schema: availabilityQuerySchema }) range: AvailabilityQuery,
  ): Promise<ListingAvailability> {
    // Possible improvement (not in the plan): cap the span of the range.
    return this.listings.getAvailability(tenant.id, id, range);
  }
}
