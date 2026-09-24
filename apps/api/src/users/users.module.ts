import { Module } from '@nestjs/common';
import { DatabaseModule } from '../core/database/database.module.js';
import { PrismaUsersRepository } from './prisma-users.repository.js';
import { USERS_REPOSITORY } from './users.repository.js';

/**
 * User accounts, the global identity (D-003). Auth and access read and create
 * users through `USERS_REPOSITORY`; there is no service until a use case needs
 * one.
 */
@Module({
  imports: [DatabaseModule],
  providers: [{ provide: USERS_REPOSITORY, useClass: PrismaUsersRepository }],
  exports: [USERS_REPOSITORY],
})
export class UsersModule {}
