import { ConflictException, NotFoundException } from '@nestjs/common';

/**
 * The tenant of the URL has no listing with this id: it does not exist or
 * belongs to another tenant, and the two are not told apart (D-006).
 */
export class ListingNotFoundError extends NotFoundException {
  constructor() {
    super('Listing not found', { errorCode: 'LISTING_NOT_FOUND' });
  }
}

/** An edit would lower `maxGuests` below the guests of an active booking (D-014). */
export class MaxGuestsBelowBookingError extends ConflictException {
  constructor(guests: number) {
    super(`An active booking has ${guests} guests`, {
      errorCode: 'MAX_GUESTS_BELOW_BOOKING',
    });
  }
}
