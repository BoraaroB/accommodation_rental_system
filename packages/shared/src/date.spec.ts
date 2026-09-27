import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  daysBetween,
  eachDay,
  isIsoDate,
  isoDateSchema,
  parseIsoDate,
  startOfMonth,
  toIsoDate,
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

describe('toIsoDate', () => {
  it('turns the UTC midnight of a date column back into the date', () => {
    expect(toIsoDate(parseIsoDate('2026-10-01'))).toBe('2026-10-01');
  });
});

describe('addMonths', () => {
  it.each([
    ['2026-10-01', 1, '2026-11-01'],
    ['2026-10-15', 0, '2026-10-15'],
    ['2026-12-01', 1, '2027-01-01'],
    ['2027-01-01', -1, '2026-12-01'],
    ['2026-10-01', 12, '2027-10-01'],
    ['2027-01-31', 1, '2027-02-28'],
    ['2028-01-31', 1, '2028-02-29'],
    ['2026-10-31', -1, '2026-09-30'],
    ['0050-01-31', 1, '0050-02-28'],
  ])('addMonths(%s, %i) returns %s', (date, months, expected) => {
    expect(addMonths(date, months)).toBe(expected);
  });

  it('rejects a fractional number of months', () => {
    expect(() => addMonths('2026-10-01', 1.5)).toThrow(RangeError);
  });
});

describe('startOfMonth', () => {
  it.each([
    ['2026-10-15', '2026-10-01'],
    ['2026-10-01', '2026-10-01'],
    ['2028-02-29', '2028-02-01'],
  ])('startOfMonth(%s) is %s', (date, expected) => {
    expect(startOfMonth(date)).toBe(expected);
  });
});

describe('daysBetween', () => {
  it.each([
    ['2026-10-01', '2026-10-04', 3],
    ['2026-10-01', '2026-10-01', 0],
    ['2026-10-04', '2026-10-01', -3],
    ['2028-02-28', '2028-03-01', 2],
    ['2026-12-31', '2027-01-01', 1],
  ])('daysBetween(%s, %s) is %i', (from, to, days) => {
    expect(daysBetween(from, to)).toBe(days);
  });
});

describe('eachDay', () => {
  it('lists every day of [from, to), without to', () => {
    expect(eachDay('2026-12-30', '2027-01-02')).toEqual([
      '2026-12-30',
      '2026-12-31',
      '2027-01-01',
    ]);
  });

  it.each([
    ['2026-10-01', '2026-10-01'],
    ['2026-10-02', '2026-10-01'],
  ])('is empty for %s → %s', (from, to) => {
    expect(eachDay(from, to)).toEqual([]);
  });
});

describe('year 0000', () => {
  it('is not a date: Postgres has no year 0', () => {
    expect(isIsoDate('0000-12-31')).toBe(false);
    expect(isIsoDate('0001-01-01')).toBe(true);
  });
});
