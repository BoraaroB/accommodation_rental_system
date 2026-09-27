import {
  addDays,
  addMonths,
  parseIsoDate,
  toIsoDate,
  type DateRange,
  type IsoDate,
} from '@ars/shared';
import type { DateRange as PickedDays } from 'react-day-picker';
import { DESKTOP_QUERY, useMediaQuery } from '../hooks/useMediaQuery';
import { formatLongDate } from '../lib/format';
import { cn } from '../lib/utils';
import { Calendar } from './ui/calendar';

/**
 * What a day means for a stay; `unknown` while its data is not loaded. The
 * portal says only `unavailable`; the host sees whether a day is `booked` or
 * `blocked`.
 */
export type DayStatus =
  'available' | 'unavailable' | 'booked' | 'blocked' | 'past' | 'unknown';

/** The statuses the legend can explain. */
export type LegendStatus = Exclude<DayStatus, 'past' | 'unknown'>;

const STATUS_LABELS: Record<DayStatus, string> = {
  available: 'available',
  unavailable: 'unavailable',
  booked: 'booked',
  blocked: 'blocked',
  past: 'in the past',
  unknown: 'loading',
};

/** Days a host may select: free ones to block, blocked ones to unblock. */
const SELECTABLE: ReadonlySet<DayStatus> = new Set(['available', 'blocked']);

const TAKEN_CLASSES = 'bg-muted text-muted-foreground line-through';
const BLOCKED_CLASSES = 'bg-destructive/10 text-destructive line-through';

/** Each legend entry: its name and the classes of its sample day. */
const LEGEND: Record<LegendStatus, { label: string; classes?: string }> = {
  available: { label: 'Available' },
  unavailable: { label: 'Unavailable', classes: TAKEN_CLASSES },
  booked: { label: 'Booked', classes: TAKEN_CLASSES },
  blocked: { label: 'Blocked', classes: BLOCKED_CLASSES },
};

/** The picked days as a range `[from, to)`; one day while only one is picked. */
function toDateRange({ from, to }: PickedDays): DateRange | undefined {
  if (from === undefined) {
    return undefined;
  }
  return { from: toIsoDate(from), to: addDays(toIsoDate(to ?? from), 1) };
}

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
  /** The statuses the legend explains; the portal's by default. */
  legend?: readonly LegendStatus[];
  /** The selected days `[from, to)`, shown when `onSelectRange` is set. */
  selected?: DateRange;
  /**
   * Makes the calendar select a day or a range of available and blocked days;
   * a range cannot span any other day. `undefined` clears the selection.
   */
  onSelectRange?: (range: DateRange | undefined) => void;
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
  legend = ['available', 'unavailable'],
  selected,
  onSelectRange,
}: AvailabilityCalendarProps) {
  const numberOfMonths = useMediaQuery(DESKTOP_QUERY) ? 2 : 1;
  const statusOf = (date: Date) => getDayStatus(toIsoDate(date));
  const inStay = (date: Date) => {
    const day = toIsoDate(date);
    return (
      highlight !== undefined && highlight.from <= day && day < highlight.to
    );
  };
  const labelDay = (
    date: Date,
    modifiers?: { stay?: boolean; selected?: boolean },
  ) =>
    `${formatLongDate(toIsoDate(date))}, ${STATUS_LABELS[statusOf(date)]}${
      modifiers?.stay ? ', your dates' : ''
    }${modifiers?.selected ? ', selected' : ''}`;
  // Without `onSelectRange` the days are plain grid cells, not buttons.
  const selection =
    onSelectRange === undefined
      ? {}
      : {
          mode: 'range' as const,
          selected: selected && {
            from: parseIsoDate(selected.from),
            to: parseIsoDate(addDays(selected.to, -1)),
          },
          onSelect: (days: PickedDays | undefined) =>
            onSelectRange(days && toDateRange(days)),
          disabled: (date: Date) => !SELECTABLE.has(statusOf(date)),
          // A range over a day that cannot be selected starts again from the
          // day clicked.
          excludeDisabled: true,
        };

  return (
    <div
      aria-busy={busy}
      className={cn('flex flex-col gap-4', busy && 'opacity-60')}
    >
      <Calendar
        {...selection}
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
          booked: (date) => statusOf(date) === 'booked',
          blocked: (date) => statusOf(date) === 'blocked',
          past: (date) => statusOf(date) === 'past',
          unknown: (date) => statusOf(date) === 'unknown',
          stay: inStay,
        }}
        modifiersClassNames={{
          unavailable: TAKEN_CLASSES,
          booked: TAKEN_CLASSES,
          blocked: BLOCKED_CLASSES,
          past: 'text-muted-foreground opacity-40',
          unknown: 'text-muted-foreground',
          stay: 'bg-primary/10 font-semibold text-primary ring-1 ring-primary/40 ring-inset',
        }}
        labels={{
          labelGridcell: labelDay,
          labelDayButton: labelDay,
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
        {legend.map((status) => {
          const { label, classes } = LEGEND[status];
          return (
            <li key={status} className="flex items-center gap-2">
              {classes === undefined ? (
                <span
                  aria-hidden="true"
                  className="size-4 rounded-sm ring-1 ring-border ring-inset"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className={cn('rounded-sm px-1', classes)}
                >
                  12
                </span>
              )}
              {label}
            </li>
          );
        })}
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
