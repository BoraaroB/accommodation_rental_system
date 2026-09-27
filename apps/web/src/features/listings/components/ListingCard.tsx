import type { DateRange, ListingDto } from '@ars/shared';
import { MapPinIcon } from 'lucide-react';
import { Link } from 'react-router';
import { buttonVariants } from '../../../components/ui/button';
import { formatCountry } from '../../../lib/format';
import { ListingFacts } from './ListingFacts';
import { PriceSummary } from './PriceSummary';
import { PropertyPlaceholder } from './PropertyPlaceholder';
import { RatingBadge } from './RatingBadge';

export interface ListingCardProps {
  listing: ListingDto;
  /** The detail page, carrying the searched dates. */
  href: string;
  /** The searched dates; the card then shows the stay's total. */
  stay?: DateRange;
  /** Where the detail page's "Back to results" leads. */
  backTo: string;
}

/** A search result: vertical on phones, horizontal from `md` up (D-025). */
export function ListingCard({ listing, href, stay, backTo }: ListingCardProps) {
  const linkState = { backTo };
  return (
    <article className="flex flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 transition-shadow hover:shadow-md md:flex-row">
      <PropertyPlaceholder
        propertyType={listing.propertyType}
        className="h-44 w-full md:h-auto md:w-56 md:shrink-0"
      />
      <div className="flex flex-1 flex-col gap-4 p-4 md:flex-row md:justify-between md:p-5">
        <div className="flex flex-col gap-1.5">
          <h3 className="text-lg leading-snug font-semibold">
            <Link
              to={href}
              state={linkState}
              className="text-primary hover:underline"
            >
              {listing.title}
            </Link>
          </h3>
          <p className="flex items-center gap-1 text-sm">
            <MapPinIcon
              aria-hidden="true"
              className="size-3.5 text-muted-foreground"
            />
            {listing.city}, {formatCountry(listing.country)}
          </p>
          <ListingFacts listing={listing} />
          <div className="mt-1">
            <RatingBadge
              rating={listing.rating}
              reviewCount={listing.reviewCount}
            />
          </div>
        </div>
        <div className="flex flex-col gap-3 md:items-end md:justify-between">
          <PriceSummary
            pricePerNightCents={listing.pricePerNightCents}
            currency={listing.currency}
            stay={stay}
            className="md:items-end"
          />
          <Link
            to={href}
            state={linkState}
            // The title links to the same page; one tab stop per card.
            tabIndex={-1}
            aria-hidden="true"
            className={buttonVariants({ size: 'lg', className: 'px-4' })}
          >
            See availability
          </Link>
        </div>
      </div>
    </article>
  );
}
