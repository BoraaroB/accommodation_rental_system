import { cx } from '../../lib/cx';

/** A grey placeholder block while content loads; size it with `className`. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cx('animate-pulse rounded-control bg-border/60', className)}
    />
  );
}
