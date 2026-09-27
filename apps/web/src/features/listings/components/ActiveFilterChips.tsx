import type { ListingQuery } from '@ars/shared';
import { XIcon } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { formatDateRange, formatMoney, pluralize } from '../../../lib/format';
import {
  useListingFilters,
  type ListingFilterChanges,
} from '../hooks/useListingFilters';

interface Chip {
  label: string;
  /** The changes that remove this filter. */
  remove: ListingFilterChanges;
}

function priceLabel(min: number | undefined, max: number | undefined) {
  if (min !== undefined && max !== undefined) {
    return `${formatMoney(min)} – ${formatMoney(max)}`;
  }
  return min !== undefined
    ? `From ${formatMoney(min)}`
    : `Up to ${formatMoney(max ?? 0)}`;
}

function chipsOf(filters: ListingQuery): Chip[] {
  const chips: Chip[] = [];
  if (filters.city !== undefined) {
    chips.push({ label: filters.city, remove: { city: undefined } });
  }
  if (filters.from !== undefined && filters.to !== undefined) {
    chips.push({
      label: formatDateRange(filters.from, filters.to),
      remove: { from: undefined, to: undefined },
    });
  }
  if (filters.guests !== undefined) {
    chips.push({
      label: pluralize(filters.guests, 'guest'),
      remove: { guests: undefined },
    });
  }
  if (
    filters.minPriceCents !== undefined ||
    filters.maxPriceCents !== undefined
  ) {
    chips.push({
      label: priceLabel(filters.minPriceCents, filters.maxPriceCents),
      remove: { minPriceCents: undefined, maxPriceCents: undefined },
    });
  }
  return chips;
}

/** The active filters, each removable on its own without opening a form. */
export function ActiveFilterChips() {
  const { filters, applyFilters, clearFilters } = useListingFilters();
  const chips = chipsOf(filters);
  if (chips.length === 0) {
    return null;
  }
  return (
    <ul
      aria-label="Active filters"
      className="flex flex-wrap items-center gap-2"
    >
      {chips.map((chip) => (
        <li key={chip.label}>
          <button
            type="button"
            aria-label={`Remove filter: ${chip.label}`}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 pr-2 pl-3 text-sm hover:bg-primary/15"
            onClick={() => applyFilters(chip.remove)}
          >
            {chip.label}
            <XIcon aria-hidden="true" className="size-3.5" />
          </button>
        </li>
      ))}
      <li>
        <Button variant="link" size="sm" onClick={clearFilters}>
          Clear all
        </Button>
      </li>
    </ul>
  );
}
