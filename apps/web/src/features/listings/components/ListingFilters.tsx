import { listingQuerySchema } from '@ars/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '../../../components/ui/button';
import { useListingFilters } from '../hooks/useListingFilters';
import { PriceRangeInput } from './PriceRangeInput';

/**
 * "Filter by": the price range. The same form sits in the sidebar on desktop
 * and in the drawer on phones.
 */
export function ListingFilters({ onDone }: { onDone?: () => void }) {
  const { filters, applyFilters } = useListingFilters();
  const { control, handleSubmit, reset } = useForm({
    resolver: zodResolver(listingQuerySchema),
    defaultValues: filters,
  });

  const submit = handleSubmit(({ minPriceCents, maxPriceCents }) => {
    applyFilters({ minPriceCents, maxPriceCents });
    onDone?.();
  });

  return (
    <form
      noValidate
      aria-label="Filter by"
      onSubmit={(event) => void submit(event)}
      className="flex flex-col gap-4"
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Price per night</legend>
        <PriceRangeInput control={control} />
      </fieldset>
      <div className="flex gap-2">
        <Button type="submit" className="flex-1">
          Apply
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => {
            const cleared = {
              minPriceCents: undefined,
              maxPriceCents: undefined,
            };
            // Also clears prices typed but not applied: the URL may not change.
            reset({ ...filters, ...cleared });
            applyFilters(cleared);
            onDone?.();
          }}
        >
          Reset
        </Button>
      </div>
    </form>
  );
}
