import type { ListingDto } from '@ars/shared';
import { pluralize } from '../../../lib/format';
import { PROPERTY_TYPES } from '../../../lib/propertyTypes';

/** Type, guests and bedrooms in one line, e.g. "Apartment · 4 guests · 2 bedrooms". */
export function ListingFacts({
  listing,
}: {
  listing: Pick<ListingDto, 'propertyType' | 'maxGuests' | 'bedrooms'>;
}) {
  return (
    <p className="text-sm text-muted-foreground">
      {PROPERTY_TYPES[listing.propertyType].label} ·{' '}
      {pluralize(listing.maxGuests, 'guest')} ·{' '}
      {pluralize(listing.bedrooms, 'bedroom')}
    </p>
  );
}
