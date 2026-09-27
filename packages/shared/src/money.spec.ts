import { describe, expect, it } from 'vitest';
import { centsToEuros, eurosToCents, stayTotalCents } from './money.js';

describe('eurosToCents', () => {
  it.each([
    [120, 12000],
    [0, 0],
    [19.99, 1999],
    [19.9, 1990],
    [0.29, 29],
    [1.1, 110],
    [335, 33500],
  ])('converts %s EUR to %i cents', (euros, cents) => {
    expect(eurosToCents(euros)).toBe(cents);
  });

  it('returns an integer even when the multiplication is inexact', () => {
    // 0.29 * 100 === 28.999999999999996 in binary floating point.
    expect(Number.isInteger(eurosToCents(0.29))).toBe(true);
  });

  it.each([1.005, 10.004, 0.001, 1e-7, 0.1 + 0.2])(
    'rejects %s, which has more than two decimals',
    (euros) => {
      expect(() => eurosToCents(euros)).toThrow(RangeError);
    },
  );

  it.each([-1, -0.01, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects %s, which is not a finite non-negative amount',
    (euros) => {
      expect(() => eurosToCents(euros)).toThrow(RangeError);
    },
  );

  it.each([Number.MAX_VALUE, 1e16])(
    'rejects %s, which is too large for integer cents',
    (euros) => {
      expect(() => eurosToCents(euros)).toThrow(RangeError);
    },
  );
});

describe('stayTotalCents', () => {
  it('multiplies the nights by the price per night', () => {
    expect(stayTotalCents('2026-12-30', '2027-01-02', 12000)).toBe(36000);
  });
});

describe('centsToEuros', () => {
  it.each([
    [12000, 120],
    [1999, 19.99],
    [0, 0],
  ])('converts %i cents to %s EUR', (cents, euros) => {
    expect(centsToEuros(cents)).toBe(euros);
  });

  it.each([12.5, Number.NaN])(
    'rejects %s, which is not integer cents',
    (cents) => {
      expect(() => centsToEuros(cents)).toThrow(RangeError);
    },
  );
});
