import type { DateRange } from '@ars/shared';
import { CircleCheckIcon, CircleXIcon } from 'lucide-react';
import { QueryState } from '../../../components/ui/query-state';
import { Skeleton } from '../../../components/ui/skeleton';
import { formatDateRange } from '../../../lib/format';
import { cn } from '../../../lib/utils';
import { useGetAvailabilityQuery } from '../api';

/** "Available for your dates": free when no day of the stay is taken. */
export function AvailabilityVerdict({
  tenantSlug,
  listingId,
  stay,
}: {
  tenantSlug: string;
  listingId: string;
  stay: DateRange;
}) {
  const availability = useGetAvailabilityQuery({
    tenantSlug,
    id: listingId,
    range: stay,
  });
  return (
    <QueryState
      query={availability}
      loading={<Skeleton className="h-10 w-full" />}
    >
      {({ unavailableDays }) => {
        const available = unavailableDays.length === 0;
        const Icon = available ? CircleCheckIcon : CircleXIcon;
        return (
          <p
            className={cn(
              'flex items-start gap-2 rounded-lg px-3 py-2 text-sm font-medium',
              available
                ? 'bg-success/10 text-success'
                : 'bg-destructive/10 text-destructive',
            )}
          >
            <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>
              {available
                ? 'Available for your dates'
                : 'Not available for your dates'}{' '}
              ({formatDateRange(stay.from, stay.to)})
            </span>
          </p>
        );
      }}
    </QueryState>
  );
}
