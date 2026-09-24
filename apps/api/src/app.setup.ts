import { VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { API_DEFAULT_VERSION, API_PREFIX } from './api.constants.js';
import type { Env } from './core/config/env.schema.js';
import { AppLoggerService } from './core/logging/app-logger.service.js';
import { RequestLoggerMiddleware } from './core/logging/request-logger.middleware.js';
import { RequestIdMiddleware } from './core/request-context/request-id.middleware.js';

/**
 * App-level setup shared by `main.ts` and the e2e tests, so the tests run the
 * same routes, middleware, logger and CORS policy as the real server.
 * Call it before `init()` / `listen()`.
 */
export function configureApp(app: NestExpressApplication): void {
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  app.useLogger(app.get(AppLoggerService));
  // Do not advertise the framework in every response.
  // Possible improvement (not in the plan): standard security headers with `helmet`.
  app.disable('x-powered-by');

  // Registered with `app.use` before `init()`, so they run first for every
  // request — before CORS and the body parser, whose errors then also get a
  // request id and a log line. The instances come from the DI container
  // (RequestContextModule, LoggingModule).
  const requestId = app.get(RequestIdMiddleware);
  const requestLogger = app.get(RequestLoggerMiddleware);
  app.use(requestId.use.bind(requestId), requestLogger.use.bind(requestLogger));

  // Nest mounts its not-found handler under this prefix, so paths outside
  // `/api` get Express's default HTML 404. Possible improvement: a JSON
  // fallback for them — in Docker only `/api` reaches the API.
  app.setGlobalPrefix(API_PREFIX);
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: API_DEFAULT_VERSION,
  });
  app.enableCors({ origin: config.getOrThrow('CORS_ORIGIN', { infer: true }) });
}
