import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { apiErrorSchema } from '@ars/shared';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request, { type Response } from 'supertest';
import { Logger } from '@nestjs/common';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { DatabaseModule } from '../src/core/database/database.module.js';
import { PrismaService } from '../src/core/database/prisma.service.js';
import { PrismaErrorRoutesController } from './prisma-error-routes.controller.js';

/** The body is an `apiErrorSchema` error with the header's request id and no database details. */
function expectApiError(res: Response, statusCode: number, code: string) {
  const body = apiErrorSchema.parse(res.body);
  expect(body).toMatchObject({ statusCode, code });
  expect(body.requestId).toBe(res.headers['x-request-id']);
  expect(body.message).not.toMatch(/prisma|constraint|P20|tenants|slug|email/i);
}

describe('Prisma errors over HTTP (e2e)', () => {
  let app: NestExpressApplication<Server>;
  const run = randomUUID().slice(0, 8);
  const slug = `e2e-http-${run}`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule, DatabaseModule],
      controllers: [PrismaErrorRoutesController],
    }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication<Server>>();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    const prisma = app.get(PrismaService);
    await prisma.tenant.deleteMany({ where: { slug } });
    await prisma.user.deleteMany({ where: { email: { contains: run } } });
    await app.close();
  });

  it('answers a unique violation with 409 UNIQUE_VIOLATION', async () => {
    const server = app.getHttpServer();
    await request(server)
      .post(`/api/v1/prisma-errors/tenants/${slug}`)
      .expect(201);

    const res = await request(server)
      .post(`/api/v1/prisma-errors/tenants/${slug}`)
      .expect(409);

    expectApiError(res, 409, 'UNIQUE_VIOLATION');
  });

  it('answers a missing record with 404 NOT_FOUND', async () => {
    const res = await request(app.getHttpServer())
      .patch('/api/v1/prisma-errors/missing-tenant')
      .expect(404);

    expectApiError(res, 404, 'NOT_FOUND');
  });

  it('answers a missing foreign key with 409 FOREIGN_KEY_VIOLATION', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/prisma-errors/orphan-booking')
      .expect(409);

    expectApiError(res, 409, 'FOREIGN_KEY_VIOLATION');
  });

  describe('rejected writes that become a 500', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    // The rejected row (for a CHECK) or the call's arguments (for a validation
    // error) must not reach the log: they hold the password hash.
    it.each([`users/${run}`, `nameless-users/${run}`])(
      'POST /api/v1/prisma-errors/%s logs no row values',
      async (route) => {
        const logError = vi
          .spyOn(Logger.prototype, 'error')
          .mockImplementation(() => undefined);

        const res = await request(app.getHttpServer())
          .post(`/api/v1/prisma-errors/${route}`)
          .expect(500);

        expectApiError(res, 500, 'INTERNAL_SERVER_ERROR');
        expect(logError).toHaveBeenCalled();
        expect(JSON.stringify(logError.mock.calls)).not.toMatch(
          /not-a-real-hash|example\.test/i,
        );
      },
    );
  });

  it('answers a CHECK violation with a 500 that names no constraint', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/prisma-errors/users/${run}`)
      .expect(500);

    expectApiError(res, 500, 'INTERNAL_SERVER_ERROR');
    expect(res.body.message).toBe('Internal server error');
  });
});
