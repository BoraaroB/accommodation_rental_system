import { centsToEuros, eurosToCents } from '@ars/shared';

/** Euros as typed: digits, optionally a point and one or two decimals. */
const EUROS_PATTERN = /^\d+(\.\d{1,2})?$/;

/**
 * Cents for an amount typed in euros; `NaN` when the text is not an amount,
 * which a schema rejects (text would be coerced: "1e2" reads as 100);
 * `undefined` when empty.
 */
export function parseEuros(text: string): number | undefined {
  const trimmed = text.trim();
  if (trimmed === '') {
    return undefined;
  }
  // Plain decimal notation only: `Number` would also read "1e2" or "0x10".
  if (!EUROS_PATTERN.test(trimmed)) {
    return Number.NaN;
  }
  try {
    return eurosToCents(Number(trimmed));
  } catch {
    return Number.NaN;
  }
}

/** The euros to show in an input for a value: only whole cents have a text. */
export function eurosText(value: unknown): string {
  return typeof value === 'number' && Number.isSafeInteger(value)
    ? String(centsToEuros(value))
    : '';
}
