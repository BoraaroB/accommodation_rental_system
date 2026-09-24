import { z } from 'zod';
import { databaseUrlSchema } from '../../src/core/config/env.schema.js';

/**
 * The environment of `npm run db:seed`, validated before anything is read or
 * written. The API does not read the `SEED_*` variables. Messages never echo a
 * value, so the password stays out of the logs.
 */
export const seedEnvSchema = z.object({
  DATABASE_URL: databaseUrlSchema,
  /** Directory with listings.csv and bookings.csv; relative to apps/api or absolute. */
  SEED_DATA_DIR: z.string().min(1),
  /** The password of every seeded account (superadmin, hosts, demo client). */
  SEED_DEMO_PASSWORD: z.string().min(8),
});

export type SeedEnv = z.infer<typeof seedEnvSchema>;
