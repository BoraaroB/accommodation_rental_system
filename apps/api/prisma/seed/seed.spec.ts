import type { BookingDto, ListingDto } from '@ars/shared';
import { describe, expect, it } from 'vitest';
import { assertGuestsFit } from './seed.js';

const listing = { id: 'listing-1', maxGuests: 3 } as ListingDto;
const booking = (guests: number, listingId = listing.id) =>
  ({ id: 'booking-1', listingId, guests }) as BookingDto;

describe('assertGuestsFit', () => {
  it.each([1, 3])('accepts %s guests for a listing of 3', (guests) => {
    expect(() => assertGuestsFit([listing], [booking(guests)])).not.toThrow();
  });

  it('rejects more guests than the listing allows', () => {
    expect(() => assertGuestsFit([listing], [booking(4)])).toThrow(
      'Booking booking-1 has 4 guests; its listing allows 3',
    );
  });

  it('leaves a booking of an unknown listing to the foreign key', () => {
    expect(() =>
      assertGuestsFit([listing], [booking(12, 'listing-2')]),
    ).not.toThrow();
  });
});
