import type { DateRange, ListingDto, ListingQuery, Page } from '@ars/shared';
import { SearchXIcon, SlidersHorizontalIcon } from 'lucide-react';
import { useEffect } from 'react';
import { Link, useLocation } from 'react-router';
import { Pager } from '../components/Pager';
import { Button, buttonVariants } from '../components/ui/button';
import { EmptyState } from '../components/ui/empty-state';
import { QueryState } from '../components/ui/query-state';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '../components/ui/sheet';
import { Skeleton } from '../components/ui/skeleton';
import { useGetListingsQuery } from '../features/listings/api';
import { ActiveFilterChips } from '../features/listings/components/ActiveFilterChips';
import { ListingCard } from '../features/listings/components/ListingCard';
import { ListingFilters } from '../features/listings/components/ListingFilters';
import { SearchBar } from '../features/listings/components/SearchBar';
import { SortSelect } from '../features/listings/components/SortSelect';
import { useListingFilters } from '../features/listings/hooks/useListingFilters';
import { useTenantSlug } from '../hooks/useTenantSlug';
import { pluralize } from '../lib/format';
import { cn } from '../lib/utils';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { filtersDrawerClosed, filtersDrawerOpened } from '../store/uiSlice';

function stayOf({ from, to }: ListingQuery): DateRange | undefined {
  return from !== undefined && to !== undefined ? { from, to } : undefined;
}

function hasFilters(filters: ListingQuery): boolean {
  const { city, guests, minPriceCents, maxPriceCents, from, to } = filters;
  return [city, guests, minPriceCents, maxPriceCents, from, to].some(
    (value) => value !== undefined,
  );
}

/** The detail page's URL; it carries the searched dates for the calendar. */
function listingHref(tenantSlug: string, id: string, stay?: DateRange) {
  const path = `/${tenantSlug}/listings/${id}`;
  return stay ? `${path}?${new URLSearchParams({ ...stay }).toString()}` : path;
}

/**
 * The portal's home: search, filters and results (challenge items 1 and 3).
 * Filters, sort and page live in the URL (D-017).
 */
export function PortalHomePage() {
  const tenantSlug = useTenantSlug();
  const { pathname, search } = useLocation();
  const { filters, clearFilters, pageHref } = useListingFilters();
  const listings = useGetListingsQuery({ tenantSlug, query: filters });
  const drawerOpen = useAppSelector((state) => state.ui.filtersDrawerOpen);
  const dispatch = useAppDispatch();
  const closeDrawer = () => dispatch(filtersDrawerClosed());
  const stay = stayOf(filters);

  // The filter sheet belongs to this page; leaving the page closes it.
  useEffect(
    () => () => {
      dispatch(filtersDrawerClosed());
    },
    [dispatch],
  );

  const emptyState = (page: Page<ListingDto> | undefined) => {
    if (page !== undefined && page.total > 0) {
      return (
        <EmptyState
          title="This page is empty"
          description={`There are ${pluralize(page.total, 'stay')}, on fewer pages.`}
          action={
            <Link
              to={pageHref(1)}
              className={buttonVariants({ variant: 'outline' })}
            >
              Go to the first page
            </Link>
          }
        />
      );
    }
    return hasFilters(filters) ? (
      <EmptyState
        icon={<SearchXIcon />}
        title="No stays match your search"
        description="Try other dates, fewer filters or a wider price range."
        action={<Button onClick={clearFilters}>Clear all filters</Button>}
      />
    ) : (
      <EmptyState title="This portal has no stays yet" />
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="sr-only">Search stays</h1>
      {/*
        The forms start from the URL and are remounted when it changes: a
        filter removed from the URL (a chip, "Clear all", back) must also
        leave the form, which a form that keeps its state would not do.
      */}
      <SearchBar key={search} />
      <div className="flex flex-col gap-6 md:grid md:grid-cols-[16rem_1fr] md:items-start">
        <aside
          aria-labelledby="filters-heading"
          className="hidden rounded-xl bg-card p-4 ring-1 ring-foreground/10 md:block"
        >
          <h2 id="filters-heading" className="mb-4 text-base font-semibold">
            Filter by
          </h2>
          <ListingFilters key={search} />
        </aside>
        <section
          aria-labelledby="results-heading"
          className="flex flex-col gap-4"
        >
          <h2 id="results-heading" className="sr-only">
            Results
          </h2>
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              className="h-9 bg-card md:hidden"
              onClick={() => dispatch(filtersDrawerOpened())}
            >
              <SlidersHorizontalIcon aria-hidden="true" />
              Filters
            </Button>
            <div className="ml-auto">
              <SortSelect />
            </div>
          </div>
          <ActiveFilterChips />
          <QueryState
            query={listings}
            isEmpty={(page) => page.items.length === 0}
            empty={emptyState(listings.data)}
            loading={
              <div className="flex flex-col gap-4">
                {[1, 2, 3].map((key) => (
                  <Skeleton
                    key={key}
                    className="h-72 w-full rounded-xl md:h-44"
                  />
                ))}
              </div>
            }
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
                  {pluralize(page.total, 'stay')} found
                </p>
                <ul className="flex flex-col gap-4">
                  {page.items.map((listing) => (
                    <li key={listing.id}>
                      <ListingCard
                        listing={listing}
                        href={listingHref(tenantSlug, listing.id, stay)}
                        stay={stay}
                        backTo={`${pathname}${search}`}
                      />
                    </li>
                  ))}
                </ul>
                <Pager
                  page={page.page}
                  pageCount={Math.ceil(page.total / page.pageSize)}
                  hrefFor={pageHref}
                />
              </div>
            )}
          </QueryState>
        </section>
      </div>
      <Sheet
        open={drawerOpen}
        onOpenChange={(open) =>
          dispatch(open ? filtersDrawerOpened() : filtersDrawerClosed())
        }
      >
        <SheetContent side="right" className="data-[side=right]:w-full">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <div className="px-4">
            <ListingFilters key={search} onDone={closeDrawer} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
