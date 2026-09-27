import { parseIsoDate, toIsoDate, type IsoDate } from '@ars/shared';
import { CalendarIcon } from 'lucide-react';
import { useId, useState } from 'react';
import { DESKTOP_QUERY, useMediaQuery } from '../hooks/useMediaQuery';
import {
  formatDateRange,
  formatLongDate,
  formatShortDate,
} from '../lib/format';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { Calendar } from './ui/calendar';
import { fieldLabelId } from './ui/form-field';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

/** A stay being picked: arrival, then departure (the checkout day). */
export interface PickedRange {
  from?: IsoDate;
  to?: IsoDate;
}

export interface DateRangePickerProps {
  value: PickedRange;
  onChange: (range: PickedRange) => void;
  /** The earliest day that can be picked. */
  minDate: IsoDate;
  placeholder?: string;
  id?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
  className?: string;
}

/**
 * Arrival and departure in one calendar popover: two months on wide screens,
 * one on phones. Days are `IsoDate`s; the calendar runs in UTC, like every
 * date in the app (D-012), and closes once both days are picked.
 */
export function DateRangePicker({
  value,
  onChange,
  minDate,
  placeholder = 'Add dates',
  className,
  ...triggerProps
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const valueId = useId();
  const { from, to } = value;

  let label = placeholder;
  if (from !== undefined && to !== undefined) {
    label = formatDateRange(from, to);
  } else if (from !== undefined) {
    label = `${formatShortDate(from)} – add check-out`;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className={cn('w-full justify-start font-normal', className)}
            {...triggerProps}
            // The label and the chosen dates together name the button.
            aria-labelledby={
              triggerProps.id === undefined
                ? undefined
                : `${fieldLabelId(triggerProps.id)} ${valueId}`
            }
          />
        }
      >
        <CalendarIcon aria-hidden="true" className="text-muted-foreground" />
        <span
          id={valueId}
          className={cn(
            'truncate',
            from === undefined && 'text-muted-foreground',
          )}
        >
          {label}
        </span>
      </PopoverTrigger>
      <PopoverContent
        aria-label="Choose dates"
        className="w-auto p-0"
        align="start"
      >
        <Calendar
          mode="range"
          min={1}
          resetOnSelect
          timeZone="UTC"
          weekStartsOn={1}
          numberOfMonths={isDesktop ? 2 : 1}
          defaultMonth={parseIsoDate(from ?? minDate)}
          selected={{
            from: from === undefined ? undefined : parseIsoDate(from),
            to: to === undefined ? undefined : parseIsoDate(to),
          }}
          onSelect={(range) => {
            const picked = {
              from: range?.from && toIsoDate(range.from),
              to: range?.to && toIsoDate(range.to),
            };
            onChange(picked);
            if (picked.from !== undefined && picked.to !== undefined) {
              setOpen(false);
            }
          }}
          disabled={{ before: parseIsoDate(minDate) }}
          labels={{
            labelPrevious: () => 'Previous month',
            labelNext: () => 'Next month',
            labelDayButton: (date, modifiers) =>
              `${formatLongDate(toIsoDate(date))}${
                modifiers.disabled ? ', unavailable' : ''
              }${modifiers.selected ? ', selected' : ''}`,
          }}
          className="[--cell-size:--spacing(9)]"
        />
      </PopoverContent>
    </Popover>
  );
}
