import type { BookingStatus } from '@ars/shared';

/** How the host panel names each stored booking status. */
export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
};
