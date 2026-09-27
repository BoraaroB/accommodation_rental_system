import { useCallback, useMemo } from 'react';
import { useLocation, useSearchParams } from 'react-router';

/**
 * A host table's filters and page. The URL is their only home (D-017): they
 * are read from the search parameters and every change writes them back.
 * `parse` and `toSearchParams` are module functions, so they never change.
 */
export function useUrlFilters<T extends { page: number }>(
  parse: (params: URLSearchParams) => T,
  toSearchParams: (filters: Partial<T>) => URLSearchParams,
) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { pathname } = useLocation();
  const filters = useMemo(() => parse(searchParams), [parse, searchParams]);

  /** Changes some filters (`undefined` removes one) and goes back to page 1. */
  const applyFilters = useCallback(
    (changes: Partial<T>) => {
      const next = toSearchParams({ ...filters, ...changes, page: 1 });
      // The same filters again add no history entry.
      setSearchParams(next, {
        replace: next.toString() === searchParams.toString(),
      });
    },
    [filters, searchParams, setSearchParams, toSearchParams],
  );

  /** Removes every filter. */
  const clearFilters = useCallback(() => {
    setSearchParams(new URLSearchParams());
  }, [setSearchParams]);

  /** The link to another page of the same table. */
  const pageHref = useCallback(
    (page: number) => {
      const search = toSearchParams({ ...filters, page }).toString();
      return search === '' ? pathname : `${pathname}?${search}`;
    },
    [filters, pathname, toSearchParams],
  );

  return { filters, applyFilters, clearFilters, pageHref };
}
