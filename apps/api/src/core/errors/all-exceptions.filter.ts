import { randomUUID } from 'node:crypto';
import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import type { Response } from 'express';
import { RequestContextService } from '../request-context/request-context.service.js';
import { readRequestId } from '../request-context/request-id.js';
import { pathOf } from '../request-context/request-path.js';
import { buildErrorBody, describeException } from './error-body.js';

/**
 * Catch-all filter: every error response has the `apiErrorSchema` shape.
 * 5xx errors are logged with their stack; the stack never reaches the client.
 * Registered first, so more specific filters added later take precedence.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly requestContext: RequestContextService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const http = host.switchToHttp();
    const request: unknown = http.getRequest();
    const response = http.getResponse<Response>();
    const requestId =
      this.requestContext.requestId ?? readRequestId(response) ?? randomUUID();

    const error = describeException(exception);
    const body = buildErrorBody(error, {
      path: pathOf(String(httpAdapter.getRequestUrl(request))),
      requestId,
    });

    if (error.statusCode >= 500) {
      const stack =
        exception instanceof Error ? exception.stack : String(exception);
      this.logger.error(
        `Unhandled error on ${body.path}`,
        { requestId },
        stack,
      );
    }

    // The response has already started (e.g. a failed stream): it can only be ended.
    if (httpAdapter.isHeadersSent(response)) {
      httpAdapter.end(response);
      return;
    }
    httpAdapter.reply(response, body, error.statusCode);
  }
}
