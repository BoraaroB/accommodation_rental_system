import { describe, expect, it } from 'vitest';
import { dateRangeSchema, upcomingDateRangeSchema } from './date-range.js';
import { addDays, today } from './date.js';

const past = { from: addDays(today(), -10), to: addDays(today(), -7) };

describe('dateRangeSchema', () => {
  it('accepts a range in the past', () => {
    expect(dateRangeSchema.parse(past)).toEqual(past);
  });

  it('rejects to not after from', () => {
    const result = dateRangeSchema.safeParse({ from: past.to, to: past.to });
    expect(result.error?.issues.map((issue) => issue.path)).toEqual([['to']]);
  });
});

describe('upcomingDateRangeSchema', () => {
  it('rejects a range in the past', () => {
    const result = upcomingDateRangeSchema.safeParse(past);
    expect(result.error?.issues.map((issue) => issue.path)).toEqual([['from']]);
  });
});
