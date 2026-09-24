import { randomUUID } from 'node:crypto';
import { Injectable, type NestMiddleware } from '@nestjs/common';
import { requestIdSchema } from '@ars/shared';
import type { NextFunction, Request, Response } from 'express';
import { REQUEST_ID_HEADER } from './request-id.js';

/**
 * Gives every request an id: the client's `x-request-id` when it has a safe
 * shape, a new UUID otherwise. The id is set as the response header, which is
 * where the logger, the request context and the exception filter read it.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const incoming = requestIdSchema.safeParse(req.header(REQUEST_ID_HEADER));
    res.setHeader(
      REQUEST_ID_HEADER,
      incoming.success ? incoming.data : randomUUID(),
    );
    next();
  }
}
