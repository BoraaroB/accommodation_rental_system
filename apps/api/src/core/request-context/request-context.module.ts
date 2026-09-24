import {
  type MiddlewareConsumer,
  Module,
  type NestModule,
} from '@nestjs/common';
import { RequestContextMiddleware } from './request-context.middleware.js';
import { RequestContextService } from './request-context.service.js';
import { RequestIdMiddleware } from './request-id.middleware.js';

/**
 * Request id and per-request context. `RequestIdMiddleware` runs before the
 * body parser (registered in `app.setup.ts`); `RequestContextMiddleware` runs
 * after it and is applied here.
 */
@Module({
  providers: [
    RequestContextService,
    RequestIdMiddleware,
    RequestContextMiddleware,
  ],
  exports: [RequestContextService],
})
export class RequestContextModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // `{*splat}` matches every path (Express 5 / path-to-regexp 8 syntax).
    consumer.apply(RequestContextMiddleware).forRoutes('{*splat}');
  }
}
