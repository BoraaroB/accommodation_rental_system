import { Inject, Injectable } from '@nestjs/common';
import { InvalidTokenError } from '../auth/auth.errors.js';
import {
  USERS_REPOSITORY,
  type UsersRepository,
} from '../users/users.repository.js';
import type { Permission } from './permissions.js';
import { hasPermissions, type Role } from './role-permissions.js';

/** "What you may do": roles come from the database on every request, never from the token (D-007). */
@Injectable()
export class AccessService {
  constructor(
    @Inject(USERS_REPOSITORY) private readonly users: UsersRepository,
  ) {}

  /**
   * The user's effective role in a tenant: superadmin (platform flag), host (a
   * membership in this tenant) or client. Without a tenant (platform routes
   * such as `/admin`) a user is a superadmin or a client. A membership change
   * applies to the next request.
   */
  async roleFor(userId: string, tenantId: string | null): Promise<Role> {
    const access = await this.users.findAccess(userId, tenantId);
    if (access === null) {
      // The token is valid, but its user no longer exists.
      throw new InvalidTokenError();
    }
    if (access.isSuperadmin) {
      return 'superadmin';
    }
    return access.isHost ? 'host' : 'client';
  }

  /** Whether the user has every permission in `required` in this tenant. */
  async can(
    userId: string,
    tenantId: string | null,
    required: readonly Permission[],
  ): Promise<boolean> {
    return hasPermissions(await this.roleFor(userId, tenantId), required);
  }
}
