import type { Server } from 'node:http';
import { stripVTControlCharacters } from 'node:util';
import { apiErrorSchema } from '@ars/shared';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../src/app.module.js';
import type { Env } from '../src/core/config/env.schema.js';
import { AppLoggerService } from '../src/core/logging/app-logger.service.js';
import { logLevelsFrom } from '../src/core/logging/log-levels.js';
import { configureApp } from '../src/app.setup.js';
import { TestRoutesController } from './test-routes.controller.js';

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('API bootstrap (e2e)', () => {
  let app: NestExpressApplication<Server>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [TestRoutesController],
    }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication<Server>>();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('routing', () => {
    it('serves the health check unversioned at /api/health', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200);
      expect(res.body).toEqual({ status: 'ok' });
    });

    it('does not advertise the framework', async () => {
      const res = await request(app.getHttpServer()).get('/api/health');
      expect(res.headers['x-powered-by']).toBeUndefined();
    });

    it('serves regular routes under /api/v1', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/test-routes')
        .expect(200);
      expect(res.body).toEqual({ status: 'ok' });
    });

    it.each([
      '/api/test-routes',
      '/api/v2/test-routes',
      '/api/v1/health',
      '/api/listings',
    ])('returns 404 in the error format for %s', async (path) => {
      const res = await request(app.getHttpServer()).get(path).expect(404);
      expect(apiErrorSchema.parse(res.body)).toMatchObject({
        statusCode: 404,
        error: 'Not Found',
        code: 'NOT_FOUND',
        path,
      });
    });
  });

  describe('errors', () => {
    it('returns an error code from the exception', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/test-routes/conflict')
        .expect(409);
      expect(apiErrorSchema.parse(res.body)).toMatchObject({
        code: 'DAY_ALREADY_BOOKED',
        message: '2026-10-02 is booked',
      });
    });

    it('hides the details of an unexpected error', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/test-routes/crash')
        .expect(500);
      expect(apiErrorSchema.parse(res.body)).toMatchObject({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
      });
      expect(res.text).not.toContain('ECONNREFUSED');
      expect(res.text).not.toContain('test-routes.controller');
    });
  });

  describe('errors raised before the route handler', () => {
    it('keeps the status of a body-parser error and gives it a request id', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/test-routes/echo')
        .set('Content-Type', 'application/json')
        .send('{"broken":');
      expect(res.status).toBe(400);
      expect(apiErrorSchema.parse(res.body)).toMatchObject({
        code: 'BAD_REQUEST',
        requestId: res.headers['x-request-id'],
      });
    });

    it('returns 413 for a body over the size limit', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/test-routes/echo')
        .send({ padding: 'x'.repeat(200_000) });
      expect(res.status).toBe(413);
      expect(apiErrorSchema.parse(res.body).code).toBe('PAYLOAD_TOO_LARGE');
    });
  });

  describe('request id', () => {
    it('generates a request id and returns it in the header', async () => {
      const res = await request(app.getHttpServer()).get('/api/health');
      expect(res.headers['x-request-id']).toMatch(UUID);
    });

    it('uses the same id in the header and the error body', async () => {
      const res = await request(app.getHttpServer()).get('/api/nope');
      expect(res.body.requestId).toBe(res.headers['x-request-id']);
      expect(res.body.requestId).toMatch(UUID);
    });

    it("keeps the client's id when it is well formed", async () => {
      const res = await request(app.getHttpServer())
        .get('/api/nope')
        .set('x-request-id', 'client-trace-42');
      expect(res.headers['x-request-id']).toBe('client-trace-42');
      expect(res.body.requestId).toBe('client-trace-42');
    });

    it('does not echo the query string in the error path', async () => {
      const res = await request(app.getHttpServer()).get('/api/nope?token=abc');
      expect(res.body.path).toBe('/api/nope');
    });

    it('adds the request id to lines logged while handling the request', async () => {
      // Enable `log` for this test only, whatever LOG_LEVEL the env sets.
      const logger = app.get(AppLoggerService);
      logger.setLogLevels(logLevelsFrom('log'));
      const stdout = vi
        .spyOn(process.stdout, 'write')
        .mockImplementation(() => true);
      let written: string[];
      try {
        await request(app.getHttpServer())
          .get('/api/v1/test-routes/log')
          .set('x-request-id', 'trace-log-1')
          .expect(200);
      } finally {
        written = stdout.mock.calls.map(([chunk]) =>
          stripVTControlCharacters(String(chunk)),
        );
        stdout.mockRestore();
        logger.setLogLevels(
          logLevelsFrom(
            app
              .get<ConfigService<Env, true>>(ConfigService)
              .getOrThrow('LOG_LEVEL', { infer: true }),
          ),
        );
      }
      const line = written.find((text) => text.includes('test log line'));
      expect(line).toContain("requestId: 'trace-log-1'");
    });

    it("replaces the client's id when it is malformed", async () => {
      const res = await request(app.getHttpServer())
        .get('/api/health')
        .set('x-request-id', '<script>alert(1)</script>');
      expect(res.headers['x-request-id']).toMatch(UUID);
    });
  });

  describe('CORS', () => {
    it('allows the configured origin', async () => {
      const [origin] = process.env.CORS_ORIGIN?.split(',') ?? [];
      const res = await request(app.getHttpServer())
        .get('/api/health')
        .set('Origin', origin ?? '');
      expect(res.headers['access-control-allow-origin']).toBe(origin);
    });

    it('does not allow another origin', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/health')
        .set('Origin', 'https://evil.example.com');
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });
  });
});
