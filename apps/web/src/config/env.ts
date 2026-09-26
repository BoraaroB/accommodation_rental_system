import { z } from 'zod';

/**
 * The web app's environment. This is the only module that reads
 * `import.meta.env`; the rest of the app imports `env`.
 */
const envSchema = z.object({
  /** The API base URL including the version: `/api/v1` behind a proxy, or a full URL. */
  VITE_API_BASE_URL: z.union(
    [z.url({ protocol: /^https?$/ }), z.string().regex(/^\/\S*$/)],
    {
      error: 'must be a URL or a path starting with "/"',
    },
  ),
  DEV: z.boolean(),
  PROD: z.boolean(),
});

export interface Env {
  apiBaseUrl: string;
  isDevelopment: boolean;
  isProduction: boolean;
}

/** Validates the raw environment; throws an error naming every invalid variable. */
export function parseEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(
      `Invalid web app environment (apps/web/.env):\n${z.prettifyError(result.error)}`,
    );
  }
  return {
    apiBaseUrl: result.data.VITE_API_BASE_URL,
    isDevelopment: result.data.DEV,
    isProduction: result.data.PROD,
  };
}

export const env = parseEnv(import.meta.env);
