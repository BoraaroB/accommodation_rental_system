import { describe, expect, it } from 'vitest';
import {
  addDays,
  isIsoDate,
  isoDateSchema,
  parseIsoDate,
  today,
} from './date.js';

describe('today', () => {
  it('returns the UTC calendar date of the given instant', () => {
    expect(today(new Date('2026-09-24T10:00:00Z'))).toBe('2026-09-24');
  });

  it('uses the UTC date when the local date is different', () => {
    // 23:30 at UTC-02:00 is already the next day in UTC.
    expect(today(new Date('2026-09-24T23:30:00-02:00'))).toBe('2026-09-25');
    // 00:30 at UTC+02:00 is still the previous day in UTC.
    expect(today(new Date('2026-09-25T00:30:00+02:00'))).toBe('2026-09-24');
  });

  it('defaults to the current instant', () => {
    const before = new Date().toISOString().slice(0, 10);
    const result = today();
    const after = new Date().toISOString().slice(0, 10);

    expect([before, after]).toContain(result);
  });

  it('rejects an invalid Date', () => {
    expect(() => today(new Date('not a date'))).toThrow(RangeError);
  });
});

describe('addDays', () => {
  it.each([
    ['2026-09-24', 1, '2026-09-25'],
    ['2026-09-24', 0, '2026-09-24'],
    ['2026-09-30', 1, '2026-10-01'],
    ['2026-12-31', 1, '2027-01-01'],
    ['2028-02-28', 1, '2028-02-29'],
    ['2027-02-28', 1, '2027-03-01'],
    ['2026-10-01', -1, '2026-09-30'],
    ['2027-01-01', -1, '2026-12-31'],
    ['2026-07-28', 270, '2027-04-24'],
  ])('addDays(%s, %i) returns %s', (date, days, expected) => {
    expect(addDays(date, days)).toBe(expected);
  });

  it.each([
    '2026-02-30',
    '2027-02-29',
    '2026-13-01',
    '2026-00-10',
    '2026-9-24',
    '24.09.2026',
    '2026-09-24T00:00:00Z',
    '',
  ])('rejects the invalid date %j', (date) => {
    expect(() => addDays(date, 1)).toThrow(RangeError);
  });

  it.each([
    ['9999-12-31', 1],
    ['0000-01-01', -1],
    ['2026-09-24', 3_000_000],
  ])(
    'rejects a result outside the YYYY-MM-DD range: addDays(%s, %i)',
    (date, days) => {
      expect(() => addDays(date, days)).toThrow(RangeError);
    },
  );

  it.each([1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects the non-integer day count %s',
    (days) => {
      expect(() => addDays('2026-09-24', days)).toThrow(RangeError);
    },
  );
});

describe('isIsoDate and isoDateSchema', () => {
  it.each(['2026-09-24', '2028-02-29'])('accept %s', (value) => {
    expect(isIsoDate(value)).toBe(true);
    expect(isoDateSchema.safeParse(value).success).toBe(true);
  });

  it.each(['2026-02-29', '2026-9-24', '2026-09-24T00:00:00Z', ''])(
    'reject "%s"',
    (value) => {
      expect(isIsoDate(value)).toBe(false);
      expect(isoDateSchema.safeParse(value).success).toBe(false);
    },
  );
});

describe('parseIsoDate', () => {
  it('returns the UTC midnight of the date', () => {
    expect(parseIsoDate('2026-10-01').toISOString()).toBe(
      '2026-10-01T00:00:00.000Z',
    );
  });

  it('rejects a date that does not exist', () => {
    expect(() => parseIsoDate('2026-02-30')).toThrow(RangeError);
  });
});
