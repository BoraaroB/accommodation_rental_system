import type { ApiError } from '@ars/shared';
import { describe, expect, it } from 'vitest';
import {
  getErrorMessage,
  getErrorStatus,
  getRequestId,
  isServerOrNetworkError,
} from './errors';

function apiError(overrides: Partial<ApiError> = {}): ApiError {
  return {
    statusCode: 409,
    error: 'Conflict',
    code: 'DAY_ALREADY_BOOKED',
    message: '2026-10-02 is booked',
    path: '/api/v1/tenants/adriatic/host/listings/1/blocked-days',
    timestamp: '2026-09-26T10:00:00.000Z',
    requestId: 'req-123',
    ...overrides,
  };
}

describe('getErrorMessage', () => {
  it('uses the message of an API error body', () => {
    const error = { status: 409, data: apiError() };
    expect(getErrorMessage(error)).toBe('2026-10-02 is booked');
    expect(getRequestId(error)).toBe('req-123');
    expect(getErrorStatus(error)).toBe(409);
  });

  it('joins the messages of a validation error', () => {
    const error = {
      status: 400,
      data: apiError({
        statusCode: 400,
        error: 'Bad Request',
        code: 'VALIDATION_FAILED',
        message: ['guests: too small.', 'to: must be after from.'],
      }),
    };
    expect(getErrorMessage(error)).toBe(
      'guests: too small. to: must be after from.',
    );
  });

  it('describes an HTTP error with an empty body', () => {
    const error = { status: 502, data: null };
    expect(getErrorMessage(error)).toBe('The request failed (HTTP 502).');
    expect(getRequestId(error)).toBeUndefined();
  });

  it('describes an HTTP error whose body is not JSON (a proxy error page)', () => {
    const error = {
      status: 'PARSING_ERROR',
      originalStatus: 502,
      data: '<html>Bad Gateway</html>',
      error: 'SyntaxError: Unexpected token <',
    };
    expect(getErrorMessage(error)).toBe('The request failed (HTTP 502).');
    expect(getErrorStatus(error)).toBe(502);
  });

  it('describes a successful response whose body is not JSON', () => {
    const error = {
      status: 'PARSING_ERROR',
      originalStatus: 200,
      data: '<html></html>',
      error: 'SyntaxError: Unexpected token <',
    };
    expect(getErrorMessage(error)).toBe(
      'The server sent an unexpected response.',
    );
  });

  it('describes a network error', () => {
    const error = {
      status: 'FETCH_ERROR',
      error: 'TypeError: Failed to fetch',
    };
    expect(getErrorMessage(error)).toMatch(/could not be reached/);
    expect(getErrorStatus(error)).toBeUndefined();
  });

  it('describes a response that failed schema validation', () => {
    const error = {
      status: 'CUSTOM_ERROR',
      error: 'responseSchema failed validation',
    };
    expect(getErrorMessage(error)).toBe(
      'The server sent an unexpected response.',
    );
  });

  it('uses the message of a serialized error', () => {
    expect(getErrorMessage({ name: 'Error', message: 'Aborted' })).toBe(
      'Aborted',
    );
  });

  it('falls back for anything else', () => {
    expect(getErrorMessage(undefined)).toBe(
      'Something went wrong. Please try again.',
    );
  });
});

describe('isServerOrNetworkError', () => {
  it.each([
    [{ status: 500, data: apiError({ statusCode: 500 }) }, true],
    [{ status: 'FETCH_ERROR', error: 'offline' }, true],
    [{ status: 'TIMEOUT_ERROR', error: 'timeout' }, true],
    [
      {
        status: 'PARSING_ERROR',
        originalStatus: 502,
        data: '<html>',
        error: 'x',
      },
      true,
    ],
    [
      {
        status: 'PARSING_ERROR',
        originalStatus: 200,
        data: '<html>',
        error: 'x',
      },
      false,
    ],
    [{ status: 404, data: apiError({ statusCode: 404 }) }, false],
    [{ status: 'CUSTOM_ERROR', error: 'schema' }, false],
    [{ message: 'Aborted' }, false],
  ])('%j → %s', (error, expected) => {
    expect(isServerOrNetworkError(error)).toBe(expected);
  });
});
