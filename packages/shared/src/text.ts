import { z } from 'zod';

/**
 * Text as a request sends it (a title, a city, a name): trimmed, not blank,
 * without control characters — Postgres text cannot hold a NUL byte, and no
 * such value needs a control character.
 */
export const plainTextSchema = z
  .string()
  .trim()
  .min(1)
  .regex(/^\P{Cc}*$/u, 'Must not contain control characters');
