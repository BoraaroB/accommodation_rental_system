import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { accessTokenSchema, apiErrorSchema } from '@ars/shared';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request, { type Response } from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AccessModule } from '../src/access/access.module.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import {
  PASSWORD_HASHER,
  type PasswordHasher,
} from '../src/auth/password-hasher.js';
import { PrismaService } from '../src/core/database/prisma.service.js';
import { TenantsModule } from '../src/tenants/tenants.module.js';
import {
  USERS_REPOSITORY,
  type UsersRepository,
} from '../src/users/users.repository.js';
import { TenantAccessRoutesController } from './access-routes.controller.js';

const PASSWORD = 'e2e-password-1';

function expectApiError(res: Response, statusCode: number, code: string) {
  expect(apiErrorSchema.parse(res.body)).toMatchObject({ statusCode, code });
}

describe('Access: who you are vs what you may do (e2e)', () => {
  let app: NestExpressApplication<Server>;
  let prisma: PrismaService;
  const run = randomUUID().slice(0, 8);
  const slugA = `e2e-access-a-${run}`;
  const slugB = `e2e-access-b-${run}`;
  // E-mails are stored lowercase (users_email_lowercase_check).
  const emailOf = (name: string) =>
    `e2e-access-${name.toLowerCase()}-${run}@example.com`;
  const ids: Record<string, string> = {};
  const tokens: Record<string, string> = {};

  const tenantRoute = (slug: string) => `/api/v1/tenants/${slug}/access-check`;

  async function signIn(name: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: emailOf(name), password: PASSWORD })
      .expect(200);
    return accessTokenSchema.parse(res.body).accessToken;
  }

  function get(path: string, name?: string) {
    const req = request(app.getHttpServer()).get(path);
    return name === undefined
      ? req
      : req.auth(tokens[name] ?? '', { type: 'bearer' });
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule, TenantsModule, AccessModule],
      controllers: [TenantAccessRoutesController],
    }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication<Server>>();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    const tenantA = await prisma.tenant.create({
      data: { slug: slugA, name: 'E2E Access A' },
    });
    await prisma.tenant.create({ data: { slug: slugB, name: 'E2E Access B' } });
    const passwordHash = await app
      .get<PasswordHasher>(PASSWORD_HASHER)
      .hash(PASSWORD);
    const users = {
      admin: { isSuperadmin: true, hosts: false },
      hostA: { isSuperadmin: false, hosts: true },
      formerHost: { isSuperadmin: false, hosts: true },
      deleted: { isSuperadmin: false, hosts: true },
      client: { isSuperadmin: false, hosts: false },
    };
    for (const [name, { isSuperadmin, hosts }] of Object.entries(users)) {
      const user = await prisma.user.create({
        data: {
          email: emailOf(name),
          name,
          passwordHash,
          isSuperadmin,
          memberships: hosts ? { create: { tenantId: tenantA.id } } : undefined,
        },
      });
      ids[name] = user.id;
      tokens[name] = await signIn(name);
    }
  });

  afterAll(async () => {
    await prisma.tenant.deleteMany({ where: { slug: { in: [slugA, slugB] } } });
    await prisma.user.deleteMany({ where: { email: { contains: run } } });
    await app.close();
  });

  describe('on a tenant route', () => {
    it('answers an anonymous caller with 401 before looking at the tenant', async () => {
      const res = await get(tenantRoute(`nowhere-${run}`)).expect(401);
      expectApiError(res, 401, 'AUTHENTICATION_REQUIRED');
    });

    it('answers an unknown tenant with 404 before checking permissions', async () => {
      const res = await get(tenantRoute(`nowhere-${run}`), 'client').expect(
        404,
      );
      expectApiError(res, 404, 'TENANT_NOT_FOUND');
    });

    it('answers a client with 403', async () => {
      const res = await get(tenantRoute(slugA), 'client').expect(403);
      expectApiError(res, 403, 'INSUFFICIENT_PERMISSIONS');
    });

    it('lets a host of this tenant in, with the tenant and user resolved', async () => {
      const res = await get(tenantRoute(slugA), 'hostA').expect(200);
      expect(res.body).toEqual({ tenantSlug: slugA, userId: ids.hostA });
    });

    it('answers a host of another tenant with 403', async () => {
      const res = await get(tenantRoute(slugB), 'hostA').expect(403);
      expectApiError(res, 403, 'INSUFFICIENT_PERMISSIONS');
    });

    it('lets a superadmin into any tenant', async () => {
      const res = await get(tenantRoute(slugB), 'admin').expect(200);
      expect(res.body).toEqual({ tenantSlug: slugB, userId: ids.admin });
    });

    it('denies a handler without @RequirePermissions, even to a superadmin', async () => {
      const res = await get(`${tenantRoute(slugA)}/undeclared`, 'admin').expect(
        403,
      );
      expectApiError(res, 403, 'INSUFFICIENT_PERMISSIONS');
    });
  });

  describe('roles are not in the token (D-007)', () => {
    it('applies a removed membership to the next request, with the same token', async () => {
      await get(tenantRoute(slugA), 'formerHost').expect(200);

      await prisma.tenantMembership.deleteMany({
        where: { userId: ids.formerHost },
      });

      const res = await get(tenantRoute(slugA), 'formerHost').expect(403);
      expectApiError(res, 403, 'INSUFFICIENT_PERMISSIONS');
    });

    it('answers the token of a deleted user with 401 INVALID_TOKEN', async () => {
      await prisma.user.delete({ where: { id: ids.deleted } });

      const res = await get(tenantRoute(slugA), 'deleted').expect(401);
      expectApiError(res, 401, 'INVALID_TOKEN');
    });
  });

  describe('UsersRepository.findAccess', () => {
    it('finds a membership only in the tenant asked about, and none without a tenant', async () => {
      const users = app.get<UsersRepository>(USERS_REPOSITORY);
      const tenantA = await prisma.tenant.findUniqueOrThrow({
        where: { slug: slugA },
      });
      const tenantB = await prisma.tenant.findUniqueOrThrow({
        where: { slug: slugB },
      });
      const hostA = ids.hostA ?? '';

      await expect(users.findAccess(hostA, tenantA.id)).resolves.toEqual({
        isSuperadmin: false,
        isHost: true,
      });
      await expect(users.findAccess(hostA, tenantB.id)).resolves.toEqual({
        isSuperadmin: false,
        isHost: false,
      });
      await expect(users.findAccess(hostA, null)).resolves.toEqual({
        isSuperadmin: false,
        isHost: false,
      });
      await expect(users.findAccess(randomUUID(), null)).resolves.toBeNull();
    });
  });
});
