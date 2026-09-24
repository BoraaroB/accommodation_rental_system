import { apiErrorSchema } from '@ars/shared';
import { type ArgumentsHost, ConflictException, Logger } from '@nestjs/common';
import type { HttpAdapterHost } from '@nestjs/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RequestContextService } from '../request-context/request-context.service.js';
import { AllExceptionsFilter } from './all-exceptions.filter.js';

function createFilter(headersSent = false) {
  const httpAdapter = {
    reply: vi.fn(),
    end: vi.fn(),
    isHeadersSent: () => headersSent,
    getRequestUrl: () => '/api/v1/t/adriatic/listings?city=Split',
  };
  const httpAdapterHost = { httpAdapter } as unknown as HttpAdapterHost;
  return { httpAdapter, httpAdapterHost };
}

function catchException(
  exception: unknown,
  requestId?: string,
  headerId?: string,
) {
  const { httpAdapter, httpAdapterHost } = createFilter();
  const reply = httpAdapter.reply;
  const requestContext = new RequestContextService();
  const filter = new AllExceptionsFilter(httpAdapterHost, requestContext);
  const response = { getHeader: () => headerId };
  const host = {
    switchToHttp: () => ({
      getRequest: () => ({}),
      getResponse: () => response,
    }),
  } as unknown as ArgumentsHost;

  if (requestId === undefined) {
    filter.catch(exception, host);
  } else {
    requestContext.run({ requestId }, () => filter.catch(exception, host));
  }

  expect(reply).toHaveBeenCalledOnce();
  const [sentTo, body, status] = reply.mock.calls[0] as [
    unknown,
    unknown,
    number,
  ];
  expect(sentTo).toBe(response);
  return { body: apiErrorSchema.parse(body), status };
}

describe('AllExceptionsFilter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('turns an unknown error into a 500 without details and logs it with the request id', () => {
    const logError = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const error = new Error('connect ECONNREFUSED 10.0.0.5:5432');

    const { body, status } = catchException(error, 'req-9');

    expect(status).toBe(500);
    expect(body).toMatchObject({
      statusCode: 500,
      error: 'Internal Server Error',
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
      path: '/api/v1/t/adriatic/listings',
      requestId: 'req-9',
    });
    expect(JSON.stringify(body)).not.toContain('ECONNREFUSED');
    expect(logError).toHaveBeenCalledWith(
      'Unhandled error on /api/v1/t/adriatic/listings',
      { requestId: 'req-9' },
      error.stack,
    );
  });

  it('passes an HttpException through with its code and does not log it', () => {
    const logError = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);

    const { body, status } = catchException(
      new ConflictException('Slug is taken', { errorCode: 'SLUG_TAKEN' }),
      'req-10',
    );

    expect(status).toBe(409);
    expect(body).toMatchObject({
      code: 'SLUG_TAKEN',
      message: 'Slug is taken',
      requestId: 'req-10',
    });
    expect(logError).not.toHaveBeenCalled();
  });

  it('only ends a response that has already started', () => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const { httpAdapter, httpAdapterHost } = createFilter(true);
    const filter = new AllExceptionsFilter(
      httpAdapterHost,
      new RequestContextService(),
    );
    const response = { getHeader: () => undefined };
    const host = {
      switchToHttp: () => ({
        getRequest: () => ({}),
        getResponse: () => response,
      }),
    } as unknown as ArgumentsHost;

    filter.catch(new Error('stream failed'), host);

    expect(httpAdapter.end).toHaveBeenCalledWith(response);
    expect(httpAdapter.reply).not.toHaveBeenCalled();
  });

  it('uses the id from the response header outside the request context', () => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    const { body } = catchException(new Error('boom'), undefined, 'req-header');

    expect(body.requestId).toBe('req-header');
  });

  it('generates a request id when none was assigned', () => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    const { body } = catchException(new Error('boom'));

    expect(body.requestId).toMatch(/^[0-9a-f-]{36}$/);
  });
});
