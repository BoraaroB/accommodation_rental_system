import { hostListingQuerySchema } from '@ars/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { SearchIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Button } from '../../../components/ui/button';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '../../../components/ui/input-group';

const searchSchema = hostListingQuerySchema.pick({ q: true });

/**
 * The listing table's search box: title or city (D-050). An empty search
 * shows every listing.
 */
export function ListingSearch({
  q,
  onSearch,
}: {
  q: string | undefined;
  onSearch: (q: string | undefined) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(searchSchema),
    // Follows the URL (a cleared search, back), without remounting the form,
    // so the search box keeps the focus.
    values: { q: q ?? '' },
  });

  return (
    <form
      role="search"
      noValidate
      onSubmit={(event) => void handleSubmit(({ q }) => onSearch(q))(event)}
      className="flex w-full flex-col gap-1 md:w-96"
    >
      <div className="flex gap-2">
        <InputGroup className="h-9 bg-card">
          <InputGroupAddon>
            <SearchIcon aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            {...register('q')}
            type="search"
            aria-label="Search listings"
            aria-invalid={errors.q !== undefined}
            placeholder="Title or city"
          />
        </InputGroup>
        <Button type="submit" className="h-9">
          Search
        </Button>
      </div>
      {errors.q && (
        <p role="alert" className="text-sm text-destructive">
          Remove the control characters from the search
        </p>
      )}
    </form>
  );
}
