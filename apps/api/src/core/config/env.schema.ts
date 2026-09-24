import { z } from 'zod';
import { LOG_LEVELS } from '../logging/log-levels.js';
import { databaseNameOf, isTestDatabaseUrl } from './database-url.js';

/** A browser origin: scheme, host and optional port, without a path. */
const originSchema = z
  .url({ protocol: /^https?$/ })
  .refine((value) => URL.canParse(value) && new URL(value).origin === value, {
    message:
      'Expected an origin: scheme://host[:port], without a path or trailing slash',
  });

/** A PostgreSQL connection string that names a database. */
const databaseUrlSchema = z
  .url({ protocol: /^postgres(ql)?$/ })
  .refine((value) => databaseNameOf(value) !== '', {
    message:
      'Expected postgresql://user:password@host:port/database, with a database name',
  });

/**
 * Every environment variable the API reads. Validated once at startup; the app
 * does not start when a variable is missing or invalid. Values are read
 * through `ConfigService`, which returns the parsed output of this schema.
 * Messages never echo a value, so the database password stays out of the logs.
 */
export const envSchema = z
  .object({
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
    DATABASE_URL: databaseUrlSchema,
  })
  // Tests create and delete rows, so in test mode the database must be a
  // `_test` one — also when a shell variable overrides `.env.test`.
  .refine(
    (env) => env.NODE_ENV !== 'test' || isTestDatabaseUrl(env.DATABASE_URL),
    {
      path: ['DATABASE_URL'],
      message: 'With NODE_ENV=test the database name must end in _test',
    },
  );

export type Env = z.infer<typeof envSchema>;
