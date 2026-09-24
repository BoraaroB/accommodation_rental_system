import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.e2e-spec.ts'],
    // Migrates the test database before any test runs.
    globalSetup: ['test/global-setup.ts'],
    environment: 'node',
    // Always test mode, so the API loads `.env.test` even when the shell sets NODE_ENV.
    env: { NODE_ENV: 'test' },
  },
});
