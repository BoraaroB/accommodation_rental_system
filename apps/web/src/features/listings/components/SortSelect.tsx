import { listingSortSchema, type ListingSort } from '@ars/shared';
import { useId } from 'react';
import { Label } from '../../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { useListingFilters } from '../hooks/useListingFilters';

const SORT_LABELS: Record<ListingSort, string> = {
  newest: 'Newest',
  price_asc: 'Price (lowest first)',
  price_desc: 'Price (highest first)',
  rating_desc: 'Top rated',
};

const SORT_ITEMS = listingSortSchema.options.map((value) => ({
  value,
  label: SORT_LABELS[value],
}));

/** The list's order. */
export function SortSelect() {
  const { filters, applyFilters } = useListingFilters();
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <Label
        htmlFor={id}
        className="font-normal whitespace-nowrap text-muted-foreground"
      >
        Sort by
      </Label>
      <Select
        items={SORT_ITEMS}
        value={filters.sort}
        onValueChange={(value) => {
          const sort = listingSortSchema.safeParse(value);
          if (sort.success) {
            applyFilters({ sort: sort.data });
          }
        }}
      >
        <SelectTrigger id={id} className="w-48 bg-card data-[size=default]:h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SORT_ITEMS.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
