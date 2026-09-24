import { describe, expect, it } from 'vitest';
import { envSchema } from './env.schema.js';

const validEnv = {
  NODE_ENV: 'development',
  PORT: '3000',
  CORS_ORIGIN: 'http://localhost:5173',
  LOG_LEVEL: 'log',
  LOG_FORMAT: 'pretty',
  DATABASE_URL: 'postgresql://booking:secret@localhost:5432/booking',
  JWT_SECRET: 'a-signing-key-of-at-least-32-characters',
  JWT_EXPIRES_IN: '3600',
};

describe('envSchema', () => {
  it('parses a valid env and coerces the values', () => {
    expect(envSchema.parse(validEnv)).toEqual({
      ...validEnv,
      PORT: 3000,
      CORS_ORIGIN: ['http://localhost:5173'],
      JWT_EXPIRES_IN: 3600,
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
    ['DATABASE_URL', ''],
    ['DATABASE_URL', 'not-a-url'],
    ['DATABASE_URL', 'localhost:5432/booking'],
    ['DATABASE_URL', 'mysql://booking:secret@localhost:3306/booking'],
    ['DATABASE_URL', 'http://localhost:5432/booking'],
    ['DATABASE_URL', 'postgresql://booking:secret@localhost:5432'],
    ['DATABASE_URL', 'postgresql://booking:secret@localhost:5432/'],
    ['JWT_SECRET', ''],
    ['JWT_SECRET', 'x'.repeat(31)],
    ['JWT_EXPIRES_IN', ''],
    ['JWT_EXPIRES_IN', '0'],
    ['JWT_EXPIRES_IN', '1.5'],
    ['JWT_EXPIRES_IN', '1h'],
  ])('rejects %s=%j', (name, value) => {
    expect(envSchema.safeParse({ ...validEnv, [name]: value }).success).toBe(
      false,
    );
  });

  it('accepts both postgres:// and postgresql://', () => {
    for (const DATABASE_URL of [
      'postgres://booking:secret@db:5432/booking',
      'postgresql://booking:secret@db:5432/booking?schema=public',
    ]) {
      expect(envSchema.safeParse({ ...validEnv, DATABASE_URL }).success).toBe(
        true,
      );
    }
  });

  it('does not echo an invalid database URL', () => {
    const result = envSchema.safeParse({
      ...validEnv,
      DATABASE_URL: 'mysql://booking:secret@localhost:3306/booking',
    });
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).not.toContain('secret');
  });

  it('does not echo a JWT secret that is too short', () => {
    const result = envSchema.safeParse({
      ...validEnv,
      JWT_SECRET: 'short-signing-key',
    });
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).not.toContain(
      'short-signing-key',
    );
  });

  describe('in test mode', () => {
    const testEnv = { ...validEnv, NODE_ENV: 'test' };

    it('accepts a database whose name ends in _test', () => {
      const env = envSchema.parse({
        ...testEnv,
        DATABASE_URL: 'postgresql://booking:secret@localhost:5432/booking_test',
      });
      expect(env.DATABASE_URL).toBe(
        'postgresql://booking:secret@localhost:5432/booking_test',
      );
    });

    it('rejects any other database, without echoing the URL', () => {
      const result = envSchema.safeParse(testEnv);
      expect(result.success).toBe(false);
      expect(result.error?.issues).toHaveLength(1);
      expect(result.error?.issues[0]?.path).toEqual(['DATABASE_URL']);
      expect(JSON.stringify(result.error?.issues)).not.toContain('secret');
    });
  });
});
