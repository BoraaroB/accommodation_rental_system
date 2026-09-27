import { today, type BookingStatus, type HostBooking } from '@ars/shared';
import { Badge } from '../../../components/ui/badge';
import { BOOKING_STATUS_LABELS } from '../bookingStatuses';
import { stayTiming, type StayTiming } from '../stayTiming';

const STATUS_VARIANTS: Record<BookingStatus, 'secondary' | 'destructive'> = {
  confirmed: 'secondary',
  completed: 'secondary',
  cancelled: 'destructive',
};

const TIMING: Record<
  StayTiming,
  { label: string; variant: 'default' | 'outline' }
> = {
  past: { label: 'Past', variant: 'outline' },
  'in-progress': { label: 'In progress', variant: 'default' },
  upcoming: { label: 'Upcoming', variant: 'outline' },
};

/**
 * The booking's stored status and, unless it is cancelled, where the stay is
 * today: a `confirmed` stay whose checkout has passed shows as past (D-013).
 */
export function BookingBadges({ booking }: { booking: HostBooking }) {
  const timing =
    booking.status === 'cancelled'
      ? undefined
      : TIMING[stayTiming(booking, today())];
  return (
    <span className="flex flex-wrap gap-1">
      <Badge variant={STATUS_VARIANTS[booking.status]}>
        {BOOKING_STATUS_LABELS[booking.status]}
      </Badge>
      {timing && <Badge variant={timing.variant}>{timing.label}</Badge>}
    </span>
  );
}
