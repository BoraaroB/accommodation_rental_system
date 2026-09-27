import type { CSSProperties } from 'react';

/** The design tokens a tenant's primary colour overrides (D-056). */
export const BRAND_VARIABLES = ['--primary', '--ring'] as const;

/**
 * A tenant's primary colour as the tokens of one element and everything
 * inside it, e.g. a portal's card on the landing page; `undefined` keeps the
 * default brand colour. A portal page uses `useBrandColor` instead.
 */
export function brandStyle(
  primaryColor: string | null | undefined,
): CSSProperties | undefined {
  // Possible improvement (not in the plan): pick `--primary-foreground` by the
  // colour's contrast, so text stays readable on a light tenant colour.
  return primaryColor
    ? (Object.fromEntries(
        BRAND_VARIABLES.map((variable) => [variable, primaryColor]),
      ) as CSSProperties)
    : undefined;
}
