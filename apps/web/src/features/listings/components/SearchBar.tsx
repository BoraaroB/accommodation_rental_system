import { listingQuerySchema, today } from '@ars/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { SearchIcon } from 'lucide-react';
import { useId, useState } from 'react';
import {
  Controller,
  useForm,
  useWatch,
  type FieldError,
} from 'react-hook-form';
import { DateRangePicker } from '../../../components/DateRangePicker';
import { Button } from '../../../components/ui/button';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '../../../components/ui/combobox';
import { FormField } from '../../../components/ui/form-field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { useTenantSlug } from '../../../hooks/useTenantSlug';
import { formatDateRange, pluralize } from '../../../lib/format';
import { cn } from '../../../lib/utils';
import { useGetCitiesQuery } from '../api';
import { useListingFilters } from '../hooks/useListingFilters';

/** "Any", then 1–12 guests; `null` is "any" (the filter is not sent). */
const GUEST_ITEMS = [
  { value: null, label: 'Any' },
  ...Array.from({ length: 12 }, (_, index) => ({
    value: index + 1,
    label: pluralize(index + 1, 'guest'),
  })),
];

// The schema's date rules in the visitor's words, chosen by what was entered.
function datesError(
  errors: { from?: FieldError; to?: FieldError },
  from: string | undefined,
  to: string | undefined,
) {
  if (errors.from !== undefined) {
    if (from === undefined) {
      return 'Choose a check-in date';
    }
    return from < today()
      ? 'Check-in cannot be in the past'
      : 'Enter a valid date';
  }
  if (errors.to !== undefined) {
    return to === undefined
      ? 'Choose a check-out date'
      : 'Check-out must be after check-in';
  }
  return undefined;
}

/**
 * The main search on top of the results: city, dates and guests (D-025). On
 * phones it is a summary of the current search that opens the form.
 */
export function SearchBar() {
  const tenantSlug = useTenantSlug();
  const cities = useGetCitiesQuery(tenantSlug);
  const { filters, applyFilters } = useListingFilters();
  const [expanded, setExpanded] = useState(false);
  const formId = useId();

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitted },
  } = useForm({
    resolver: zodResolver(listingQuerySchema),
    defaultValues: filters,
  });
  const [from, to] = useWatch({ control, name: ['from', 'to'] });

  const submit = handleSubmit(({ city, from, to, guests }) => {
    applyFilters({ city, from, to, guests });
    setExpanded(false);
  });

  const summary = [
    filters.city ?? 'Anywhere',
    filters.from && filters.to
      ? formatDateRange(filters.from, filters.to)
      : 'Any dates',
    filters.guests ? pluralize(filters.guests, 'guest') : 'Any guests',
  ].join(' · ');

  // A city from the URL stays selectable, even before the options load or
  // when this portal has no such city.
  const knownCities = cities.data ?? [];
  const cityOptions =
    filters.city === undefined || knownCities.includes(filters.city)
      ? knownCities
      : [...knownCities, filters.city];

  return (
    <section
      aria-label="Search"
      className="rounded-xl bg-card p-3 shadow-sm ring-1 ring-foreground/10 md:p-4"
    >
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={formId}
        className="flex h-11 w-full items-center gap-3 rounded-lg px-2 text-left text-sm font-medium md:hidden"
        onClick={() => setExpanded(!expanded)}
      >
        <SearchIcon
          aria-hidden="true"
          className="size-4 text-muted-foreground"
        />
        <span className="flex-1 truncate">{summary}</span>
        <span aria-hidden="true" className="text-primary">
          {expanded ? 'Close' : 'Edit'}
        </span>
      </button>

      <form
        id={formId}
        noValidate
        onSubmit={(event) => void submit(event)}
        className={cn(
          expanded ? 'mt-3 grid' : 'hidden',
          'gap-3 md:mt-0 md:grid md:grid-cols-[1.3fr_1.3fr_1fr_auto] md:items-start',
        )}
      >
        <FormField label="City">
          {(fieldControl) => (
            <Controller
              control={control}
              name="city"
              render={({ field }) => (
                <Combobox
                  items={cityOptions}
                  value={field.value ?? null}
                  onValueChange={(city) => field.onChange(city ?? undefined)}
                >
                  <ComboboxInput
                    {...fieldControl}
                    placeholder="Anywhere"
                    showClear={field.value !== undefined}
                    className="h-10 w-full"
                  />
                  <ComboboxContent>
                    <ComboboxEmpty>No city found.</ComboboxEmpty>
                    <ComboboxList>
                      {(city: string) => (
                        <ComboboxItem key={city} value={city}>
                          {city}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              )}
            />
          )}
        </FormField>
        <FormField label="Dates" error={datesError(errors, from, to)}>
          {(fieldControl) => (
            <DateRangePicker
              {...fieldControl}
              value={{ from, to }}
              minDate={today()}
              className="h-10 bg-transparent"
              onChange={(range) => {
                const options = { shouldValidate: isSubmitted };
                setValue('from', range.from, options);
                setValue('to', range.to, options);
              }}
            />
          )}
        </FormField>
        <FormField label="Guests">
          {(fieldControl) => (
            <Controller
              control={control}
              name="guests"
              render={({ field }) => (
                <Select
                  items={GUEST_ITEMS}
                  value={field.value ?? null}
                  onValueChange={(guests) =>
                    field.onChange(guests ?? undefined)
                  }
                >
                  <SelectTrigger
                    {...fieldControl}
                    className="w-full data-[size=default]:h-10"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GUEST_ITEMS.map((item) => (
                      <SelectItem key={item.label} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          )}
        </FormField>
        <div className="flex flex-col gap-2">
          {/* Takes a label's place, so the button lines up with the fields. */}
          <span
            aria-hidden="true"
            className="hidden text-sm leading-snug md:block"
          >
            &nbsp;
          </span>
          <Button type="submit" className="h-10 px-5">
            <SearchIcon aria-hidden="true" />
            Search
          </Button>
        </div>
      </form>
    </section>
  );
}
