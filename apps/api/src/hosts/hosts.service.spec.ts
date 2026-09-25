import type { TenantHost } from '@ars/shared';
import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import {
  PASSWORD_HASHER,
  type PasswordHasher,
} from '../auth/password-hasher.js';
import type { TenantRecord } from '../tenants/tenant-request.js';
import { TenantsService } from '../tenants/tenants.service.js';
import {
  USERS_REPOSITORY,
  type UserCredentials,
  type UsersRepository,
} from '../users/users.repository.js';
import { HOSTS_REPOSITORY, type HostsRepository } from './hosts.repository.js';
import { HostsService } from './hosts.service.js';

const TENANT_ID = '0f4f6b52-6c1e-4b8e-9a8c-5d2b1e0c3a71';
const tenant: TenantRecord = {
  id: TENANT_ID,
  slug: 'north-sea',
  name: 'North Sea',
  logoUrl: null,
  primaryColor: null,
  contactEmail: null,
  currency: 'EUR',
};
const input = {
  email: 'host@example.com',
  name: 'Host',
  password: 'correct-horse',
};
const account: UserCredentials = {
  id: '6a1d3c9e-2b4f-4e8a-b7c5-0d9e8f7a6b52',
  email: input.email,
  passwordHash: 'stored-hash',
};
const host: TenantHost = { id: account.id, email: input.email, name: 'Host' };

/**
 * A service for a tenant where the e-mail has the `existing` account, which
 * does not host the tenant yet. Conflicts and 404s are covered by the e2e.
 */
async function createService(existing: UserCredentials | null) {
  const tenants: Partial<TenantsService> = {
    getById: () => Promise.resolve(tenant),
  };
  const users: Partial<UsersRepository> = {
    findByEmail: () => Promise.resolve(existing),
  };
  const hosts = {
    isHost: () => Promise.resolve(false),
    add: vi.fn(() => Promise.resolve(host)),
    createWithAccount: vi.fn(() => Promise.resolve(host)),
  } satisfies Partial<HostsRepository>;
  const passwords = {
    hash: vi.fn((password: string) => Promise.resolve(`hash(${password})`)),
  } satisfies Partial<PasswordHasher>;
  const moduleRef = await Test.createTestingModule({
    providers: [
      HostsService,
      { provide: TenantsService, useValue: tenants },
      { provide: USERS_REPOSITORY, useValue: users },
      { provide: HOSTS_REPOSITORY, useValue: hosts },
      { provide: PASSWORD_HASHER, useValue: passwords },
    ],
  }).compile();
  return { service: moduleRef.get(HostsService), hosts, passwords };
}

describe('HostsService.add', () => {
  it('creates an account with the hashed password for a new e-mail', async () => {
    const { service, hosts } = await createService(null);

    const added = await service.add(TENANT_ID, input);

    expect(added).toEqual({ ...host, accountCreated: true });
    expect(hosts.createWithAccount).toHaveBeenCalledWith(TENANT_ID, {
      email: input.email,
      name: input.name,
      passwordHash: 'hash(correct-horse)',
    });
    expect(hosts.add).not.toHaveBeenCalled();
  });

  it('adds an existing account without touching its password', async () => {
    const { service, hosts, passwords } = await createService(account);

    const added = await service.add(TENANT_ID, input);

    expect(added).toEqual({ ...host, accountCreated: false });
    expect(hosts.add).toHaveBeenCalledWith(TENANT_ID, account.id);
    expect(hosts.createWithAccount).not.toHaveBeenCalled();
    expect(passwords.hash).not.toHaveBeenCalled();
  });
});
