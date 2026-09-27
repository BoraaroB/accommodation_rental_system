import {
  daysBetween,
  stayTotalCents,
  type Currency,
  type DateRange,
} from '@ars/shared';
import { cn } from '../../../lib/utils';
import { formatMoney, pluralize } from '../../../lib/format';

/** The price per night, and the stay's total when the visitor chose dates. */
export function PriceSummary({
  pricePerNightCents,
  currency,
  stay,
  className,
}: {
  pricePerNightCents: number;
  currency: Currency;
  stay?: DateRange;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-0.5', className)}>
      {stay && (
        <p className="text-sm text-muted-foreground">
          {pluralize(daysBetween(stay.from, stay.to), 'night')} ·{' '}
          <span className="text-lg font-semibold text-foreground">
            {formatMoney(
              stayTotalCents(stay.from, stay.to, pricePerNightCents),
              currency,
            )}
          </span>
        </p>
      )}
      <p className={stay ? 'text-sm text-muted-foreground' : 'text-foreground'}>
        <span className={stay ? undefined : 'text-lg font-semibold'}>
          {formatMoney(pricePerNightCents, currency)}
        </span>{' '}
        per night
      </p>
    </div>
  );
}
