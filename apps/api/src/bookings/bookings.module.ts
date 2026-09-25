import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module.js';
import { DatabaseModule } from '../core/database/database.module.js';
import { TenantsModule } from '../tenants/tenants.module.js';
import { BookingsController } from './bookings.controller.js';
import { BOOKINGS_REPOSITORY } from './bookings.repository.js';
import { BookingsService } from './bookings.service.js';
import { PrismaBookingsRepository } from './prisma-bookings.repository.js';

/** A tenant's bookings: the host panel's booking table. */
@Module({
  imports: [DatabaseModule, TenantsModule, AccessModule],
  controllers: [BookingsController],
  providers: [
    { provide: BOOKINGS_REPOSITORY, useClass: PrismaBookingsRepository },
    BookingsService,
  ],
})
export class BookingsModule {}
