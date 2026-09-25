import {
  stayTotalCents,
  toIsoDate,
  type BookingDto,
  type HostBooking,
} from '@ars/shared';
import type { Prisma } from '../generated/prisma/client.js';

/** The columns a `BookingDto` is built from. */
export const bookingSelect = {
  id: true,
  listingId: true,
  checkIn: true,
  checkOut: true,
  guests: true,
  status: true,
} satisfies Prisma.BookingSelect;

/** A booking with what the host table shows of its listing. */
export const hostBookingSelect = {
  ...bookingSelect,
  listing: { select: { title: true, pricePerNightCents: true } },
} satisfies Prisma.BookingSelect;

export type BookingRow = Prisma.BookingGetPayload<{
  select: typeof bookingSelect;
}>;

export type HostBookingRow = Prisma.BookingGetPayload<{
  select: typeof hostBookingSelect;
}>;

/** A booking row → `BookingDto` (D-016): the `date` columns become `IsoDate`s. */
export function toBookingDto(row: BookingRow): BookingDto {
  return {
    id: row.id,
    listingId: row.listingId,
    checkIn: toIsoDate(row.checkIn),
    checkOut: toIsoDate(row.checkOut),
    guests: row.guests,
    status: row.status,
  };
}

/**
 * A booking row with its listing → the host table's item. Bookings carry no
 * price, so the total uses the listing's current price per night.
 */
export function toHostBooking(row: HostBookingRow): HostBooking {
  const booking = toBookingDto(row);
  return {
    ...booking,
    listingTitle: row.listing.title,
    totalCents: stayTotalCents(
      booking.checkIn,
      booking.checkOut,
      row.listing.pricePerNightCents,
    ),
  };
}
