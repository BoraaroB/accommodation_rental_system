import { describe, expect, it } from 'vitest';
import { parseEnv } from './env';

const valid = { VITE_API_BASE_URL: '/api/v1', DEV: true, PROD: false };

describe('parseEnv', () => {
  it('accepts a path behind the dev proxy', () => {
    expect(parseEnv(valid)).toEqual({
      apiBaseUrl: '/api/v1',
      isDevelopment: true,
      isProduction: false,
    });
  });

  it('accepts a full URL', () => {
    const url = new URL('/api/v1', 'https://api.example.test').href;
    expect(parseEnv({ ...valid, VITE_API_BASE_URL: url }).apiBaseUrl).toBe(url);
  });

  it.each([
    undefined,
    '',
    'api/v1',
    'localhost:3000',
    'ftp://files.example.test',
  ])('rejects VITE_API_BASE_URL = %j and names the variable', (value) => {
    expect(() => parseEnv({ ...valid, VITE_API_BASE_URL: value })).toThrow(
      /VITE_API_BASE_URL/,
    );
  });
});
