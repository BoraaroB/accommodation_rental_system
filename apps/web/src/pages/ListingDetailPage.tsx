import {
  availabilityQuerySchema,
  listingIdSchema,
  type DateRange,
} from '@ars/shared';
import { skipToken } from '@reduxjs/toolkit/query';
import { ArrowLeftIcon, MapPinIcon } from 'lucide-react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router';
import { getErrorStatus } from '../api/errors';
import { buttonVariants } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { EmptyState } from '../components/ui/empty-state';
import { QueryState } from '../components/ui/query-state';
import { Skeleton } from '../components/ui/skeleton';
import { useGetListingQuery } from '../features/listings/api';
import { AvailabilityVerdict } from '../features/listings/components/AvailabilityVerdict';
import { ListingAvailability } from '../features/listings/components/ListingAvailability';
import { ListingFacts } from '../features/listings/components/ListingFacts';
import { PriceSummary } from '../features/listings/components/PriceSummary';
import { PropertyPlaceholder } from '../features/listings/components/PropertyPlaceholder';
import { RatingBadge } from '../features/listings/components/RatingBadge';
import { useTenantSlug } from '../hooks/useTenantSlug';
import { backToOf } from '../lib/backTo';
import { formatCountry } from '../lib/format';

/** The searched stay from `?from&to`; ignored unless it is a range from today on. */
function stayOf(params: URLSearchParams): DateRange | undefined {
  const result = availabilityQuerySchema.safeParse({
    from: params.get('from'),
    to: params.get('to'),
  });
  return result.success ? result.data : undefined;
}

/**
 * One listing (challenge item 2) and when it is available to book (item 4).
 * There is no "Book" button: clients do not book.
 */
export function ListingDetailPage() {
  const tenantSlug = useTenantSlug();
  const { id = '' } = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  // A value that is not a listing id names no listing; it is not sent to the API.
  const isListingId = listingIdSchema.safeParse(id).success;
  const listing = useGetListingQuery(
    isListingId ? { tenantSlug, id } : skipToken,
  );
  const stay = stayOf(searchParams);
  // The results the visitor came from, when a result card linked here.
  const backTo = backToOf(location.state, `/${tenantSlug}`);

  const backLink = (
    <Link
      to={backTo}
      className={buttonVariants({ variant: 'ghost', className: 'self-start' })}
    >
      <ArrowLeftIcon aria-hidden="true" />
      Back to results
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
        loading={<Skeleton className="h-72 w-full rounded-xl" />}
      >
        {(listing) => (
          <article className="flex flex-col gap-6">
            <header className="flex flex-col gap-2">
              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                {listing.title}
              </h1>
              <p className="flex items-center gap-1">
                <MapPinIcon
                  aria-hidden="true"
                  className="size-4 text-muted-foreground"
                />
                {listing.city}, {formatCountry(listing.country)}
              </p>
              <RatingBadge
                rating={listing.rating}
                reviewCount={listing.reviewCount}
              />
            </header>
            <div className="grid gap-6 md:grid-cols-[1fr_20rem]">
              <PropertyPlaceholder
                propertyType={listing.propertyType}
                className="h-56 rounded-xl md:h-full md:min-h-72"
              />
              <Card>
                <CardContent className="flex flex-col gap-4">
                  <ListingFacts listing={listing} />
                  <PriceSummary
                    pricePerNightCents={listing.pricePerNightCents}
                    currency={listing.currency}
                    stay={stay}
                  />
                  {stay && (
                    <AvailabilityVerdict
                      tenantSlug={tenantSlug}
                      listingId={listing.id}
                      stay={stay}
                    />
                  )}
                </CardContent>
              </Card>
            </div>
            <section
              aria-labelledby="availability-heading"
              className="flex flex-col gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10 md:p-6"
            >
              <h2 id="availability-heading" className="text-xl font-semibold">
                Availability
              </h2>
              <ListingAvailability
                tenantSlug={tenantSlug}
                listingId={listing.id}
                stay={stay}
              />
            </section>
          </article>
        )}
      </QueryState>
    </div>
  );
}
