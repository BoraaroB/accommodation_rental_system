import type { BookingDto, IsoDate } from '@ars/shared';

/** Where a stay is relative to a day: over, going on, or still ahead. */
export type StayTiming = 'past' | 'in-progress' | 'upcoming';

/**
 * A stay's timing on `day` (today in the app). A stay `[checkIn, checkOut)`
 * is over on its checkout day. The stored status is kept as delivered, even
 * when it is stale; this tells the host what is happening now (D-013).
 */
export function stayTiming(
  { checkIn, checkOut }: Pick<BookingDto, 'checkIn' | 'checkOut'>,
  day: IsoDate,
): StayTiming {
  if (checkOut <= day) {
    return 'past';
  }
  return checkIn <= day ? 'in-progress' : 'upcoming';
}
