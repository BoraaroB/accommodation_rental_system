import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['src/**/*.spec.{ts,tsx}'],
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Vitest serves `import.meta.env` from these values; relative, so no host is involved.
    env: { VITE_API_BASE_URL: '/api/v1' },
  },
});
