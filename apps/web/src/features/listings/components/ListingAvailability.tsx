import type { DateRange, IsoDate } from '@ars/shared';
import { useMemo } from 'react';
import { useGetAvailabilityQuery } from '../../../api/availabilityApi';
import { getErrorMessage, getRequestId } from '../../../api/errors';
import {
  AvailabilityCalendar,
  type DayStatus,
} from '../../../components/AvailabilityCalendar';
import { ErrorBoundary } from '../../../components/ui/error-boundary';
import { ErrorState } from '../../../components/ui/error-state';
import { useCalendarMonths } from '../../../hooks/useCalendarMonths';

/**
 * When the listing is available to book (challenge item 4): the calendar of
 * the months shown, one availability request per view.
 */
export function ListingAvailability({
  tenantSlug,
  listingId,
  stay,
}: {
  tenantSlug: string;
  listingId: string;
  /** The searched stay: highlighted, and its month is shown first. */
  stay?: DateRange;
}) {
  const { firstDay, minMonth, maxMonth, month, setMonth, shown } =
    useCalendarMonths(stay?.from);
  const availability = useGetAvailabilityQuery({
    tenantSlug,
    id: listingId,
    range: shown,
  });
  const loaded = availability.currentData;
  const taken = useMemo(() => new Set(loaded?.unavailableDays), [loaded]);

  const getDayStatus = (day: IsoDate): DayStatus => {
    if (day < firstDay) {
      return 'past';
    }
    if (loaded === undefined) {
      return 'unknown';
    }
    return taken.has(day) ? 'unavailable' : 'available';
  };

  return (
    <div className="flex flex-col gap-4">
      <ErrorBoundary
        fallback={<ErrorState message="The calendar could not be shown." />}
      >
        <AvailabilityCalendar
          month={month}
          minMonth={minMonth}
          maxMonth={maxMonth}
          onMonthChange={setMonth}
          getDayStatus={getDayStatus}
          highlight={stay}
          busy={availability.isFetching}
        />
      </ErrorBoundary>
      {availability.isError && (
        <ErrorState
          message={getErrorMessage(availability.error)}
          requestId={getRequestId(availability.error)}
          onRetry={() => void availability.refetch()}
        />
      )}
    </div>
  );
}
