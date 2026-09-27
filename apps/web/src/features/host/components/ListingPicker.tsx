import { hostListingQuerySchema } from '@ars/shared';
import { skipToken } from '@reduxjs/toolkit/query';
import { useState } from 'react';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '../../../components/ui/combobox';
import type { FormFieldControlProps } from '../../../components/ui/form-field';
import { useGetHostListingQuery, useGetHostListingsQuery } from '../api';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

interface ListingItem {
  value: string;
  label: string;
}

/** How long typing pauses before the search is sent. */
const SEARCH_DELAY_MS = 300;

/**
 * One of the tenant's listings, found by typing its title or city: the
 * API searches (D-050) and the first page of matches is offered.
 */
export function ListingPicker({
  tenantSlug,
  listingId,
  onChange,
  ...control
}: FormFieldControlProps & {
  tenantSlug: string;
  listingId: string | undefined;
  onChange: (listingId: string | undefined) => void;
}) {
  // What the host typed; not the chosen listing's title, which the combobox
  // writes into the input and which would narrow the options to itself.
  const [text, setText] = useState('');
  const typed = useDebouncedValue(text, SEARCH_DELAY_MS);
  // Text the API would refuse (a control character) is not sent; the first
  // listings are offered instead.
  const search = hostListingQuerySchema.safeParse({ q: typed });
  const matches = useGetHostListingsQuery({
    tenantSlug,
    query: search.success ? search.data : hostListingQuerySchema.parse({}),
  });
  // The chosen listing's title, also when it is not among the matches.
  const chosen = useGetHostListingQuery(
    listingId === undefined ? skipToken : { tenantSlug, id: listingId },
  );
  const items: ListingItem[] =
    matches.data?.items.map((listing) => ({
      value: listing.id,
      label: listing.title,
    })) ?? [];
  let value: ListingItem | null = null;
  if (listingId !== undefined && chosen.data !== undefined) {
    value = { value: chosen.data.id, label: chosen.data.title };
  } else if (listingId !== undefined && chosen.isError) {
    // Not a listing of this tenant: the table is empty, and says why.
    value = { value: listingId, label: 'Unknown listing' };
  }

  return (
    <Combobox
      items={items}
      // The API has already filtered the items.
      filter={null}
      value={value}
      isItemEqualToValue={(item, selected) => item.value === selected.value}
      onValueChange={(item) => onChange(item?.value)}
      onInputValueChange={(input, { reason }) =>
        setText(reason === 'input-change' ? input : '')
      }
    >
      <ComboboxInput
        {...control}
        placeholder="All listings"
        showClear={listingId !== undefined}
        className="h-9 w-full bg-card"
      />
      <ComboboxContent>
        <ComboboxEmpty>
          {matches.isFetching ? 'Searching…' : 'No listing found.'}
        </ComboboxEmpty>
        <ComboboxList>
          {(item: ListingItem) => (
            <ComboboxItem key={item.value} value={item}>
              {item.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
