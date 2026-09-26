import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { z } from 'zod';

// Dev-server settings; no `VITE_` prefix, so they never reach the bundle.
const devServerEnvSchema = z.object({
  WEB_PORT: z.coerce.number().int().min(1).max(65535),
  /** Where the dev server forwards `/api` requests, e.g. the local API. */
  API_PROXY_TARGET: z.url({ protocol: /^https?$/ }),
});

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const plugins = [react(), tailwindcss()];
  // A production build does not run the dev server, so it needs neither value.
  if (command === 'build') {
    return { plugins };
  }

  const result = devServerEnvSchema.safeParse(loadEnv(mode, process.cwd(), ''));
  if (!result.success) {
    throw new Error(
      `Invalid dev-server environment (apps/web/.env):\n${z.prettifyError(result.error)}`,
    );
  }
  const { WEB_PORT, API_PROXY_TARGET } = result.data;

  return {
    plugins,
    server: {
      port: WEB_PORT,
      strictPort: true,
      proxy: { '/api': { target: API_PROXY_TARGET, changeOrigin: true } },
    },
    preview: { port: WEB_PORT, strictPort: true },
  };
});
