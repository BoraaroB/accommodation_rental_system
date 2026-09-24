import { describe, expect, it } from 'vitest';
import { seedEnvSchema } from './seed-env.js';

const env = {
  DATABASE_URL: 'postgresql://booking:secret@localhost:5432/booking',
  SEED_DATA_DIR: '../../data',
  SEED_DEMO_PASSWORD: 'demo-password',
};

describe('seedEnvSchema', () => {
  it('accepts a complete environment', () => {
    expect(seedEnvSchema.parse(env)).toEqual(env);
  });

  it.each([
    ['a missing database URL', { DATABASE_URL: undefined }],
    ['a URL that is not PostgreSQL', { DATABASE_URL: 'mysql://db/booking' }],
    ['an empty data directory', { SEED_DATA_DIR: '' }],
    ['a password shorter than 8 characters', { SEED_DEMO_PASSWORD: 'short' }],
  ])('rejects %s', (_case, change) => {
    expect(seedEnvSchema.safeParse({ ...env, ...change }).success).toBe(false);
  });

  it('never echoes the password in its messages', () => {
    const result = seedEnvSchema.safeParse({
      ...env,
      SEED_DEMO_PASSWORD: 'pass7',
    });
    expect(JSON.stringify(result.error?.issues)).not.toContain('pass7');
  });
});
