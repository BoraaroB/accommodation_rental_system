import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module.js';
import { DatabaseModule } from '../core/database/database.module.js';
import { AdminTenantsController } from './admin-tenants.controller.js';
import { PrismaTenantsRepository } from './prisma-tenants.repository.js';
import { TenantsController } from './tenants.controller.js';
import { TENANTS_REPOSITORY } from './tenants.repository.js';
import { TenantsService } from './tenants.service.js';

/**
 * Tenants (portals): the public portal list and configuration, the
 * `:tenantSlug` lookup of tenant routes, and the admin panel's tenant
 * management. A module whose controllers use `TenantGuard` imports this one.
 */
@Module({
  imports: [DatabaseModule, AccessModule],
  controllers: [TenantsController, AdminTenantsController],
  providers: [
    { provide: TENANTS_REPOSITORY, useClass: PrismaTenantsRepository },
    TenantsService,
  ],
  exports: [TenantsService],
})
export class TenantsModule {}
