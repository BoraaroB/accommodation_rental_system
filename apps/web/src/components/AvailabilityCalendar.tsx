import {
  addMonths,
  parseIsoDate,
  toIsoDate,
  type DateRange,
  type IsoDate,
} from '@ars/shared';
import { DESKTOP_QUERY, useMediaQuery } from '../hooks/useMediaQuery';
import { formatLongDate } from '../lib/format';
import { cn } from '../lib/utils';
import { Calendar } from './ui/calendar';

/** What a day means for a stay; `unknown` while its data is not loaded. */
export type DayStatus = 'available' | 'unavailable' | 'past' | 'unknown';

const STATUS_LABELS: Record<DayStatus, string> = {
  available: 'available',
  unavailable: 'unavailable',
  past: 'in the past',
  unknown: 'loading',
};

export interface AvailabilityCalendarProps {
  /** The first day of the first month shown: one month on phones, two from `md` up. */
  month: IsoDate;
  /** The first and last month the navigation may show first. */
  minMonth: IsoDate;
  maxMonth: IsoDate;
  onMonthChange: (month: IsoDate) => void;
  getDayStatus: (day: IsoDate) => DayStatus;
  /** Days `[from, to)` to highlight, e.g. the searched stay. */
  highlight?: DateRange;
  /** While the days' statuses load. */
  busy?: boolean;
}

/**
 * Month grids with each day's status, on the UI kit's calendar
 * (react-day-picker) in UTC, like every date in the app (D-012). Taken days
 * are struck through, and a screen reader hears every day's date and status.
 */
export function AvailabilityCalendar({
  month,
  minMonth,
  maxMonth,
  onMonthChange,
  getDayStatus,
  highlight,
  busy = false,
}: AvailabilityCalendarProps) {
  const numberOfMonths = useMediaQuery(DESKTOP_QUERY) ? 2 : 1;
  const statusOf = (date: Date) => getDayStatus(toIsoDate(date));
  const inStay = (date: Date) => {
    const day = toIsoDate(date);
    return (
      highlight !== undefined && highlight.from <= day && day < highlight.to
    );
  };

  return (
    <div
      aria-busy={busy}
      className={cn('flex flex-col gap-4', busy && 'opacity-60')}
    >
      <Calendar
        timeZone="UTC"
        weekStartsOn={1}
        showOutsideDays={false}
        numberOfMonths={numberOfMonths}
        month={parseIsoDate(month)}
        onMonthChange={(date) => onMonthChange(toIsoDate(date))}
        startMonth={parseIsoDate(minMonth)}
        // The last month shown when the first one is `maxMonth`.
        endMonth={parseIsoDate(addMonths(maxMonth, numberOfMonths - 1))}
        modifiers={{
          unavailable: (date) => statusOf(date) === 'unavailable',
          past: (date) => statusOf(date) === 'past',
          unknown: (date) => statusOf(date) === 'unknown',
          stay: inStay,
        }}
        modifiersClassNames={{
          unavailable: 'bg-muted text-muted-foreground line-through',
          past: 'text-muted-foreground opacity-40',
          unknown: 'text-muted-foreground',
          stay: 'bg-primary/10 font-semibold text-primary ring-1 ring-primary/40 ring-inset',
        }}
        labels={{
          labelGridcell: (date, modifiers) =>
            `${formatLongDate(toIsoDate(date))}, ${STATUS_LABELS[statusOf(date)]}${
              modifiers?.stay ? ', your dates' : ''
            }`,
          labelPrevious: () => 'Previous month',
          labelNext: () => 'Next month',
        }}
        className="w-full bg-transparent p-0 [--cell-size:--spacing(10)]"
        classNames={{
          root: 'w-full',
          months: 'relative flex flex-col gap-6 md:flex-row',
          month: 'flex w-full flex-col gap-3',
          // A fixed height keeps wide months from turning into tall squares.
          day: 'flex h-11 w-full items-center justify-center rounded-(--cell-radius) text-sm select-none',
        }}
      />
      <ul className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <li className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="size-4 rounded-sm ring-1 ring-border ring-inset"
          />
          Available
        </li>
        <li className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="rounded-sm bg-muted px-1 line-through"
          >
            12
          </span>
          Unavailable
        </li>
        {highlight && (
          <li className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="size-4 rounded-sm bg-primary/10 ring-1 ring-primary/40 ring-inset"
            />
            Your dates
          </li>
        )}
      </ul>
    </div>
  );
}
