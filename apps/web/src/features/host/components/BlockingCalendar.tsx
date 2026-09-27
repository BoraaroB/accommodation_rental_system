import { addDays, eachDay, type DateRange, type IsoDate } from '@ars/shared';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useGetAvailabilityQuery } from '../../../api/availabilityApi';
import { getErrorMessage, getRequestId } from '../../../api/errors';
import {
  AvailabilityCalendar,
  type DayStatus,
} from '../../../components/AvailabilityCalendar';
import { FormAlert } from '../../../components/FormAlert';
import { Button } from '../../../components/ui/button';
import { ErrorBoundary } from '../../../components/ui/error-boundary';
import { ErrorState } from '../../../components/ui/error-state';
import { useCalendarMonths } from '../../../hooks/useCalendarMonths';
import {
  formatDateRange,
  formatLongDate,
  pluralize,
} from '../../../lib/format';
import {
  useBlockDaysMutation,
  useGetBlockedDaysQuery,
  useUnblockDaysMutation,
} from '../api';

/** "3 days: 5 – 7 Oct" or "1 day: Monday, 5 October 2026". */
function describeDays({ from, to }: DateRange): string {
  const last = addDays(to, -1);
  const days =
    last === from ? formatLongDate(from) : formatDateRange(from, last);
  return `${pluralize(eachDay(from, to).length, 'day')}: ${days}`;
}

/** Whether a response for `[from, to)` says anything about `day`. */
function covers(
  response: DateRange | undefined,
  day: IsoDate,
): response is DateRange {
  return response !== undefined && response.from <= day && day < response.to;
}

/**
 * The listing's calendar in blocking mode (challenge item 8): booked days
 * cannot be selected; the host selects a day or a range of free and blocked
 * days, then blocks or unblocks it. Booked days are the days the public
 * availability lists as taken, less the blocked ones (D-066).
 */
export function BlockingCalendar({
  tenantSlug,
  listingId,
}: {
  tenantSlug: string;
  listingId: string;
}) {
  const { firstDay, minMonth, maxMonth, month, setMonth, shown } =
    useCalendarMonths();
  const [selected, setSelected] = useState<DateRange>();
  const [blockDays, blocking] = useBlockDaysMutation();
  const [unblockDays, unblocking] = useUnblockDaysMutation();

  // The months shown, stretched over the selection: a range finished in
  // another month must not cross days whose status is unknown, which cannot
  // be selected.
  const range: DateRange = {
    from: selected && selected.from < shown.from ? selected.from : shown.from,
    to: selected && selected.to > shown.to ? selected.to : shown.to,
  };
  const args = { tenantSlug, id: listingId, range };
  const availability = useGetAvailabilityQuery(args);
  const blocked = useGetBlockedDaysQuery(args);
  // The latest answers, also while a new range loads: the days they cover
  // keep their status.
  const takenDays = availability.data;
  const blockedDays = blocked.data;
  const taken = useMemo(() => new Set(takenDays?.unavailableDays), [takenDays]);
  const blockedSet = useMemo(() => new Set(blockedDays?.days), [blockedDays]);

  const getDayStatus = (day: IsoDate): DayStatus => {
    if (day < firstDay) {
      return 'past';
    }
    if (!covers(takenDays, day) || !covers(blockedDays, day)) {
      return 'unknown';
    }
    if (blockedSet.has(day)) {
      return 'blocked';
    }
    return taken.has(day) ? 'booked' : 'available';
  };

  const selectedStatuses = selected
    ? eachDay(selected.from, selected.to).map(getDayStatus)
    : [];
  const busy = blocking.isLoading || unblocking.isLoading;

  const select = (next: DateRange | undefined) => {
    blocking.reset();
    unblocking.reset();
    setSelected(next);
  };

  const run = async (action: 'block' | 'unblock') => {
    if (selected === undefined) {
      return;
    }
    blocking.reset();
    unblocking.reset();
    const request = action === 'block' ? blockDays : unblockDays;
    const result = await request({
      tenantSlug,
      id: listingId,
      range: selected,
    });
    if (result.error === undefined) {
      toast.success(
        `${action === 'block' ? 'Blocked' : 'Unblocked'} ${describeDays(selected)}`,
      );
      // Days selected while the request ran stay selected.
      setSelected((current) => (current === selected ? undefined : current));
    }
  };

  const loadError = availability.error ?? blocked.error;

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
          busy={availability.isFetching || blocked.isFetching}
          legend={['available', 'booked', 'blocked']}
          selected={selected}
          onSelectRange={select}
        />
      </ErrorBoundary>
      {(availability.isError || blocked.isError) && (
        <ErrorState
          message={getErrorMessage(loadError)}
          requestId={getRequestId(loadError)}
          onRetry={() => {
            void availability.refetch();
            void blocked.refetch();
          }}
        />
      )}
      <FormAlert error={blocking.error ?? unblocking.error} />
      {selected === undefined ? (
        <p className="text-sm text-muted-foreground">
          Select a day, or a first and a last day, to block or unblock them.
          Booked days cannot be blocked.
        </p>
      ) : (
        <div className="flex flex-col gap-3 rounded-lg bg-muted p-3 md:flex-row md:items-center md:justify-between">
          <p role="status" className="text-sm font-medium">
            Selected {describeDays(selected)}
          </p>
          <div className="flex gap-2">
            <Button
              onClick={() => void run('block')}
              disabled={
                busy || selectedStatuses.every((status) => status === 'blocked')
              }
            >
              Block
            </Button>
            <Button
              variant="outline"
              className="bg-card"
              onClick={() => void run('unblock')}
              disabled={
                busy ||
                !selectedStatuses.some(
                  (status) => status === 'blocked' || status === 'unknown',
                )
              }
            >
              Unblock
            </Button>
            <Button variant="ghost" onClick={() => select(undefined)}>
              Clear
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
