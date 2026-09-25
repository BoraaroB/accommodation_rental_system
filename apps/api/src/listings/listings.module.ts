import { Module } from '@nestjs/common';
import { DatabaseModule } from '../core/database/database.module.js';
import { TenantsModule } from '../tenants/tenants.module.js';
import { ListingsController } from './listings.controller.js';
import { LISTINGS_REPOSITORY } from './listings.repository.js';
import { ListingsService } from './listings.service.js';
import { PrismaListingsRepository } from './prisma-listings.repository.js';

/** A tenant's listings: the public portal's cities, list, detail and availability. */
@Module({
  imports: [DatabaseModule, TenantsModule],
  controllers: [ListingsController],
  providers: [
    { provide: LISTINGS_REPOSITORY, useClass: PrismaListingsRepository },
    ListingsService,
  ],
})
export class ListingsModule {}
