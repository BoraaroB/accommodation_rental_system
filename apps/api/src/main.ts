import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';
import type { Env } from './core/config/env.schema.js';

async function bootstrap(): Promise<void> {
  // `abortOnError: false` makes a failed start (e.g. an invalid env) reject
  // here instead of exiting inside Nest, so it is logged as fatal below.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    abortOnError: false,
  });
  configureApp(app);
  // Close providers cleanly on SIGTERM / SIGINT (e.g. `docker stop`), so
  // modules holding connections can release them in their shutdown hooks.
  app.enableShutdownHooks();

  const port = app
    .get<ConfigService<Env, true>>(ConfigService)
    .getOrThrow('PORT', { infer: true });
  await app.listen(port);
  Logger.log(`Listening on port ${port}`, 'Bootstrap');
}

bootstrap().catch((error: unknown) => {
  Logger.fatal(
    error instanceof Error ? error.message : String(error),
    'Bootstrap',
  );
  process.exit(1);
});
