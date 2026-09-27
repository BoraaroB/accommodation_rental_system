import { centsToEuros, eurosToCents, type ListingQuery } from '@ars/shared';
import { useState } from 'react';
import { useController, type Control, type FieldError } from 'react-hook-form';
import { FormField } from '../../../components/ui/form-field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '../../../components/ui/input-group';
import type { ListingFiltersForm } from '../listingFilters';

type PriceField = 'minPriceCents' | 'maxPriceCents';

/** Euros as typed: digits, optionally a point and one or two decimals. */
const EUROS_PATTERN = /^\d+(\.\d{1,2})?$/;

/**
 * Cents for an amount typed in euros; `NaN` when the text is not an amount,
 * which the schema rejects (text would be coerced: "1e2" reads as 100);
 * `undefined` when empty.
 */
function toCents(text: string): number | undefined {
  const trimmed = text.trim();
  if (trimmed === '') {
    return undefined;
  }
  // Plain decimal notation only: `Number` would also read "1e2" or "0x10".
  if (!EUROS_PATTERN.test(trimmed)) {
    return Number.NaN;
  }
  try {
    return eurosToCents(Number(trimmed));
  } catch {
    return Number.NaN;
  }
}

/** The euros to show for a value of the form: only whole cents have a text. */
function toText(value: unknown): string {
  return typeof value === 'number' && Number.isSafeInteger(value)
    ? String(centsToEuros(value))
    : '';
}

function priceError(error: FieldError | undefined): string | undefined {
  if (error === undefined) {
    return undefined;
  }
  // `custom` is the schema's rule across fields: the maximum below the minimum.
  return error.type === 'custom'
    ? 'Must not be below the minimum'
    : 'Enter an amount in euros, e.g. 80 or 79.99';
}

/**
 * One price bound: typed in euros, held in the form as integer cents, the
 * only unit of the URL and the API (D-011).
 */
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
  const [text, setText] = useState(() => toText(field.value));
  // The value this input last wrote; any other value came from outside
  // (a reset, a new URL) and replaces the text.
  const [ownValue, setOwnValue] = useState<unknown>(field.value);
  // `Object.is`, because an invalid amount is NaN, which is not `===` itself.
  if (!Object.is(field.value, ownValue)) {
    setOwnValue(field.value);
    setText(toText(field.value));
  }

  return (
    <FormField label={label} error={priceError(fieldState.error)}>
      {(fieldControl) => (
        <InputGroup className="h-9">
          <InputGroupAddon>
            <InputGroupText>€</InputGroupText>
          </InputGroupAddon>
          <InputGroupInput
            {...fieldControl}
            name={field.name}
            ref={field.ref}
            inputMode="decimal"
            autoComplete="off"
            value={text}
            onBlur={field.onBlur}
            onChange={(event) => {
              const value = toCents(event.target.value);
              setText(event.target.value);
              setOwnValue(value);
              field.onChange(value);
            }}
          />
        </InputGroup>
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
