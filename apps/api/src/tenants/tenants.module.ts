import { Module } from '@nestjs/common';
import { DatabaseModule } from '../core/database/database.module.js';
import { PrismaTenantsRepository } from './prisma-tenants.repository.js';
import { TenantsController } from './tenants.controller.js';
import { TENANTS_REPOSITORY } from './tenants.repository.js';
import { TenantsService } from './tenants.service.js';

/**
 * Tenants (portals): the public portal list and configuration, and the
 * `:tenantSlug` lookup of tenant routes. A module whose controllers use
 * `TenantGuard` imports this one.
 */
@Module({
  imports: [DatabaseModule],
  controllers: [TenantsController],
  providers: [
    { provide: TENANTS_REPOSITORY, useClass: PrismaTenantsRepository },
    TenantsService,
  ],
  exports: [TenantsService],
})
export class TenantsModule {}
