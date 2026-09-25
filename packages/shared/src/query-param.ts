import { z } from 'zod';

/**
 * A query-string parameter whose empty value (`?guests=`) counts as not sent,
 * instead of being coerced to 0.
 */
export function emptyAsUnset<T extends z.ZodType>(schema: T) {
  return z.preprocess((value) => (value === '' ? undefined : value), schema);
}

/**
 * A free-text query parameter whose blank value (`?q=`, `?q=%20`) counts as
 * not sent, as an empty search box does.
 */
export function blankAsUnset<T extends z.ZodType>(schema: T) {
  return z.preprocess(
    (value) =>
      typeof value === 'string' && value.trim() === '' ? undefined : value,
    schema,
  );
}
