import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts'],
    environment: 'node',
    // Always test mode, so the API loads `.env.test` even when the shell sets NODE_ENV.
    env: { NODE_ENV: 'test' },
  },
});
