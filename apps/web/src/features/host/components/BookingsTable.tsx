import { daysBetween, type HostBooking } from '@ars/shared';
import { Link } from 'react-router';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';
import { formatDateRange, formatMoney, pluralize } from '../../../lib/format';
import { BookingBadges } from './BookingBadges';

/** Shown from `md` up; on phones the listing's cell says the same below the title. */
const WIDE = 'hidden md:table-cell';

/**
 * The tenant's bookings (challenge item 9): listing, dates, nights, guests,
 * status and the stay's total. Bookings are read-only; the listing opens
 * its editor.
 */
export function BookingsTable({
  bookings,
  listingHref,
}: {
  bookings: HostBooking[];
  listingHref: (listingId: string) => string;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Listing</TableHead>
          <TableHead className={WIDE}>Dates</TableHead>
          <TableHead className={`${WIDE} text-right`}>Nights</TableHead>
          <TableHead className={`${WIDE} text-right`}>Guests</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {bookings.map((booking) => {
          const dates = formatDateRange(booking.checkIn, booking.checkOut);
          const nights = pluralize(
            daysBetween(booking.checkIn, booking.checkOut),
            'night',
          );
          return (
            <TableRow key={booking.id}>
              <TableCell className="whitespace-normal">
                <Link
                  to={listingHref(booking.listingId)}
                  className="font-medium hover:underline"
                >
                  {booking.listingTitle}
                </Link>
                <p className="text-muted-foreground md:hidden">
                  {dates} · {nights} · {pluralize(booking.guests, 'guest')}
                </p>
              </TableCell>
              <TableCell className={WIDE}>{dates}</TableCell>
              <TableCell className={`${WIDE} text-right`}>
                {daysBetween(booking.checkIn, booking.checkOut)}
              </TableCell>
              <TableCell className={`${WIDE} text-right`}>
                {booking.guests}
              </TableCell>
              <TableCell>
                <BookingBadges booking={booking} />
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatMoney(booking.totalCents)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
