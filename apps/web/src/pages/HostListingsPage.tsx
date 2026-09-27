import type { ListingDto, Page } from '@ars/shared';
import { SearchXIcon } from 'lucide-react';
import { useLocation } from 'react-router';
import { EmptyPageState } from '../components/EmptyPageState';
import { Pager } from '../components/Pager';
import { Button } from '../components/ui/button';
import { EmptyState } from '../components/ui/empty-state';
import { ErrorBoundary } from '../components/ui/error-boundary';
import { ErrorState } from '../components/ui/error-state';
import { QueryState } from '../components/ui/query-state';
import { Skeleton } from '../components/ui/skeleton';
import { useGetHostListingsQuery } from '../features/host/api';
import { HostListingsTable } from '../features/host/components/HostListingsTable';
import { ListingSearch } from '../features/host/components/ListingSearch';
import { useUrlFilters } from '../features/host/hooks/useUrlFilters';
import {
  hostListingSearchParams,
  parseHostListingFilters,
} from '../features/host/hostFilters';
import { hostListingPath } from '../features/host/paths';
import { useTenantSlug } from '../hooks/useTenantSlug';
import { pluralize } from '../lib/format';
import { cn } from '../lib/utils';

/**
 * The host's listings (challenge item 7): searched by title or city; a row
 * opens the editor. The search and page live in the URL (D-017).
 */
export function HostListingsPage() {
  const tenantSlug = useTenantSlug();
  const { pathname, search } = useLocation();
  const { filters, applyFilters, clearFilters, pageHref } = useUrlFilters(
    parseHostListingFilters,
    hostListingSearchParams,
  );
  const listings = useGetHostListingsQuery({ tenantSlug, query: filters });

  const emptyState = (page: Page<ListingDto> | undefined) => {
    if (page !== undefined && page.total > 0) {
      return (
        <EmptyPageState
          total={page.total}
          noun="listing"
          firstPageHref={pageHref(1)}
        />
      );
    }
    return filters.q === undefined ? (
      <EmptyState title="This portal has no listings yet" />
    ) : (
      <EmptyState
        icon={<SearchXIcon />}
        title="No listings match your search"
        description="Search by a listing's title or city."
        action={<Button onClick={clearFilters}>Clear the search</Button>}
      />
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Listings</h1>
        <ListingSearch q={filters.q} onSearch={(q) => applyFilters({ q })} />
      </div>
      <QueryState
        query={listings}
        isEmpty={(page) => page.items.length === 0}
        empty={emptyState(listings.data)}
        loading={<Skeleton className="h-96 w-full rounded-xl" />}
      >
        {(page) => (
          <div
            aria-busy={listings.isFetching}
            className={cn(
              'flex flex-col gap-4',
              listings.isFetching && 'opacity-60',
            )}
          >
            <p role="status" className="text-sm font-medium">
              {pluralize(page.total, 'listing')}
            </p>
            <div className="rounded-xl bg-card px-2 ring-1 ring-foreground/10">
              <ErrorBoundary
                fallback={
                  <ErrorState message="The table could not be shown." />
                }
              >
                <HostListingsTable
                  listings={page.items}
                  editHref={(id) => hostListingPath(tenantSlug, id)}
                  backTo={`${pathname}${search}`}
                />
              </ErrorBoundary>
            </div>
            <Pager
              page={page.page}
              pageCount={Math.ceil(page.total / page.pageSize)}
              hrefFor={pageHref}
            />
          </div>
        )}
      </QueryState>
    </div>
  );
}
