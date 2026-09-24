import { Test } from '@nestjs/testing';
import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it } from 'vitest';
import { REQUEST_ID_HEADER } from './request-id.js';
import { RequestContextService } from './request-context.service.js';
import { RequestContextMiddleware } from './request-context.middleware.js';

describe('RequestContextMiddleware', () => {
  let middleware: RequestContextMiddleware;
  let requestContext: RequestContextService;

  beforeEach(async () => {
    // Resolved through Nest DI, which also proves that constructor injection
    // works in specs without an extra compiler plugin.
    const moduleRef = await Test.createTestingModule({
      providers: [RequestContextService, RequestContextMiddleware],
    }).compile();
    middleware = moduleRef.get(RequestContextMiddleware);
    requestContext = moduleRef.get(RequestContextService);
  });

  function handle(headerValue: unknown): string | undefined {
    const res = {
      getHeader: (name: string) =>
        name === REQUEST_ID_HEADER ? headerValue : undefined,
    } as unknown as Response;
    let idInsideRequest: string | undefined = 'next was not called';
    middleware.use({} as Request, res, () => {
      idInsideRequest = requestContext.requestId;
    });
    return idInsideRequest;
  }

  it('runs the rest of the request with the request id from the response header', () => {
    expect(handle('req-1')).toBe('req-1');
  });

  it('continues without a context when no request id was assigned', () => {
    expect(handle(undefined)).toBeUndefined();
  });

  it('has no request id outside the request', () => {
    handle('req-1');
    expect(requestContext.requestId).toBeUndefined();
  });
});
