import { Badge } from '../../../components/ui/badge';
import { pluralize } from '../../../lib/format';

/**
 * The rating on the data's 5-point scale with the review count; a listing
 * nobody has reviewed is "New", not zero (D-023).
 */
export function RatingBadge({
  rating,
  reviewCount,
}: {
  rating: number | null;
  reviewCount: number;
}) {
  if (rating === null) {
    return (
      <Badge
        variant="outline"
        className="border-success/30 bg-success/10 text-success"
      >
        New
      </Badge>
    );
  }
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden="true"
        className="inline-flex h-7 min-w-9 items-center justify-center rounded-md rounded-bl-none bg-primary px-1.5 text-sm font-semibold text-primary-foreground"
      >
        {rating.toFixed(1)}
      </span>
      <span className="sr-only">Rated {rating.toFixed(1)} out of 5,</span>
      <span className="text-sm text-muted-foreground">
        {pluralize(reviewCount, 'review')}
      </span>
    </span>
  );
}
