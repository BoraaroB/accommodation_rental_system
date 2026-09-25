import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { DatabaseModule } from '../core/database/database.module.js';
import { TenantsModule } from '../tenants/tenants.module.js';
import { UsersModule } from '../users/users.module.js';
import { HostsController } from './hosts.controller.js';
import { HOSTS_REPOSITORY } from './hosts.repository.js';
import { HostsService } from './hosts.service.js';
import { PrismaHostsRepository } from './prisma-hosts.repository.js';

/**
 * A tenant's host accounts in the admin panel: its memberships (D-008). A new
 * host's account is created here, with the password hasher of `AuthModule`.
 */
@Module({
  imports: [
    DatabaseModule,
    TenantsModule,
    UsersModule,
    AuthModule,
    AccessModule,
  ],
  controllers: [HostsController],
  providers: [
    { provide: HOSTS_REPOSITORY, useClass: PrismaHostsRepository },
    HostsService,
  ],
})
export class HostsModule {}
