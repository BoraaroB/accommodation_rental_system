import { z } from 'zod';
import { LOG_LEVELS } from '../logging/log-levels.js';

/** A browser origin: scheme, host and optional port, without a path. */
const originSchema = z
  .url({ protocol: /^https?$/ })
  .refine((value) => URL.canParse(value) && new URL(value).origin === value, {
    message:
      'Expected an origin: scheme://host[:port], without a path or trailing slash',
  });

/**
 * Every environment variable the API reads. Validated once at startup; the app
 * does not start when a variable is missing or invalid. Values are read
 * through `ConfigService`, which returns the parsed output of this schema.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.coerce.number().int().min(1).max(65535),
  /** Comma-separated list of origins allowed to call the API from a browser. */
  CORS_ORIGIN: z
    .string()
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter((origin) => origin !== ''),
    )
    .pipe(z.array(originSchema).min(1)),
  /** The least severe level that is still written (`log` writes log, warn, error and fatal). */
  LOG_LEVEL: z.enum(LOG_LEVELS),
  LOG_FORMAT: z.enum(['pretty', 'json']),
});

export type Env = z.infer<typeof envSchema>;
