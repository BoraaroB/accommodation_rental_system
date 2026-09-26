import type { ComponentProps } from 'react';
import { cx } from '../../lib/cx';

export type CardProps = ComponentProps<'div'>;

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cx(
        'rounded-card border border-border bg-surface-raised p-4 md:p-6',
        className,
      )}
      {...props}
    />
  );
}
