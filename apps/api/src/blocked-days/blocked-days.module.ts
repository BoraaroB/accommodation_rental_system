import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module.js';
import { DatabaseModule } from '../core/database/database.module.js';
import { ListingsModule } from '../listings/listings.module.js';
import { TenantsModule } from '../tenants/tenants.module.js';
import { BlockedDaysController } from './blocked-days.controller.js';
import { BLOCKED_DAYS_REPOSITORY } from './blocked-days.repository.js';
import { BlockedDaysService } from './blocked-days.service.js';
import { PrismaBlockedDaysRepository } from './prisma-blocked-days.repository.js';

/** The host calendar: the days hosts block on their tenant's listings. */
@Module({
  imports: [DatabaseModule, TenantsModule, AccessModule, ListingsModule],
  controllers: [BlockedDaysController],
  providers: [
    { provide: BLOCKED_DAYS_REPOSITORY, useClass: PrismaBlockedDaysRepository },
    BlockedDaysService,
  ],
})
export class BlockedDaysModule {}
