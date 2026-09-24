import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { RequestContextService } from './request-context.service.js';
import { readRequestId } from './request-id.js';

/**
 * Runs the rest of the request (guards, handlers, services) inside a request
 * context that carries the request id. Bound as Nest middleware, i.e. after
 * the body parser: a context entered earlier does not survive the parser's
 * asynchronous stream callbacks.
 */
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(private readonly requestContext: RequestContextService) {}

  use(_req: Request, res: Response, next: NextFunction): void {
    const requestId = readRequestId(res);
    if (requestId === undefined) {
      next();
      return;
    }
    this.requestContext.run({ requestId }, next);
  }
}
