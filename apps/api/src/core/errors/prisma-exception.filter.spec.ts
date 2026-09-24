import { apiErrorSchema } from '@ars/shared';
import { type ArgumentsHost, Logger } from '@nestjs/common';
import type { HttpAdapterHost } from '@nestjs/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '../../generated/prisma/client.js';
import { RequestContextService } from '../request-context/request-context.service.js';
import { AllExceptionsFilter } from './all-exceptions.filter.js';
import { PrismaExceptionFilter } from './prisma-exception.filter.js';

function prismaError(code: string): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError(
    'Unique constraint failed on the fields: (`slug`) in table "tenants"',
    { code, clientVersion: '7.10.0', meta: { target: ['slug'] } },
  );
}

function catchException(
  exception:
    Prisma.PrismaClientKnownRequestError | Prisma.PrismaClientValidationError,
) {
  const reply = vi.fn();
  const httpAdapterHost = {
    httpAdapter: {
      reply,
      end: vi.fn(),
      isHeadersSent: () => false,
      getRequestUrl: () => '/api/v1/admin/tenants',
    },
  } as unknown as HttpAdapterHost;
  const requestContext = new RequestContextService();
  const filter = new PrismaExceptionFilter(
    new AllExceptionsFilter(httpAdapterHost, requestContext),
  );
  const host = {
    switchToHttp: () => ({
      getRequest: () => ({}),
      getResponse: () => ({ getHeader: () => undefined }),
    }),
  } as unknown as ArgumentsHost;

  requestContext.run({ requestId: 'req-7' }, () =>
    filter.catch(exception, host),
  );

  expect(reply).toHaveBeenCalledOnce();
  const [, body, status] = reply.mock.calls[0] as [unknown, unknown, number];
  return { body: apiErrorSchema.parse(body), status };
}

describe('PrismaExceptionFilter', () => {
  let logError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logError = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ['P2002', 409, 'UNIQUE_VIOLATION'],
    ['P2003', 409, 'FOREIGN_KEY_VIOLATION'],
    ['P2025', 404, 'NOT_FOUND'],
  ])(
    'answers %s with %i %s, without Prisma details',
    (prismaCode, statusCode, code) => {
      const { body, status } = catchException(prismaError(prismaCode));

      expect(status).toBe(statusCode);
      expect(body).toMatchObject({
        statusCode,
        code,
        path: '/api/v1/admin/tenants',
        requestId: 'req-7',
      });
      expect(JSON.stringify(body)).not.toMatch(/Unique constraint|slug/);
      expect(logError).not.toHaveBeenCalled();
    },
  );

  it('leaves any other Prisma error a logged 500', () => {
    const error = prismaError('P2034');

    const { body, status } = catchException(error);

    expect(status).toBe(500);
    expect(body).toMatchObject({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
      requestId: 'req-7',
    });
    expect(logError).toHaveBeenCalledWith(
      'Unhandled error on /api/v1/admin/tenants',
      { requestId: 'req-7' },
      error.stack,
    );
  });

  it('logs a validation error without the query arguments', () => {
    const error = new Prisma.PrismaClientValidationError(
      'Invalid `prisma.user.create()` invocation:\n{ data: { passwordHash: "hash-value" } }\nArgument `name` is missing.',
      { clientVersion: '7.10.0' },
    );

    const { body, status } = catchException(error);

    expect(status).toBe(500);
    expect(body.code).toBe('INTERNAL_SERVER_ERROR');
    expect(logError).toHaveBeenCalledOnce();
    const logged = JSON.stringify(logError.mock.calls);
    expect(logged).toContain('PrismaClientValidationError');
    expect(logged).not.toContain('hash-value');
  });
});
