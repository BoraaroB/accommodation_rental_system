import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { AccessService } from './access.service.js';

/**
 * "What you may do" (D-007): the effective role per tenant and its
 * permissions. A module whose controllers use `PermissionsGuard` imports this
 * one.
 */
@Module({
  imports: [UsersModule],
  providers: [AccessService],
  exports: [AccessService],
})
export class AccessModule {}
