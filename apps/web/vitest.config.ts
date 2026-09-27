import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    include: ['src/**/*.spec.{ts,tsx}'],
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Vitest serves `import.meta.env` from these values. Absolute, because Node's
    // `Request` rejects a relative URL; `.test` is a reserved TLD, and
    // `test/setup.ts` answers every request, so nothing reaches a network.
    env: { VITE_API_BASE_URL: 'http://api.test/api/v1' },
  },
});
