import { Module } from '@nestjs/common';
import { AppConfigModule } from './core/config/config.module.js';
import { ErrorsModule } from './core/errors/errors.module.js';
import { LoggingModule } from './core/logging/logging.module.js';
import { RequestContextModule } from './core/request-context/request-context.module.js';
import { HealthModule } from './health/health.module.js';

/**
 * The table of contents of the API: it only imports modules.
 * `core/*` is infrastructure every request goes through; features follow.
 */
@Module({
  imports: [
    // Infrastructure
    AppConfigModule,
    RequestContextModule,
    LoggingModule,
    ErrorsModule,
    // Features
    HealthModule,
  ],
})
export class AppModule {}
