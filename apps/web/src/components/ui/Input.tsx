import type { ComponentProps } from 'react';
import { cx } from '../../lib/cx';

export type InputProps = ComponentProps<'input'>;

/** A text input; `aria-invalid` (set by `Field`) switches it to the error style. */
export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cx(
        'h-11 w-full rounded-control border border-border bg-surface-raised px-3 text-base text-text',
        'placeholder:text-muted',
        'focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-primary',
        'aria-invalid:border-danger aria-invalid:focus-visible:outline-danger',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}
