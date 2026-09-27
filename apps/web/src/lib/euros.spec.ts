import { describe, expect, it } from 'vitest';
import { eurosText, parseEuros } from './euros';

describe('parseEuros', () => {
  it.each([
    ['120', 12000],
    [' 79.99 ', 7999],
    ['0.5', 50],
  ])('reads %j as %i cents', (text, cents) => {
    expect(parseEuros(text)).toBe(cents);
  });

  it('reads an empty text as no amount', () => {
    expect(parseEuros('  ')).toBeUndefined();
  });

  it.each(['1e2', '0x10', '12.345', '-5', 'abc'])(
    'rejects %j as NaN',
    (text) => {
      expect(parseEuros(text)).toBeNaN();
    },
  );
});

describe('eurosText', () => {
  it('shows whole cents as euros and nothing else', () => {
    expect(eurosText(12050)).toBe('120.5');
    expect(eurosText(Number.NaN)).toBe('');
    expect(eurosText(undefined)).toBe('');
  });
});
