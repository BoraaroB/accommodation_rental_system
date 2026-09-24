import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { stripVTControlCharacters } from 'node:util';
import {
  accessTokenSchema,
  apiErrorSchema,
  userProfileSchema,
} from '@ars/shared';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request, { type Response } from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import type { Env } from '../src/core/config/env.schema.js';
import { PrismaService } from '../src/core/database/prisma.service.js';
import { AppLoggerService } from '../src/core/logging/app-logger.service.js';
import { logLevelsFrom } from '../src/core/logging/log-levels.js';

const PASSWORD = 'correct-horse-battery';

function expectApiError(res: Response, statusCode: number, code: string) {
  return expect(apiErrorSchema.parse(res.body)).toMatchObject({
    statusCode,
    code,
  });
}

function claimsOf(token: string): Record<string, unknown> {
  const [, payload = ''] = token.split('.');
  return JSON.parse(Buffer.from(payload, 'base64url').toString()) as Record<
    string,
    unknown
  >;
}

describe('Auth (e2e)', () => {
  let app: NestExpressApplication<Server>;
  let prisma: PrismaService;
  const run = randomUUID().slice(0, 8);
  const email = `e2e-auth-${run}@example.com`;
  const slug = `e2e-auth-${run}`;

  const register = (body: object) =>
    request(app.getHttpServer()).post('/api/v1/auth/register').send(body);
  const login = (body: object) =>
    request(app.getHttpServer()).post('/api/v1/auth/login').send(body);
  const me = (token?: string) => {
    const req = request(app.getHttpServer()).get('/api/v1/auth/me');
    return token === undefined ? req : req.auth(token, { type: 'bearer' });
  };

  async function signIn(address = email): Promise<string> {
    const res = await login({ email: address, password: PASSWORD }).expect(200);
    return accessTokenSchema.parse(res.body).accessToken;
  }

  /**
   * Everything written to stdout while `action` runs, with `log` enabled. The
   * request line is written when the response closes, which can be after the
   * client has read it, so the capture waits for a line containing `until`.
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

    // The account every test signs in with.
    await register({ email, password: PASSWORD, name: 'E2E Guest' }).expect(
      201,
    );
  });

  afterAll(async () => {
    await prisma.tenant.deleteMany({ where: { slug } });
    await prisma.user.deleteMany({ where: { email: { contains: run } } });
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('creates a client and returns its profile, without a token', async () => {
      const res = await register({
        email: `  New-${run}@Example.COM `,
        password: PASSWORD,
        name: '  New Guest ',
      }).expect(201);

      const profile = userProfileSchema.strict().parse(res.body);
      expect(profile).toMatchObject({
        email: `new-${run}@example.com`,
        name: 'New Guest',
        isSuperadmin: false,
        hostOf: [],
      });
      const stored = await prisma.user.findUniqueOrThrow({
        where: { id: profile.id },
      });
      expect(stored.email).toBe(`new-${run}@example.com`);
      expect(stored.passwordHash).not.toContain(PASSWORD);
    });

    it('never creates a superadmin', async () => {
      const res = await register({
        email: `climber-${run}@example.com`,
        password: PASSWORD,
        name: 'Climber',
        isSuperadmin: true,
      }).expect(201);

      expect(res.body.isSuperadmin).toBe(false);
      const stored = await prisma.user.findUniqueOrThrow({
        where: { id: res.body.id as string },
      });
      expect(stored.isSuperadmin).toBe(false);
    });

    it('answers an e-mail in use, in any case, with 409 EMAIL_TAKEN', async () => {
      const res = await register({
        email: email.toUpperCase(),
        password: PASSWORD,
        name: 'Twin',
      }).expect(409);
      expectApiError(res, 409, 'EMAIL_TAKEN');
    });

    it('answers invalid input with 400 and one message per field, without echoing the password', async () => {
      const res = await register({
        email: 'not-an-email',
        password: 'short',
        name: '',
      }).expect(400);

      expectApiError(res, 400, 'BAD_REQUEST');
      const { message } = apiErrorSchema.parse(res.body);
      expect(message).toEqual([
        expect.stringMatching(/^email: /),
        expect.stringMatching(/^password: /),
        expect.stringMatching(/^name: /),
      ]);
      expect(JSON.stringify(res.body)).not.toContain('short');
    });

    it('answers a missing body with 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .expect(400);
      expectApiError(res, 400, 'BAD_REQUEST');
    });
  });

  describe('POST /auth/login', () => {
    it('returns an access token that holds identity only', async () => {
      const res = await login({ email, password: PASSWORD }).expect(200);

      const { accessToken } = accessTokenSchema.strict().parse(res.body);
      const claims = claimsOf(accessToken);
      expect(Object.keys(claims).sort()).toEqual([
        'email',
        'exp',
        'iat',
        'sub',
      ]);
      expect(claims.email).toBe(email);
    });

    it('accepts the e-mail in any case', async () => {
      await login({
        email: ` ${email.toUpperCase()}`,
        password: PASSWORD,
      }).expect(200);
    });

    it('answers a wrong password and an unknown e-mail alike, with 401', async () => {
      const wrongPassword = await login({
        email,
        password: 'wrong-horse-battery',
      }).expect(401);
      const unknownEmail = await login({
        email: `nobody-${run}@example.com`,
        password: PASSWORD,
      }).expect(401);

      expectApiError(wrongPassword, 401, 'INVALID_CREDENTIALS');
      expect(unknownEmail.body.code).toBe(wrongPassword.body.code);
      expect(unknownEmail.body.message).toBe(wrongPassword.body.message);
    });

    it('logs a failed sign-in with the e-mail, never the password', async () => {
      const logs = await captureLogs(
        () => login({ email, password: 'wrong-horse-battery' }).expect(401),
        'POST /api/v1/auth/login 401',
      );

      expect(logs).toContain(`Failed sign-in for ${email}`);
      expect(logs).not.toContain('wrong-horse-battery');
    });

    it('answers invalid input with 400', async () => {
      const res = await login({ email: 'not-an-email' }).expect(400);
      expectApiError(res, 400, 'BAD_REQUEST');
    });
  });

  describe('GET /auth/me', () => {
    it("returns the signed-in client's profile", async () => {
      const res = await me(await signIn()).expect(200);

      expect(userProfileSchema.strict().parse(res.body)).toMatchObject({
        email,
        name: 'E2E Guest',
        isSuperadmin: false,
        hostOf: [],
      });
    });

    it('lists the tenants a host hosts', async () => {
      const user = await prisma.user.findUniqueOrThrow({ where: { email } });
      await prisma.tenant.create({
        data: {
          slug,
          name: 'E2E Auth Stays',
          memberships: { create: { userId: user.id } },
        },
      });
      try {
        const res = await me(await signIn()).expect(200);
        expect(res.body.hostOf).toEqual([{ slug, name: 'E2E Auth Stays' }]);
      } finally {
        await prisma.tenant.delete({ where: { slug } });
      }
    });

    it.each([
      ['no token', undefined, 'AUTHENTICATION_REQUIRED'],
      ['a malformed token', 'not-a-jwt', 'INVALID_TOKEN'],
    ])('answers %s with 401', async (_case, token, code) => {
      const res = await me(token).expect(401);
      expectApiError(res, 401, code);
    });

    it('answers a tampered token with 401 INVALID_TOKEN', async () => {
      const token = await signIn();
      const [header, , signature] = token.split('.');
      const claims = { ...claimsOf(token), email: 'admin@example.com' };
      const forged = Buffer.from(JSON.stringify(claims)).toString('base64url');

      const res = await me(`${header}.${forged}.${signature}`).expect(401);
      expectApiError(res, 401, 'INVALID_TOKEN');
    });

    it('accepts HS256 only: another algorithm, even with the right secret, is a 401', async () => {
      const user = await prisma.user.findUniqueOrThrow({ where: { email } });
      const claims = { sub: user.id, email };
      const secret = app
        .get<ConfigService<Env, true>>(ConfigService)
        .getOrThrow('JWT_SECRET', { infer: true });
      const hs512 = await new JwtService({ secret }).signAsync(claims, {
        algorithm: 'HS512',
      });
      const encode = (value: object) =>
        Buffer.from(JSON.stringify(value)).toString('base64url');
      const unsigned = `${encode({ alg: 'none', typ: 'JWT' })}.${encode(claims)}.`;

      for (const token of [hs512, unsigned]) {
        const res = await me(token).expect(401);
        expectApiError(res, 401, 'INVALID_TOKEN');
      }
    });

    it('answers the token of a deleted user with 401 INVALID_TOKEN', async () => {
      const gone = `gone-${run}@example.com`;
      await register({ email: gone, password: PASSWORD, name: 'Gone' }).expect(
        201,
      );
      const token = await signIn(gone);
      await prisma.user.delete({ where: { email: gone } });

      const res = await me(token).expect(401);
      expectApiError(res, 401, 'INVALID_TOKEN');
    });

    it('logs the user id with the request, never the token', async () => {
      const token = await signIn();
      const user = await prisma.user.findUniqueOrThrow({ where: { email } });

      const logs = await captureLogs(
        () => me(token).expect(200),
        'GET /api/v1/auth/me 200',
      );

      expect(logs).toContain('GET /api/v1/auth/me 200');
      expect(logs).toContain(user.id);
      expect(logs).not.toContain(token);
      expect(logs).not.toMatch(/authorization/i);
    });
  });
});
