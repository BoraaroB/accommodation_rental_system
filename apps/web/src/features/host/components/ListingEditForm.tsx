import {
  listingUpdateSchema,
  propertyTypeSchema,
  type ListingDto,
  type ListingUpdateInput,
} from '@ars/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, type FieldError } from 'react-hook-form';
import { toast } from 'sonner';
import { getApiError } from '../../../api/errors';
import { FormAlert } from '../../../components/FormAlert';
import { MoneyInput } from '../../../components/MoneyInput';
import { Button } from '../../../components/ui/button';
import { FormField } from '../../../components/ui/form-field';
import { Input } from '../../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { PROPERTY_TYPES } from '../../../lib/propertyTypes';
import { useUpdateListingMutation } from '../api';

const TYPE_ITEMS = propertyTypeSchema.options.map((value) => ({
  value,
  label: PROPERTY_TYPES[value].label,
}));

/** The fields the editor changes, as the listing has them now. */
function editableFields(listing: ListingDto): ListingUpdateInput {
  const { title, propertyType, pricePerNightCents, maxGuests, bedrooms } =
    listing;
  return { title, propertyType, pricePerNightCents, maxGuests, bedrooms };
}

function isGuestsConflict(error: unknown): boolean {
  return getApiError(error)?.code === 'MAX_GUESTS_BELOW_BOOKING';
}

// The schema's rules in the host's words.
function titleError(error: FieldError | undefined) {
  if (error === undefined) {
    return undefined;
  }
  return error.type === 'too_small'
    ? 'Enter a title'
    : 'Remove the control characters from the title';
}

function guestsError(error: FieldError | undefined) {
  if (error === undefined) {
    return undefined;
  }
  // A booking has more guests: the API's message says how many.
  return error.type === 'server' ? error.message : 'Enter 1 to 12 guests';
}

function bedroomsError(error: FieldError | undefined) {
  if (error === undefined) {
    return undefined;
  }
  // `custom` is the schema's rule across fields.
  return error.type === 'custom'
    ? 'A studio has 0 bedrooms'
    : 'Enter a whole number of bedrooms';
}

/**
 * The listing's editable fields (challenge item 7). The price is typed in
 * euros and sent in cents; a studio has 0 bedrooms, and the guests cannot
 * drop below an active booking's (D-014), which only the API knows.
 */
export function ListingEditForm({
  tenantSlug,
  listing,
}: {
  tenantSlug: string;
  listing: ListingDto;
}) {
  const [updateListing, update] = useUpdateListingMutation();
  const {
    register,
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm({
    resolver: zodResolver(listingUpdateSchema),
    defaultValues: editableFields(listing),
  });

  const submit = handleSubmit(async (changes) => {
    const saved = await updateListing({ tenantSlug, id: listing.id, changes });
    if (saved.error === undefined) {
      reset(editableFields(saved.data));
      toast.success('Listing saved');
    } else if (isGuestsConflict(saved.error)) {
      setError('maxGuests', {
        type: 'server',
        message: `${getApiError(saved.error)?.message ?? 'An active booking has more guests'}. Keep at least that many.`,
      });
    }
  });

  // The guests conflict is shown on its field instead.
  const formError = isGuestsConflict(update.error) ? undefined : update.error;

  return (
    <form
      noValidate
      onSubmit={(event) => void submit(event)}
      className="flex flex-col gap-4"
    >
      <FormAlert error={formError} />
      <FormField label="Title" error={titleError(errors.title)}>
        {(field) => <Input {...field} {...register('title')} />}
      </FormField>
      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Property type">
          {(field) => (
            <Controller
              control={control}
              name="propertyType"
              render={({ field: { value, onChange } }) => (
                <Select
                  items={TYPE_ITEMS}
                  value={value}
                  onValueChange={(next) => {
                    const type = propertyTypeSchema.safeParse(next);
                    if (type.success) {
                      onChange(type.data);
                    }
                  }}
                >
                  <SelectTrigger {...field} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_ITEMS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          )}
        </FormField>
        <FormField
          label="Price per night"
          error={
            errors.pricePerNightCents &&
            'Enter an amount in euros, e.g. 80 or 79.99'
          }
        >
          {(fieldControl) => (
            <Controller
              control={control}
              name="pricePerNightCents"
              render={({ field }) => (
                <MoneyInput
                  {...fieldControl}
                  name={field.name}
                  ref={field.ref}
                  value={field.value}
                  onBlur={field.onBlur}
                  // React Hook Form reads `undefined` as "back to the
                  // default"; an emptied price stays empty as NaN, which the
                  // schema rejects.
                  onChange={(cents) => field.onChange(cents ?? Number.NaN)}
                />
              )}
            />
          )}
        </FormField>
        <FormField label="Maximum guests" error={guestsError(errors.maxGuests)}>
          {(field) => (
            <Input
              {...field}
              {...register('maxGuests', { valueAsNumber: true })}
              type="number"
              inputMode="numeric"
              min={1}
              max={12}
            />
          )}
        </FormField>
        <FormField
          label="Bedrooms"
          hint="0 for a studio"
          error={bedroomsError(errors.bedrooms)}
        >
          {(field) => (
            <Input
              {...field}
              {...register('bedrooms', { valueAsNumber: true })}
              type="number"
              inputMode="numeric"
              min={0}
            />
          )}
        </FormField>
      </div>
      <div className="flex flex-col gap-2 md:flex-row md:justify-end">
        {isDirty && (
          <Button
            type="button"
            variant="outline"
            onClick={() => reset()}
            disabled={isSubmitting}
          >
            Discard changes
          </Button>
        )}
        <Button type="submit" disabled={!isDirty || isSubmitting}>
          Save changes
        </Button>
      </div>
    </form>
  );
}
