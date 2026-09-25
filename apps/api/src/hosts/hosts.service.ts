import type { AddedHost, HostInput, TenantHost } from '@ars/shared';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  PASSWORD_HASHER,
  type PasswordHasher,
} from '../auth/password-hasher.js';
import { TenantsService } from '../tenants/tenants.service.js';
import {
  USERS_REPOSITORY,
  type UsersRepository,
} from '../users/users.repository.js';
import { AlreadyHostError, HostNotFoundError } from './hosts.errors.js';
import { HOSTS_REPOSITORY, type HostsRepository } from './hosts.repository.js';

/** A tenant's host accounts, managed by the superadmin (D-008). */
@Injectable()
export class HostsService {
  private readonly logger = new Logger(HostsService.name);

  constructor(
    private readonly tenants: TenantsService,
    @Inject(HOSTS_REPOSITORY) private readonly hosts: HostsRepository,
    @Inject(USERS_REPOSITORY) private readonly users: UsersRepository,
    @Inject(PASSWORD_HASHER) private readonly passwords: PasswordHasher,
  ) {}

  /** The tenant's hosts, ordered by e-mail; an unknown tenant is a 404. */
  async list(tenantId: string): Promise<TenantHost[]> {
    await this.tenants.getById(tenantId);
    return this.hosts.findByTenant(tenantId);
  }

  /**
   * Makes the e-mail's account a host of the tenant, creating the account
   * when there is none. An existing account keeps its name and password (it
   * may be someone's client account, D-003); `accountCreated` tells the admin
   * so. Two requests racing for one e-mail or membership: the unique index
   * rejects the second (409 UNIQUE_VIOLATION); a tenant deleted meanwhile:
   * 404 NOT_FOUND (both from `PrismaExceptionFilter`).
   */
  async add(tenantId: string, input: HostInput): Promise<AddedHost> {
    await this.tenants.getById(tenantId);
    const existing = await this.users.findByEmail(input.email);
    if (existing === null) {
      const host = await this.hosts.createWithAccount(tenantId, {
        email: input.email,
        name: input.name,
        passwordHash: await this.passwords.hash(input.password),
      });
      this.logger.log(
        `Host ${host.id} added to tenant ${tenantId} (new account)`,
      );
      return { ...host, accountCreated: true };
    }
    if (await this.hosts.isHost(tenantId, existing.id)) {
      throw new AlreadyHostError();
    }
    const host = await this.hosts.add(tenantId, existing.id);
    this.logger.log(`Host ${host.id} added to tenant ${tenantId}`);
    return { ...host, accountCreated: false };
  }

  /** Ends the user's membership; the account stays, as a client of the tenant. */
  async remove(tenantId: string, userId: string): Promise<void> {
    await this.tenants.getById(tenantId);
    if (!(await this.hosts.remove(tenantId, userId))) {
      throw new HostNotFoundError();
    }
    this.logger.log(`Host ${userId} removed from tenant ${tenantId}`);
  }
}
