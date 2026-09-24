import { describe, expect, it } from 'vitest';
import { envSchema } from './env.schema.js';

const validEnv = {
  NODE_ENV: 'development',
  PORT: '3000',
  CORS_ORIGIN: 'http://localhost:5173',
  LOG_LEVEL: 'log',
  LOG_FORMAT: 'pretty',
};

describe('envSchema', () => {
  it('parses a valid env and coerces the values', () => {
    expect(envSchema.parse(validEnv)).toEqual({
      ...validEnv,
      PORT: 3000,
      CORS_ORIGIN: ['http://localhost:5173'],
    });
  });

  it('splits a comma-separated list of origins', () => {
    const env = envSchema.parse({
      ...validEnv,
      CORS_ORIGIN: 'http://localhost:5173, https://rentals.example.com',
    });
    expect(env.CORS_ORIGIN).toEqual([
      'http://localhost:5173',
      'https://rentals.example.com',
    ]);
  });

  it.each(Object.keys(validEnv))('rejects an env without %s', (name) => {
    const env: Record<string, string> = { ...validEnv };
    delete env[name];
    const result = envSchema.safeParse(env);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual([name]);
  });

  it.each([
    ['PORT', ''],
    ['PORT', '0'],
    ['PORT', '65536'],
    ['PORT', '80.5'],
    ['PORT', 'http'],
    ['NODE_ENV', 'staging'],
    ['LOG_LEVEL', 'info'],
    ['LOG_FORMAT', 'xml'],
    ['CORS_ORIGIN', ''],
    ['CORS_ORIGIN', 'localhost'],
    ['CORS_ORIGIN', 'localhost:5173'],
    ['CORS_ORIGIN', 'http://localhost:5173/'],
    ['CORS_ORIGIN', 'http://localhost:5173/app'],
    ['CORS_ORIGIN', 'ftp://files.example.com'],
  ])('rejects %s=%j', (name, value) => {
    expect(envSchema.safeParse({ ...validEnv, [name]: value }).success).toBe(
      false,
    );
  });
});
