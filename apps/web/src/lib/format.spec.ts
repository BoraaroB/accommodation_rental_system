import { describe, expect, it } from 'vitest';
import { formatMoney, pluralize } from './format';

describe('formatMoney', () => {
  it.each([
    [12000, '€120'],
    [12050, '€120.50'],
    [1234500, '€12,345'],
  ])('formats %i cents as %s', (cents, text) => {
    expect(formatMoney(cents)).toBe(text);
  });
});

describe('pluralize', () => {
  it.each([
    [1, '1 night'],
    [3, '3 nights'],
  ])('pluralizes %i', (count, text) => {
    expect(pluralize(count, 'night')).toBe(text);
  });
});
