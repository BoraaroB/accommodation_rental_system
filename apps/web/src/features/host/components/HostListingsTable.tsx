import type { ListingDto } from '@ars/shared';
import { Link } from 'react-router';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';
import { formatMoney } from '../../../lib/format';
import { PROPERTY_TYPES } from '../../../lib/propertyTypes';

/** Shown from `md` up; on phones the listing's cell says the same in one line. */
const WIDE = 'hidden md:table-cell';

/**
 * The tenant's listings; a click anywhere on a row opens the editor. On
 * phones only the title (with the city and type below it) and the price show.
 */
export function HostListingsTable({
  listings,
  editHref,
  backTo,
}: {
  listings: ListingDto[];
  editHref: (id: string) => string;
  /** The table's URL, for the editor's way back. */
  backTo: string;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Listing</TableHead>
          <TableHead className={WIDE}>City</TableHead>
          <TableHead className={WIDE}>Type</TableHead>
          <TableHead className={`${WIDE} text-right`}>Guests</TableHead>
          <TableHead className={`${WIDE} text-right`}>Bedrooms</TableHead>
          <TableHead className="text-right">Price / night</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {listings.map((listing) => (
          <TableRow key={listing.id} className="relative">
            <TableCell className="whitespace-normal">
              {/* The link covers the whole row. */}
              <Link
                to={editHref(listing.id)}
                state={{ backTo }}
                className="font-medium after:absolute after:inset-0 hover:underline"
              >
                {listing.title}
              </Link>
              <p className="text-muted-foreground md:hidden">
                {listing.city} · {PROPERTY_TYPES[listing.propertyType].label}
              </p>
            </TableCell>
            <TableCell className={WIDE}>{listing.city}</TableCell>
            <TableCell className={WIDE}>
              {PROPERTY_TYPES[listing.propertyType].label}
            </TableCell>
            <TableCell className={`${WIDE} text-right`}>
              {listing.maxGuests}
            </TableCell>
            <TableCell className={`${WIDE} text-right`}>
              {listing.bedrooms}
            </TableCell>
            <TableCell className="text-right font-medium">
              {formatMoney(listing.pricePerNightCents, listing.currency)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
