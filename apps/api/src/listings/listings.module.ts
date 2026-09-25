import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module.js';
import { DatabaseModule } from '../core/database/database.module.js';
import { TenantsModule } from '../tenants/tenants.module.js';
import { HostListingsController } from './host-listings.controller.js';
import { ListingsController } from './listings.controller.js';
import { LISTINGS_REPOSITORY } from './listings.repository.js';
import { ListingsService } from './listings.service.js';
import { PrismaListingsRepository } from './prisma-listings.repository.js';

/**
 * A tenant's listings: the public portal's cities, list, detail and
 * availability, and the host panel's table and editor. `ListingsService` is
 * exported for the host calendar (`BlockedDaysModule`).
 */
@Module({
  imports: [DatabaseModule, TenantsModule, AccessModule],
  controllers: [ListingsController, HostListingsController],
  providers: [
    { provide: LISTINGS_REPOSITORY, useClass: PrismaListingsRepository },
    ListingsService,
  ],
  exports: [ListingsService],
})
export class ListingsModule {}
