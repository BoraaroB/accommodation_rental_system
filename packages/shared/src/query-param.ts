import { z } from 'zod';

/**
 * A query-string parameter whose empty value (`?guests=`) counts as not sent,
 * instead of being coerced to 0.
 */
export function emptyAsUnset<T extends z.ZodType>(schema: T) {
  return z.preprocess((value) => (value === '' ? undefined : value), schema);
}
