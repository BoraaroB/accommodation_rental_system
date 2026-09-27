import type { ListingQuery } from '@ars/shared';
import { useController, type Control, type FieldError } from 'react-hook-form';
import { MoneyInput } from '../../../components/MoneyInput';
import { FormField } from '../../../components/ui/form-field';
import type { ListingFiltersForm } from '../listingFilters';

type PriceField = 'minPriceCents' | 'maxPriceCents';

function priceError(error: FieldError | undefined): string | undefined {
  if (error === undefined) {
    return undefined;
  }
  // `custom` is the schema's rule across fields: the maximum below the minimum.
  return error.type === 'custom'
    ? 'Must not be below the minimum'
    : 'Enter an amount in euros, e.g. 80 or 79.99';
}

/** One price bound, typed in euros and held in the form as cents. */
function PriceInput({
  control,
  name,
  label,
}: {
  control: Control<ListingFiltersForm, unknown, ListingQuery>;
  name: PriceField;
  label: string;
}) {
  const { field, fieldState } = useController({ control, name });
  return (
    <FormField label={label} error={priceError(fieldState.error)}>
      {(fieldControl) => (
        <MoneyInput
          {...fieldControl}
          className="h-9"
          name={field.name}
          ref={field.ref}
          value={field.value}
          onBlur={field.onBlur}
          onChange={field.onChange}
        />
      )}
    </FormField>
  );
}

/** The minimum and maximum price per night, in euros. */
export function PriceRangeInput({
  control,
}: {
  control: Control<ListingFiltersForm, unknown, ListingQuery>;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <PriceInput control={control} name="minPriceCents" label="Min" />
      <PriceInput control={control} name="maxPriceCents" label="Max" />
    </div>
  );
}
