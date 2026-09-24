import { Module } from '@nestjs/common';
import { DatabaseModule } from '../core/database/database.module.js';
import { PrismaTenantsRepository } from './prisma-tenants.repository.js';
import { TENANTS_REPOSITORY } from './tenants.repository.js';
import { TenantsService } from './tenants.service.js';

/**
 * Tenants (portals). Resolves the `:tenantSlug` of tenant routes: a module
 * whose controllers use `TenantGuard` imports this one.
 */
@Module({
  imports: [DatabaseModule],
  providers: [
    { provide: TENANTS_REPOSITORY, useClass: PrismaTenantsRepository },
    TenantsService,
  ],
  exports: [TenantsService],
})
export class TenantsModule {}
