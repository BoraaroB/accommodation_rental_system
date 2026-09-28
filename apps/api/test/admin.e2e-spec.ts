import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { stripVTControlCharacters } from 'node:util';
import {
  accessTokenSchema,
  addDays,
  addedHostSchema,
  adminTenantSchema,
  apiErrorSchema,
  listingPageSchema,
  parseIsoDate,
  publicTenantSchema,
  RESERVED_TENANT_SLUGS,
  tenantHostSchema,
  today,
  userProfileSchema,
  type AdminTenant,
} from '@ars/shared';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request, { type Response } from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import {
  PASSWORD_HASHER,
  type PasswordHasher,
} from '../src/auth/password-hasher.js';
import type { Env } from '../src/core/config/env.schema.js';
import { PrismaService } from '../src/core/database/prisma.service.js';
import { AppLoggerService } from '../src/core/logging/app-logger.service.js';
import { logLevelsFrom } from '../src/core/logging/log-levels.js';

const PASSWORD = 'e2e-password-1';

function expectApiError(res: Response, statusCode: number, code: string) {
  expect(apiErrorSchema.parse(res.body)).toMatchObject({ statusCode, code });
}

type Method = 'get' | 'patch' | 'post' | 'delete';
type UserName = 'admin' | 'client' | 'hostA' | 'hostB' | 'leaving' | 'guest';

describe('Admin panel (e2e)', () => {
  let app: NestExpressApplication<Server>;
  let prisma: PrismaService;
  const run = randomUUID().slice(0, 8);
  const slugOf = (name: string) => `e2e-admin-${name}-${run}`;
  // E-mails are stored lowercase (users_email_lowercase_check).
  const emailOf = (name: string) =>
    `e2e-admin-${name.toLowerCase()}-${run}@example.com`;
  const ids: Partial<Record<UserName, string>> = {};
  const tokens: Partial<Record<UserName, string>> = {};
  /**
   * A: hosted by hostA and leaving. B: hosted by hostB. Doomed: hosted by
   * hostA, with a listing, a booking and a day hostA blocked — the delete
   * test removes it.
   */
  const tenants = { a: '', b: '', doomed: '' };
  const doomedListingId = randomUUID();

  /** A call as a fixture user, or with a token signed in during a test. */
  function call(
    method: Method,
    path: string,
    as?: UserName | { token: string },
    body?: object,
  ): request.Test {
    let req = request(app.getHttpServer())[method](`/api/v1${path}`);
    if (as !== undefined) {
      const token = typeof as === 'string' ? (tokens[as] ?? '') : as.token;
      req = req.auth(token, { type: 'bearer' });
    }
    return body === undefined ? req : req.send(body);
  }

  const admin = (path = '') => `/admin/tenants${path}`;
  const hosts = (tenantId: string, userId = '') =>
    admin(`/${tenantId}/hosts${userId === '' ? '' : `/${userId}`}`);

  async function signIn(email: string, password: string): Promise<string> {
    const res = await call('post', '/auth/login', undefined, {
      email,
      password,
    }).expect(200);
    return accessTokenSchema.parse(res.body).accessToken;
  }

  /** A tenant created through the API, with only a name and a slug. */
  async function createTenant(name: string): Promise<AdminTenant> {
    const res = await call('post', admin(), 'admin', {
      slug: slugOf(name),
      name: `E2E ${name}`,
    }).expect(201);
    return adminTenantSchema.parse(res.body);
  }

  /**
   * The log lines written while `action` runs. The request log line is
   * written on `finish`, possibly after the client has read the response, so
   * the capture waits for a line containing `until`.
   */
  async function captureLogs(
    action: () => Promise<unknown>,
    until: string,
  ): Promise<string> {
    const logger = app.get(AppLoggerService);
    logger.setLogLevels(logLevelsFrom('log'));
    const stdout = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    const written = () =>
      stdout.mock.calls
        .map(([chunk]) => stripVTControlCharacters(String(chunk)))
        .join('');
    let logs = '';
    try {
      await action();
      await vi.waitFor(() => expect(written()).toContain(until));
    } finally {
      // Read before `mockRestore`, which clears the recorded calls.
      logs = written();
      stdout.mockRestore();
      logger.setLogLevels(
        logLevelsFrom(
          app
            .get<ConfigService<Env, true>>(ConfigService)
            .getOrThrow('LOG_LEVEL', { infer: true }),
        ),
      );
    }
    return logs;
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication<Server>>();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    for (const key of Object.keys(tenants) as (keyof typeof tenants)[]) {
      const tenant = await prisma.tenant.create({
        data: { slug: slugOf(key), name: `E2E Admin ${key}` },
      });
      tenants[key] = tenant.id;
    }

    const passwordHash = await app
      .get<PasswordHasher>(PASSWORD_HASHER)
      .hash(PASSWORD);
    const users: Record<UserName, { hostOf?: string[]; admin?: boolean }> = {
      admin: { admin: true },
      client: {},
      hostA: { hostOf: [tenants.a, tenants.doomed] },
      hostB: { hostOf: [tenants.b] },
      leaving: { hostOf: [tenants.a] },
      guest: {},
    };
    for (const [
      name,
      { hostOf = [], admin: isSuperadmin = false },
    ] of Object.entries(users) as [
      UserName,
      { hostOf?: string[]; admin?: boolean },
    ][]) {
      const user = await prisma.user.create({
        data: {
          email: emailOf(name),
          name,
          passwordHash,
          isSuperadmin,
          memberships: {
            create: hostOf.map((tenantId) => ({ tenantId })),
          },
        },
      });
      ids[name] = user.id;
      tokens[name] = await signIn(emailOf(name), PASSWORD);
    }

    await prisma.listing.create({
      data: {
        id: doomedListingId,
        tenantId: tenants.doomed,
        title: 'Doomed loft',
        city: 'Belgrade',
        country: 'RS',
        latitude: 44.8,
        longitude: 20.46,
        propertyType: 'loft',
        maxGuests: 2,
        bedrooms: 1,
        pricePerNightCents: 10000,
        reviewCount: 0,
        createdAt: parseIsoDate('2025-01-01'),
      },
    });
    await prisma.booking.create({
      data: {
        id: randomUUID(),
        listingId: doomedListingId,
        checkIn: parseIsoDate(addDays(today(), 10)),
        checkOut: parseIsoDate(addDays(today(), 12)),
        guests: 2,
        status: 'confirmed',
        totalCents: 20000,
      },
    });
    await prisma.blockedDay.create({
      data: {
        listingId: doomedListingId,
        day: parseIsoDate(addDays(today(), 20)),
        createdById: ids.hostA ?? '',
      },
    });
  });

  afterAll(async () => {
    // Tenants first: a blocked day keeps its creator from being deleted.
    await prisma.tenant.deleteMany({ where: { slug: { contains: run } } });
    await prisma.user.deleteMany({ where: { email: { contains: run } } });
    await app.close();
  });

  describe('access', () => {
    const newHost = {
      email: emailOf('denied'),
      name: 'Denied',
      password: PASSWORD,
    };
    const routes: [string, Method, () => string, object?][] = [
      ['the tenant list', 'get', () => admin()],
      ['a tenant', 'get', () => admin(`/${tenants.a}`)],
      ['a new tenant', 'post', () => admin(), { slug: 'denied', name: 'X' }],
      ['a tenant edit', 'patch', () => admin(`/${tenants.a}`), { name: 'X' }],
      ['a tenant deletion', 'delete', () => admin(`/${tenants.a}`)],
      ['the host list', 'get', () => hosts(tenants.a)],
      ['a new host', 'post', () => hosts(tenants.a), newHost],
      ['a host removal', 'delete', () => hosts(tenants.a, ids.hostA ?? '')],
    ];

    it.each(routes)(
      'answers an anonymous caller on %s with 401',
      async (_route, method, path, body) => {
        const res = await call(method, path(), undefined, body).expect(401);
        expectApiError(res, 401, 'AUTHENTICATION_REQUIRED');
      },
    );

    it.each(routes)(
      'answers a client on %s with 403',
      async (_route, method, path, body) => {
        const res = await call(method, path(), 'client', body).expect(403);
        expectApiError(res, 403, 'INSUFFICIENT_PERMISSIONS');
      },
    );

    it.each(routes)(
      'answers a host on %s of their own tenant with 403',
      async (_route, method, path, body) => {
        const res = await call(method, path(), 'hostA', body).expect(403);
        expectApiError(res, 403, 'INSUFFICIENT_PERMISSIONS');
      },
    );

    it('changed nothing', async () => {
      const a = await prisma.tenant.findUniqueOrThrow({
        where: { id: tenants.a },
      });
      expect(a.name).toBe('E2E Admin a');
      expect(await prisma.tenant.count({ where: { slug: 'denied' } })).toBe(0);
      expect(
        await prisma.user.count({ where: { email: emailOf('denied') } }),
      ).toBe(0);
      expect(
        await prisma.tenantMembership.count({
          where: { userId: ids.hostA, tenantId: tenants.a },
        }),
      ).toBe(1);
    });
  });

  describe('tenants', () => {
    it('lists every tenant with its id, ordered by slug', async () => {
      const res = await call('get', admin(), 'admin').expect(200);

      const list = z.array(adminTenantSchema.strict()).parse(res.body);
      const slugs = list.map((tenant) => tenant.slug);
      expect(slugs).toEqual([...slugs].sort());
      expect(list).toContainEqual({
        id: tenants.a,
        slug: slugOf('a'),
        name: 'E2E Admin a',
        logoUrl: null,
        primaryColor: null,
        contactEmail: null,
        currency: 'EUR',
      });
    });

    it('returns one tenant by id', async () => {
      const res = await call('get', admin(`/${tenants.b}`), 'admin').expect(
        200,
      );
      expect(adminTenantSchema.strict().parse(res.body)).toMatchObject({
        id: tenants.b,
        slug: slugOf('b'),
      });
    });

    it('creates a tenant whose portal works at once', async () => {
      const config = {
        slug: slugOf('new'),
        name: 'E2E New Portal',
        logoUrl: 'https://cdn.example.com/new.png',
        primaryColor: '#0A7C8B',
        contactEmail: 'Hello@Example.com',
      };

      const res = await call('post', admin(), 'admin', config).expect(201);

      const created = adminTenantSchema.strict().parse(res.body);
      const branding = {
        slug: config.slug,
        name: config.name,
        logoUrl: config.logoUrl,
        primaryColor: '#0a7c8b',
        contactEmail: 'hello@example.com',
        currency: 'EUR',
      };
      expect(created).toEqual({ id: expect.any(String), ...branding });

      const portals = await call('get', '/tenants').expect(200);
      expect(portals.body).toContainEqual(branding);
      const portal = await call('get', `/tenants/${config.slug}`).expect(200);
      expect(publicTenantSchema.strict().parse(portal.body)).toEqual(branding);
      const listings = await call(
        'get',
        `/tenants/${config.slug}/listings`,
      ).expect(200);
      expect(listingPageSchema.parse(listings.body)).toMatchObject({
        items: [],
        total: 0,
      });
      const cities = await call('get', `/tenants/${config.slug}/cities`).expect(
        200,
      );
      expect(cities.body).toEqual([]);
    });

    it('answers a taken slug with 409 SLUG_TAKEN and writes nothing', async () => {
      const res = await call('post', admin(), 'admin', {
        slug: slugOf('b'),
        name: `E2E Duplicate ${run}`,
      }).expect(409);

      expectApiError(res, 409, 'SLUG_TAKEN');
      expect(
        await prisma.tenant.count({ where: { name: `E2E Duplicate ${run}` } }),
      ).toBe(0);
    });

    it.each(RESERVED_TENANT_SLUGS)(
      'answers the reserved slug %j with 400 and writes nothing',
      async (slug) => {
        const name = `E2E Reserved ${run}`;
        const res = await call('post', admin(), 'admin', { slug, name }).expect(
          400,
        );

        expectApiError(res, 400, 'BAD_REQUEST');
        expect(await prisma.tenant.count({ where: { name } })).toBe(0);
      },
    );

    it('keeps the reserved words off the portal routes', async () => {
      const res = await call('get', '/tenants/admin').expect(404);
      expectApiError(res, 404, 'TENANT_NOT_FOUND');
    });

    it('answers an invalid configuration with 400', async () => {
      // The rules themselves are covered by the schema's tests.
      const res = await call('post', admin(), 'admin', {
        slug: slugOf('invalid'),
        name: 'E2E Invalid',
        primaryColor: 'teal',
      }).expect(400);
      expectApiError(res, 400, 'BAD_REQUEST');
    });

    it.each([
      ['get', undefined],
      ['patch', { name: 'X' }],
      ['delete', undefined],
    ] as const)(
      'answers %s of an unknown tenant with 404',
      async (method, body) => {
        const res = await call(
          method,
          admin(`/${randomUUID()}`),
          'admin',
          body,
        ).expect(404);
        expectApiError(res, 404, 'TENANT_NOT_FOUND');
      },
    );

    it('answers an id that is not a uuid with 400', async () => {
      const res = await call('get', admin('/adriatic'), 'admin').expect(400);
      expectApiError(res, 400, 'BAD_REQUEST');
    });
  });

  describe('tenant edits', () => {
    it('changes only the fields that were sent, and the portal shows them', async () => {
      const tenant = await createTenant('edit');

      const res = await call('patch', admin(`/${tenant.id}`), 'admin', {
        primaryColor: '#112233',
        contactEmail: 'desk@example.com',
      }).expect(200);

      const edited = {
        ...tenant,
        primaryColor: '#112233',
        contactEmail: 'desk@example.com',
      };
      expect(adminTenantSchema.strict().parse(res.body)).toEqual(edited);
      const portal = await call('get', `/tenants/${tenant.slug}`).expect(200);
      expect(portal.body).toMatchObject({
        name: tenant.name,
        primaryColor: '#112233',
      });
    });

    it('clears an optional field with null', async () => {
      const tenant = await createTenant('clear');
      await call('patch', admin(`/${tenant.id}`), 'admin', {
        logoUrl: 'https://cdn.example.com/clear.png',
      }).expect(200);

      const res = await call('patch', admin(`/${tenant.id}`), 'admin', {
        logoUrl: null,
      }).expect(200);

      expect(res.body).toMatchObject({ logoUrl: null, name: tenant.name });
    });

    it('answers an edit without a known field with 400', async () => {
      const res = await call('patch', admin(`/${tenants.a}`), 'admin', {
        currency: 'USD',
      }).expect(400);
      expectApiError(res, 400, 'BAD_REQUEST');
    });

    it('keeps its own slug without a conflict', async () => {
      const res = await call('patch', admin(`/${tenants.b}`), 'admin', {
        slug: slugOf('b'),
      }).expect(200);
      expect(res.body).toMatchObject({ slug: slugOf('b') });
    });

    it("answers another tenant's slug with 409 SLUG_TAKEN", async () => {
      const res = await call('patch', admin(`/${tenants.a}`), 'admin', {
        slug: slugOf('b'),
      }).expect(409);

      expectApiError(res, 409, 'SLUG_TAKEN');
      const a = await prisma.tenant.findUniqueOrThrow({
        where: { id: tenants.a },
      });
      expect(a.slug).toBe(slugOf('a'));
    });

    it('answers a reserved slug with 400', async () => {
      const res = await call('patch', admin(`/${tenants.a}`), 'admin', {
        slug: 'register',
      }).expect(400);
      expectApiError(res, 400, 'BAD_REQUEST');
    });

    it('moves the portal to a new slug', async () => {
      const tenant = await createTenant('move');

      await call('patch', admin(`/${tenant.id}`), 'admin', {
        slug: slugOf('moved'),
      }).expect(200);

      await call('get', `/tenants/${slugOf('moved')}`).expect(200);
      const old = await call('get', `/tenants/${tenant.slug}`).expect(404);
      expectApiError(old, 404, 'TENANT_NOT_FOUND');
    });
  });

  describe('tenant deletion', () => {
    it('deletes the tenant with its data; its host keeps the account', async () => {
      await call('delete', admin(`/${tenants.doomed}`), 'admin').expect(204);

      const where = { listingId: doomedListingId };
      expect(
        await prisma.listing.count({ where: { id: doomedListingId } }),
      ).toBe(0);
      expect(await prisma.booking.count({ where })).toBe(0);
      expect(await prisma.blockedDay.count({ where })).toBe(0);
      expect(
        await prisma.tenantMembership.count({
          where: { tenantId: tenants.doomed },
        }),
      ).toBe(0);

      const token = await signIn(emailOf('hostA'), PASSWORD);
      const me = await call('get', '/auth/me', { token }).expect(200);
      const hosted = userProfileSchema
        .parse(me.body)
        .hostOf.map((tenant) => tenant.slug);
      expect(hosted).toContain(slugOf('a'));
      expect(hosted).not.toContain(slugOf('doomed'));
      const portal = await call('get', `/tenants/${slugOf('doomed')}`).expect(
        404,
      );
      expectApiError(portal, 404, 'TENANT_NOT_FOUND');
      const again = await call(
        'delete',
        admin(`/${tenants.doomed}`),
        'admin',
      ).expect(404);
      expectApiError(again, 404, 'TENANT_NOT_FOUND');
    });
  });

  describe('hosts', () => {
    it("lists the tenant's hosts, ordered by e-mail", async () => {
      const res = await call('get', hosts(tenants.a), 'admin').expect(200);

      const list = z.array(tenantHostSchema.strict()).parse(res.body);
      const emails = list.map((host) => host.email);
      expect(emails).toEqual([...emails].sort());
      expect(list).toContainEqual({
        id: ids.hostA,
        email: emailOf('hostA'),
        name: 'hostA',
      });
      expect(emails).not.toContain(emailOf('hostB'));
    });

    it('creates an account for a new e-mail; the host signs in to the panel', async () => {
      const input = {
        email: emailOf('fresh'),
        name: 'Fresh Host',
        password: 'fresh-password-1',
      };

      const res = await call('post', hosts(tenants.a), 'admin', input).expect(
        201,
      );

      const added = addedHostSchema.strict().parse(res.body);
      expect(added).toMatchObject({
        email: input.email,
        name: input.name,
        accountCreated: true,
      });
      const token = await signIn(input.email, input.password);
      const me = await call('get', '/auth/me', { token }).expect(200);
      expect(userProfileSchema.parse(me.body).hostOf).toEqual([
        { slug: slugOf('a'), name: 'E2E Admin a' },
      ]);
      await call('get', `/tenants/${slugOf('a')}/host/listings`, {
        token,
      }).expect(200);
    });

    it('makes an existing account a host without changing its name or password', async () => {
      const res = await call('post', hosts(tenants.a), 'admin', {
        email: emailOf('guest').toUpperCase(),
        name: 'Renamed Guest',
        password: 'another-password-1',
      }).expect(201);

      expect(addedHostSchema.strict().parse(res.body)).toEqual({
        id: ids.guest,
        email: emailOf('guest'),
        name: 'guest',
        accountCreated: false,
      });
      await signIn(emailOf('guest'), PASSWORD);
      await call('post', '/auth/login', undefined, {
        email: emailOf('guest'),
        password: 'another-password-1',
      }).expect(401);
      await call(
        'get',
        `/tenants/${slugOf('a')}/host/listings`,
        'guest',
      ).expect(200);
    });

    it('answers an account that already hosts the tenant with 409 ALREADY_HOST', async () => {
      const res = await call('post', hosts(tenants.b), 'admin', {
        email: emailOf('hostB'),
        name: 'hostB',
        password: PASSWORD,
      }).expect(409);
      expectApiError(res, 409, 'ALREADY_HOST');
    });

    it('lets one account host several tenants', async () => {
      await call('post', hosts(tenants.b), 'admin', {
        email: emailOf('hostA'),
        name: 'hostA',
        password: PASSWORD,
      }).expect(201);

      const me = await call('get', '/auth/me', 'hostA').expect(200);
      expect(
        userProfileSchema.parse(me.body).hostOf.map((tenant) => tenant.slug),
      ).toEqual(expect.arrayContaining([slugOf('a'), slugOf('b')]));
    });

    it('logs the new host without the e-mail or the password', async () => {
      const password = `secret-${run}-password`;
      const path = hosts(tenants.b);

      const logs = await captureLogs(
        () =>
          call('post', path, 'admin', {
            email: emailOf('logged'),
            name: 'Logged Host',
            password,
          }).expect(201),
        `POST /api/v1${path} 201`,
      );

      expect(logs).toContain(`added to tenant ${tenants.b} (new account)`);
      expect(logs).not.toContain(password);
      expect(logs).not.toContain(emailOf('logged'));
    });

    it('answers a password shorter than 8 characters with 400', async () => {
      const res = await call('post', hosts(tenants.a), 'admin', {
        email: emailOf('invalid'),
        name: 'Invalid',
        password: 'short',
      }).expect(400);
      expectApiError(res, 400, 'BAD_REQUEST');
    });

    it.each([
      ['get', () => hosts(randomUUID())],
      ['post', () => hosts(randomUUID())],
      ['delete', () => hosts(randomUUID(), ids.hostA ?? '')],
    ] as const)(
      'answers %s on an unknown tenant with 404',
      async (method, path) => {
        const body =
          method === 'post'
            ? { email: emailOf('nowhere'), name: 'X', password: PASSWORD }
            : undefined;
        const res = await call(method, path(), 'admin', body).expect(404);
        expectApiError(res, 404, 'TENANT_NOT_FOUND');
      },
    );

    it('answers a user id that is not a uuid with 400', async () => {
      const res = await call(
        'delete',
        hosts(tenants.a, 'someone'),
        'admin',
      ).expect(400);
      expectApiError(res, 400, 'BAD_REQUEST');
    });

    it('removes a host; the account stays and loses the panel at once', async () => {
      const leaving = ids.leaving ?? '';
      await call(
        'get',
        `/tenants/${slugOf('a')}/host/listings`,
        'leaving',
      ).expect(200);

      await call('delete', hosts(tenants.a, leaving), 'admin').expect(204);

      expect(await prisma.user.count({ where: { id: leaving } })).toBe(1);
      // The same token: roles are not in it (D-007).
      await call(
        'get',
        `/tenants/${slugOf('a')}/host/listings`,
        'leaving',
      ).expect(403);
      const again = await call(
        'delete',
        hosts(tenants.a, leaving),
        'admin',
      ).expect(404);
      expectApiError(again, 404, 'HOST_NOT_FOUND');
    });

    it('answers a user who hosts only another tenant with 404 HOST_NOT_FOUND', async () => {
      const res = await call(
        'delete',
        hosts(tenants.a, ids.hostB ?? ''),
        'admin',
      ).expect(404);

      expectApiError(res, 404, 'HOST_NOT_FOUND');
      expect(
        await prisma.tenantMembership.count({
          where: { userId: ids.hostB, tenantId: tenants.b },
        }),
      ).toBe(1);
    });
  });
});
