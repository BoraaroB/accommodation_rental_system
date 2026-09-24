import { Injectable, Logger, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { readRequestId } from '../request-context/request-id.js';
import { pathOf } from '../request-context/request-path.js';

/**
 * Writes one line per request when it ends: method, path (without the query
 * string), status and duration. 5xx is logged as an error, 4xx and requests
 * the client aborted as a warning, the rest as `log`. Headers and bodies are
 * never logged.
 */
@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const startedAt = performance.now();

    res.on('close', () => {
      const durationMs = Math.round(performance.now() - startedAt);
      const path = pathOf(req.originalUrl);
      const params = { requestId: readRequestId(res) };
      if (!res.writableFinished) {
        this.logger.warn(
          `${req.method} ${path} aborted by the client ${durationMs}ms`,
          params,
        );
        return;
      }
      const line = `${req.method} ${path} ${res.statusCode} ${durationMs}ms`;
      if (res.statusCode >= 500) {
        this.logger.error(line, params);
      } else if (res.statusCode >= 400) {
        this.logger.warn(line, params);
      } else {
        this.logger.log(line, params);
      }
    });

    next();
  }
}
