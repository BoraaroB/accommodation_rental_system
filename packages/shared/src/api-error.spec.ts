import { describe, expect, it } from 'vitest';
import { apiErrorSchema, requestIdSchema } from './api-error.js';

const validBody = {
  statusCode: 404,
  error: 'Not Found',
  code: 'NOT_FOUND',
  message: 'Cannot GET /api/listings',
  path: '/api/listings',
  timestamp: '2026-09-24T10:00:00.000Z',
  requestId: '3f0c6f5e-2a57-4e0e-9a55-2f1f1c1d9a10',
};

describe('apiErrorSchema', () => {
  it('accepts an error body', () => {
    expect(apiErrorSchema.parse(validBody)).toEqual(validBody);
  });

  it('accepts a list of messages', () => {
    const body = { ...validBody, statusCode: 400, message: ['a', 'b'] };
    expect(apiErrorSchema.parse(body).message).toEqual(['a', 'b']);
  });

  it.each([
    ['a missing code', { code: undefined }],
    ['a lowercase code', { code: 'not_found' }],
    ['a success status', { statusCode: 200 }],
    ['a timestamp with an offset', { timestamp: '2026-09-24T10:00:00+02:00' }],
    ['an unsafe request id', { requestId: 'a b' }],
  ])('rejects %s', (_case, override) => {
    expect(
      apiErrorSchema.safeParse({ ...validBody, ...override }).success,
    ).toBe(false);
  });
});

describe('requestIdSchema', () => {
  it.each([
    '3f0c6f5e-2a57-4e0e-9a55-2f1f1c1d9a10',
    'abc',
    'trace.1_2-3',
    'a'.repeat(128),
  ])('accepts %s', (value) => {
    expect(requestIdSchema.safeParse(value).success).toBe(true);
  });

  it.each(['', 'a'.repeat(129), 'a b', 'id\nforged log line', '<script>'])(
    'rejects %j',
    (value) => {
      expect(requestIdSchema.safeParse(value).success).toBe(false);
    },
  );
});
