import type { PropertyType } from '@ars/shared';
import { cn } from '../../../lib/utils';
import { PROPERTY_TYPES } from '../propertyTypes';

/** Stands in for a photo, which the data does not have (D-024). */
export function PropertyPlaceholder({
  propertyType,
  className,
}: {
  propertyType: PropertyType;
  className?: string;
}) {
  const { Icon } = PROPERTY_TYPES[propertyType];
  return (
    <div
      aria-hidden="true"
      className={cn(
        'flex items-center justify-center bg-linear-to-br from-primary/20 to-primary/5 text-primary/70',
        className,
      )}
    >
      <Icon className="size-12" strokeWidth={1.5} />
    </div>
  );
}
