import type { HostBooking, Page } from '@ars/shared';
import { SearchXIcon } from 'lucide-react';
import { EmptyPageState } from '../components/EmptyPageState';
import { Pager } from '../components/Pager';
import { Button } from '../components/ui/button';
import { EmptyState } from '../components/ui/empty-state';
import { ErrorBoundary } from '../components/ui/error-boundary';
import { ErrorState } from '../components/ui/error-state';
import { QueryState } from '../components/ui/query-state';
import { Skeleton } from '../components/ui/skeleton';
import { useGetHostBookingsQuery } from '../features/host/api';
import { BookingFilters } from '../features/host/components/BookingFilters';
import { BookingsTable } from '../features/host/components/BookingsTable';
import { useUrlFilters } from '../features/host/hooks/useUrlFilters';
import {
  hasBookingFilters,
  hostBookingSearchParams,
  parseHostBookingFilters,
} from '../features/host/hostFilters';
import { hostListingPath } from '../features/host/paths';
import { useTenantSlug } from '../hooks/useTenantSlug';
import { pluralize } from '../lib/format';
import { cn } from '../lib/utils';

/**
 * The tenant's bookings (challenge item 9), read-only: filtered by listing,
 * status and dates, which live in the URL with the page (D-017).
 */
export function HostBookingsPage() {
  const tenantSlug = useTenantSlug();
  const { filters, applyFilters, clearFilters, pageHref } = useUrlFilters(
    parseHostBookingFilters,
    hostBookingSearchParams,
  );
  // Possible improvement (not in the plan): a sort, or upcoming stays first;
  // the API lists by check-in, so the first page is the oldest history.
  const bookings = useGetHostBookingsQuery({ tenantSlug, query: filters });

  const emptyState = (page: Page<HostBooking> | undefined) => {
    if (page !== undefined && page.total > 0) {
      return (
        <EmptyPageState
          total={page.total}
          noun="booking"
          firstPageHref={pageHref(1)}
        />
      );
    }
    return hasBookingFilters(filters) ? (
      <EmptyState
        icon={<SearchXIcon />}
        title="No bookings match these filters"
        description="Try another listing, status or dates."
        action={<Button onClick={clearFilters}>Clear filters</Button>}
      />
    ) : (
      <EmptyState title="This portal has no bookings yet" />
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Bookings</h1>
      <BookingFilters
        tenantSlug={tenantSlug}
        filters={filters}
        onChange={applyFilters}
        onClear={clearFilters}
      />
      <QueryState
        query={bookings}
        isEmpty={(page) => page.items.length === 0}
        empty={emptyState(bookings.data)}
        loading={<Skeleton className="h-96 w-full rounded-xl" />}
      >
        {(page) => (
          <div
            aria-busy={bookings.isFetching}
            className={cn(
              'flex flex-col gap-4',
              bookings.isFetching && 'opacity-60',
            )}
          >
            <p role="status" className="text-sm font-medium">
              {pluralize(page.total, 'booking')}
            </p>
            <div className="rounded-xl bg-card px-2 ring-1 ring-foreground/10">
              <ErrorBoundary
                fallback={
                  <ErrorState message="The table could not be shown." />
                }
              >
                <BookingsTable
                  bookings={page.items}
                  listingHref={(id) => hostListingPath(tenantSlug, id)}
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
