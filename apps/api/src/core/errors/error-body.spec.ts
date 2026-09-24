import { apiErrorSchema } from '@ars/shared';
import {
  BadRequestException,
  ConflictException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { buildErrorBody, describeException } from './error-body.js';

describe('describeException', () => {
  it.each([
    [
      'a built-in exception',
      new NotFoundException('Listing not found'),
      { statusCode: 404, code: 'NOT_FOUND', message: 'Listing not found' },
    ],
    [
      'an exception with an error code',
      new ConflictException('2026-10-02 is booked', {
        errorCode: 'DAY_ALREADY_BOOKED',
      }),
      {
        statusCode: 409,
        code: 'DAY_ALREADY_BOOKED',
        message: '2026-10-02 is booked',
      },
    ],
    [
      'a list of validation messages',
      new BadRequestException(['guests: too small', 'from: invalid date']),
      {
        statusCode: 400,
        code: 'BAD_REQUEST',
        message: ['guests: too small', 'from: invalid date'],
      },
    ],
    [
      'a plain HttpException with a string body',
      new HttpException('Too many requests', 429),
      {
        statusCode: 429,
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many requests',
      },
    ],
    [
      'a status without a name',
      new HttpException('Odd', 499),
      { statusCode: 499, code: 'HTTP_ERROR', message: 'Odd' },
    ],
  ])('keeps the status and message of %s', (_case, exception, expected) => {
    expect(describeException(exception)).toEqual(expected);
  });

  it('ignores an error code that is not in the machine format', () => {
    const exception = new ConflictException('Taken', {
      errorCode: 'slug taken',
    });
    expect(describeException(exception).code).toBe('CONFLICT');
  });

  it('keeps the status and message of a client error from the body parser', () => {
    const tooLarge = Object.assign(new Error('request entity too large'), {
      status: 413,
      expose: true,
    });
    expect(describeException(tooLarge)).toEqual({
      statusCode: 413,
      code: 'PAYLOAD_TOO_LARGE',
      message: 'request entity too large',
    });
  });

  it.each([
    ['an Error', new Error('connect ECONNREFUSED 10.0.0.5:5432')],
    [
      'a client error that is not safe to show',
      Object.assign(new Error('secret detail'), { status: 400, expose: false }),
    ],
    [
      'a server error with a status',
      Object.assign(new Error('db'), { status: 503, expose: true }),
    ],
    ['a string', 'boom'],
    ['undefined', undefined],
  ])('turns %s into a generic 500', (_case, thrown) => {
    expect(describeException(thrown)).toEqual({
      statusCode: 500,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
    });
  });
});

describe('buildErrorBody', () => {
  it('builds a body in the apiErrorSchema shape', () => {
    const body = buildErrorBody(
      {
        statusCode: 404,
        code: 'NOT_FOUND',
        message: 'Cannot GET /api/listings',
      },
      {
        path: '/api/listings',
        requestId: 'req-1',
        now: new Date('2026-09-24T10:00:00.000Z'),
      },
    );

    expect(body).toEqual({
      statusCode: 404,
      error: 'Not Found',
      code: 'NOT_FOUND',
      message: 'Cannot GET /api/listings',
      path: '/api/listings',
      timestamp: '2026-09-24T10:00:00.000Z',
      requestId: 'req-1',
    });
    expect(apiErrorSchema.parse(body)).toEqual(body);
  });
});
