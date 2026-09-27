import {
  addMonths,
  startOfMonth,
  today,
  type DateRange,
  type IsoDate,
} from '@ars/shared';
import { useMemo, useState } from 'react';
import { getErrorMessage, getRequestId } from '../../../api/errors';
import {
  AvailabilityCalendar,
  type DayStatus,
} from '../../../components/AvailabilityCalendar';
import { ErrorBoundary } from '../../../components/ui/error-boundary';
import { ErrorState } from '../../../components/ui/error-state';
import { useGetAvailabilityQuery } from '../api';

/** How far ahead the calendar goes: its first month is at most a year away. */
const MAX_MONTHS_AHEAD = 11;

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
  const firstDay = today();
  const minMonth = startOfMonth(firstDay);
  const maxMonth = addMonths(minMonth, MAX_MONTHS_AHEAD);
  const [month, setMonth] = useState(() => {
    const stayMonth = startOfMonth(stay?.from ?? firstDay);
    return stayMonth > maxMonth ? maxMonth : stayMonth;
  });

  // The two months shown, from today on: the API answers only for upcoming days.
  const range: DateRange = {
    from: month < firstDay ? firstDay : month,
    to: addMonths(month, 2),
  };
  const availability = useGetAvailabilityQuery({
    tenantSlug,
    id: listingId,
    range,
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
