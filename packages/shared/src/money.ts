// Plain decimal notation with at most two decimals: "120", "19.9", "19.99".
const EUROS_PATTERN = /^\d+(\.\d{1,2})?$/;

/**
 * Converts a euro amount, as a person types it into a form, to integer cents.
 *
 * Cents are the only money unit in the data, the API and the URL; this is the
 * single place where euros enter the system. Amounts with more than two
 * decimals are rejected rather than rounded, so money is never changed
 * silently. `Math.round` only absorbs the binary floating-point error of valid
 * amounts (0.29 * 100 === 28.999999999999996).
 */
export function eurosToCents(euros: number): number {
  if (!Number.isFinite(euros) || euros < 0) {
    throw new RangeError(
      `Amount must be a finite, non-negative number of euros, got ${euros}`,
    );
  }
  const cents = Math.round(euros * 100);
  if (!Number.isSafeInteger(cents)) {
    throw new RangeError(
      `Amount is too large to be represented in cents: ${euros}`,
    );
  }
  // String(n) is the shortest decimal that round-trips to n, i.e. the amount as typed.
  if (!EUROS_PATTERN.test(String(euros))) {
    throw new RangeError(`Amount must have at most two decimals, got ${euros}`);
  }
  return cents;
}
