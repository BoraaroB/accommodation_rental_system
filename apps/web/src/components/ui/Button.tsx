import type { ComponentProps } from 'react';
import { cx } from '../../lib/cx';

const variants = {
  primary: 'bg-primary text-on-primary hover:bg-primary/90',
  secondary:
    'border border-border bg-surface-raised text-text hover:bg-surface',
  ghost: 'text-primary hover:bg-primary/10',
  danger: 'bg-danger text-on-primary hover:bg-danger/90',
} as const;

const sizes = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
} as const;

export type ButtonProps = ComponentProps<'button'> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
};

export function Button({
  variant = 'primary',
  size = 'md',
  type = 'button',
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-control font-medium transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
