import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import {
  USERS_REPOSITORY,
  type UsersRepository,
} from '../users/users.repository.js';
import { AccessService } from './access.service.js';
import { PERMISSIONS } from './permissions.js';
import { ROLE_PERMISSIONS } from './role-permissions.js';

const TENANT_A = 'tenant-a';
const TENANT_B = 'tenant-b';

/** Users by id: platform flag and the tenants they host. */
const USERS: Record<string, { isSuperadmin: boolean; hostOf: string[] }> = {
  admin: { isSuperadmin: true, hostOf: [] },
  adminAndHost: { isSuperadmin: true, hostOf: [TENANT_A] },
  hostOfA: { isSuperadmin: false, hostOf: [TENANT_A] },
};

async function createService(): Promise<AccessService> {
  const users: UsersRepository = {
    findByEmail: vi.fn(),
    findProfileById: vi.fn(),
    create: vi.fn(),
    findAccess: (userId, tenantId) => {
      const user = USERS[userId];
      return Promise.resolve(
        user === undefined
          ? null
          : {
              isSuperadmin: user.isSuperadmin,
              isHost: tenantId !== null && user.hostOf.includes(tenantId),
            },
      );
    },
  };
  const moduleRef = await Test.createTestingModule({
    providers: [AccessService, { provide: USERS_REPOSITORY, useValue: users }],
  }).compile();
  return moduleRef.get(AccessService);
}

describe('ROLE_PERMISSIONS', () => {
  it('gives a client no permission', () => {
    expect(ROLE_PERMISSIONS.client).toEqual([]);
  });

  it('gives a host the host panel and nothing of the admin panel', () => {
    expect([...ROLE_PERMISSIONS.host].sort()).toEqual([
      'blocked-day:read',
      'blocked-day:write',
      'booking:read',
      'listing:read',
      'listing:update',
    ]);
  });

  it('gives a superadmin every permission', () => {
    expect([...ROLE_PERMISSIONS.superadmin].sort()).toEqual(
      [...PERMISSIONS].sort(),
    );
  });
});

describe('AccessService', () => {
  it.each([
    ['admin', TENANT_B, 'superadmin'],
    ['adminAndHost', TENANT_A, 'superadmin'],
    ['hostOfA', TENANT_A, 'host'],
    ['hostOfA', TENANT_B, 'client'],
    ['hostOfA', null, 'client'],
  ] as const)('%s in %s is a %s', async (userId, tenantId, role) => {
    const service = await createService();
    await expect(service.roleFor(userId, tenantId)).resolves.toBe(role);
  });

  it('answers a user that no longer exists with 401 INVALID_TOKEN', async () => {
    const service = await createService();
    await expect(service.roleFor('deleted', TENANT_A)).rejects.toMatchObject({
      status: 401,
      errorCode: 'INVALID_TOKEN',
    });
  });

  it.each([
    [['listing:update'], true],
    [['listing:update', 'tenant:write'], false],
  ] as const)(
    'a host of the tenant can %j: %s (every permission is required)',
    async (required, expected) => {
      const service = await createService();
      await expect(service.can('hostOfA', TENANT_A, required)).resolves.toBe(
        expected,
      );
    },
  );
});
