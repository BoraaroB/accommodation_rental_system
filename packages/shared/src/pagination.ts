import { z } from 'zod';
import { emptyAsUnset } from './query-param.js';

/** Items per page when a list query does not ask for a size. */
export const DEFAULT_PAGE_SIZE = 24;
/** The largest page a list query may ask for. */
export const MAX_PAGE_SIZE = 48;

/** `page` and `pageSize` of a list query; query-string values are coerced to integers. */
export const paginationQuerySchema = z.object({
  page: emptyAsUnset(z.coerce.number().int().min(1).default(1)),
  pageSize: emptyAsUnset(
    z.coerce
      .number()
      .int()
      .min(1)
      .max(MAX_PAGE_SIZE)
      .default(DEFAULT_PAGE_SIZE),
  ),
});

/** One page of a list: the API's single pagination shape. */
export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  /** Matching items across all pages. */
  total: number;
}

/** The schema of a `Page` of `item`. */
export function pageSchema<T extends z.ZodType>(item: T) {
  return z.object({
    items: z.array(item),
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1).max(MAX_PAGE_SIZE),
    total: z.number().int().min(0),
  });
}
