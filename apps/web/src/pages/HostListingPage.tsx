import { listingIdSchema } from '@ars/shared';
import { skipToken } from '@reduxjs/toolkit/query';
import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  ExternalLinkIcon,
} from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router';
import { getErrorStatus } from '../api/errors';
import { buttonVariants } from '../components/ui/button';
import { EmptyState } from '../components/ui/empty-state';
import { QueryState } from '../components/ui/query-state';
import { Skeleton } from '../components/ui/skeleton';
import { useGetHostListingQuery } from '../features/host/api';
import { BlockingCalendar } from '../features/host/components/BlockingCalendar';
import { ListingEditForm } from '../features/host/components/ListingEditForm';
import { hostBookingsPath, hostListingsPath } from '../features/host/paths';
import { useTenantSlug } from '../hooks/useTenantSlug';
import { backToOf } from '../lib/backTo';
import { formatCountry } from '../lib/format';

const SECTION =
  'flex flex-col gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10 md:p-6';

/**
 * One listing in the host panel: its editor (challenge item 7) and its
 * calendar in blocking mode (item 8).
 */
export function HostListingPage() {
  const tenantSlug = useTenantSlug();
  const { id = '' } = useParams();
  const location = useLocation();
  // A value that is not a listing id names no listing; it is not sent to the API.
  const isListingId = listingIdSchema.safeParse(id).success;
  const listing = useGetHostListingQuery(
    isListingId ? { tenantSlug, id } : skipToken,
  );
  // The table page the host came from, with its search.
  const backTo = backToOf(location.state, hostListingsPath(tenantSlug));

  const backLink = (
    <Link
      to={backTo}
      className={buttonVariants({ variant: 'ghost', className: 'self-start' })}
    >
      <ArrowLeftIcon aria-hidden="true" />
      All listings
    </Link>
  );

  if (!isListingId || getErrorStatus(listing.error) === 404) {
    return (
      <div className="flex flex-col gap-6">
        {backLink}
        <EmptyState
          title="Listing not found"
          description="It is not on this portal, or the link is wrong."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {backLink}
      <QueryState
        query={listing}
        loading={<Skeleton className="h-96 w-full rounded-xl" />}
      >
        {(listing) => (
          <article className="flex flex-col gap-6">
            <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-semibold tracking-tight">
                  {listing.title}
                </h1>
                <p className="text-muted-foreground">
                  {listing.city}, {formatCountry(listing.country)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  to={hostBookingsPath(tenantSlug, listing.id)}
                  className={buttonVariants({ variant: 'outline' })}
                >
                  <CalendarDaysIcon aria-hidden="true" />
                  View bookings
                </Link>
                <Link
                  to={`/${tenantSlug}/listings/${listing.id}`}
                  className={buttonVariants({ variant: 'outline' })}
                >
                  <ExternalLinkIcon aria-hidden="true" />
                  View on the portal
                </Link>
              </div>
            </header>
            <section aria-labelledby="details-heading" className={SECTION}>
              <h2 id="details-heading" className="text-xl font-semibold">
                Details
              </h2>
              {/* A new listing starts a new form. */}
              <ListingEditForm
                key={listing.id}
                tenantSlug={tenantSlug}
                listing={listing}
              />
            </section>
            <section aria-labelledby="calendar-heading" className={SECTION}>
              <h2 id="calendar-heading" className="text-xl font-semibold">
                Calendar
              </h2>
              <BlockingCalendar
                key={listing.id}
                tenantSlug={tenantSlug}
                listingId={listing.id}
              />
            </section>
          </article>
        )}
      </QueryState>
    </div>
  );
}
