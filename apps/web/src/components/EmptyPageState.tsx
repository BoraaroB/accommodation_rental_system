import { Link } from 'react-router';
import { pluralize } from '../lib/format';
import { buttonVariants } from './ui/button';
import { EmptyState } from './ui/empty-state';

/** A page past the last one (an old link, fewer results now), with the way back to the first. */
export function EmptyPageState({
  total,
  noun,
  firstPageHref,
}: {
  /** The results on all pages. */
  total: number;
  /** What the results are, e.g. "stay". */
  noun: string;
  firstPageHref: string;
}) {
  return (
    <EmptyState
      title="This page is empty"
      description={`There are ${pluralize(total, noun)}, on fewer pages.`}
      action={
        <Link
          to={firstPageHref}
          className={buttonVariants({ variant: 'outline' })}
        >
          Go to the first page
        </Link>
      }
    />
  );
}
