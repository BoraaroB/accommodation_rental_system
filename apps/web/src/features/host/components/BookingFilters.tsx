import { bookingStatusSchema, type HostBookingQuery } from '@ars/shared';
import { useState } from 'react';
import {
  DateRangePicker,
  type PickedRange,
} from '../../../components/DateRangePicker';
import { Button } from '../../../components/ui/button';
import { FormField } from '../../../components/ui/form-field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { BOOKING_STATUS_LABELS } from '../bookingStatuses';
import { hasBookingFilters } from '../hostFilters';
import { ListingPicker } from './ListingPicker';

/** Every status, or one; `all` is no filter. */
const STATUS_ITEMS = [
  { value: 'all', label: 'All statuses' },
  ...bookingStatusSchema.options.map((value) => ({
    value,
    label: BOOKING_STATUS_LABELS[value],
  })),
];

export type BookingFilterChanges = Partial<
  Pick<HostBookingQuery, 'listingId' | 'status' | 'from' | 'to'>
>;

/**
 * The booking table's filters: listing, status and dates. Each change is
 * applied at once, through the URL (D-017); dates apply once both are picked.
 * Past dates are allowed: the host sees the booking history too.
 */
export function BookingFilters({
  tenantSlug,
  filters,
  onChange,
  onClear,
}: {
  tenantSlug: string;
  filters: HostBookingQuery;
  onChange: (changes: BookingFilterChanges) => void;
  onClear: () => void;
}) {
  const { listingId, status, from, to } = filters;
  // A range being picked; the URL gets it once it has both days. A range
  // that changes in the URL (cleared, back) replaces it.
  const [dates, setDates] = useState<PickedRange>({ from, to });
  const [urlDates, setUrlDates] = useState<PickedRange>({ from, to });
  if (urlDates.from !== from || urlDates.to !== to) {
    setUrlDates({ from, to });
    setDates({ from, to });
  }

  return (
    <div className="grid gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 md:grid-cols-[1.6fr_1fr_1.2fr_auto] md:items-end">
      <FormField label="Listing">
        {(control) => (
          <ListingPicker
            {...control}
            tenantSlug={tenantSlug}
            listingId={listingId}
            onChange={(next) => onChange({ listingId: next })}
          />
        )}
      </FormField>
      <FormField label="Status">
        {(control) => (
          <Select
            items={STATUS_ITEMS}
            value={status ?? 'all'}
            onValueChange={(next) => {
              const parsed = bookingStatusSchema.safeParse(next);
              onChange({ status: parsed.success ? parsed.data : undefined });
            }}
          >
            <SelectTrigger
              {...control}
              className="w-full bg-card data-[size=default]:h-9"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_ITEMS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </FormField>
      <FormField label="Dates">
        {(control) => (
          <DateRangePicker
            {...control}
            value={dates}
            placeholder="Any dates"
            className="h-9 bg-card"
            onChange={(range) => {
              setDates(range);
              if (range.from !== undefined && range.to !== undefined) {
                onChange({ from: range.from, to: range.to });
              }
            }}
          />
        )}
      </FormField>
      <Button
        variant="ghost"
        className="h-9"
        onClick={onClear}
        disabled={!hasBookingFilters(filters)}
      >
        Clear filters
      </Button>
    </div>
  );
}
