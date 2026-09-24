import { Test } from '@nestjs/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('configuration (e2e)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  // Real environment variables win over `.env.test`, so an invalid value set
  // here is what the config module validates. `ConfigModule.forRoot` runs when
  // its module file is imported, so the module is imported after stubbing —
  // and on its own: importing the whole app here would load further modules
  // after the validation already failed.
  it.each([
    ['PORT', 'not-a-port'],
    ['LOG_FORMAT', 'xml'],
    ['CORS_ORIGIN', 'localhost'],
    ['DATABASE_URL', 'not-a-url'],
    // In test mode only a `_test` database is accepted.
    ['DATABASE_URL', 'postgresql://booking:secret@localhost:5432/booking'],
    ['JWT_SECRET', 'too-short'],
    ['JWT_EXPIRES_IN', '1h'],
  ])('refuses to start when %s is invalid', async (name, value) => {
    vi.stubEnv(name, value);
    const { AppConfigModule } =
      await import('../src/core/config/config.module.js');

    await expect(
      Test.createTestingModule({ imports: [AppConfigModule] }).compile(),
    ).rejects.toThrow(new RegExp(`Config validation error: ${name}`));
  });
});
