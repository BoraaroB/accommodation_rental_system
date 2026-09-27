import type { ListingQuery } from '@ars/shared';
import { useCallback, useMemo } from 'react';
import { useLocation, useSearchParams } from 'react-router';
import { parseListingFilters, toSearchParams } from '../listingFilters';

/** The fields a visitor filters by; sort and page are set separately. */
export type ListingFilterChanges = Partial<
  Pick<
    ListingQuery,
    | 'city'
    | 'guests'
    | 'minPriceCents'
    | 'maxPriceCents'
    | 'from'
    | 'to'
    | 'sort'
  >
>;

/**
 * The portal's filters, sort and page. The URL is their only home (D-017):
 * they are read from the search parameters and every change writes them back.
 */
export function useListingFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { pathname } = useLocation();
  const filters = useMemo(
    () => parseListingFilters(searchParams),
    [searchParams],
  );

  /** Changes some filters (`undefined` removes one) and goes back to page 1. */
  const applyFilters = useCallback(
    (changes: ListingFilterChanges) => {
      const next = toSearchParams({ ...filters, ...changes, page: 1 });
      // The same search again adds no history entry.
      setSearchParams(next, {
        replace: next.toString() === searchParams.toString(),
      });
    },
    [filters, searchParams, setSearchParams],
  );

  /** Removes every filter; the sort stays. */
  const clearFilters = useCallback(() => {
    setSearchParams(toSearchParams({ sort: filters.sort }));
  }, [filters.sort, setSearchParams]);

  /** The link to another page of the same results. */
  const pageHref = useCallback(
    (page: number) => {
      const search = toSearchParams({ ...filters, page }).toString();
      return search === '' ? pathname : `${pathname}?${search}`;
    },
    [filters, pathname],
  );

  return { filters, applyFilters, clearFilters, pageHref };
}
