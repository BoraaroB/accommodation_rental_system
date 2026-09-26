import type { ComponentProps } from 'react';
import { cx } from '../../lib/cx';

const tones = {
  neutral: 'bg-border/50 text-text',
  primary: 'bg-primary text-on-primary',
  success: 'bg-success/10 text-success',
  danger: 'bg-danger/10 text-danger',
} as const;

export type BadgeProps = ComponentProps<'span'> & {
  tone?: keyof typeof tones;
};

export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-control px-2 py-0.5 text-xs font-medium',
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
