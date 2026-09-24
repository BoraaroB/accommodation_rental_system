import { Module } from '@nestjs/common';
import { RequestContextModule } from '../request-context/request-context.module.js';
import { AppLoggerService } from './app-logger.service.js';
import { RequestLoggerMiddleware } from './request-logger.middleware.js';

/**
 * Logging: the app-wide logger (level and format from the env, request id on
 * every line) and the one-line-per-request logger, which `app.setup.ts`
 * registers before the body parser.
 */
@Module({
  imports: [RequestContextModule],
  providers: [AppLoggerService, RequestLoggerMiddleware],
})
export class LoggingModule {}
