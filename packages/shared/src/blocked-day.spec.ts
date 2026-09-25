import { describe, expect, it } from 'vitest';
import { blockDaysSchema, MAX_BLOCKED_RANGE_DAYS } from './blocked-day.js';
import { addDays, today } from './date.js';

const from = addDays(today(), 1);

describe('blockDaysSchema', () => {
  it.each([
    ['one day from today', { from: today(), to: addDays(today(), 1) }],
    [
      `${MAX_BLOCKED_RANGE_DAYS} days`,
      { from, to: addDays(from, MAX_BLOCKED_RANGE_DAYS) },
    ],
  ])('accepts %s', (_case, range) => {
    expect(blockDaysSchema.parse(range)).toEqual(range);
  });

  it.each([
    [
      'a range longer than the maximum',
      { from, to: addDays(from, MAX_BLOCKED_RANGE_DAYS + 1) },
      'to',
    ],
    ['a day in the past', { from: addDays(today(), -1), to: today() }, 'from'],
    ['to not after from', { from, to: from }, 'to'],
    ['a date that does not exist', { from, to: '2027-02-29' }, 'to'],
  ])('rejects %s', (_case, range, path) => {
    const result = blockDaysSchema.safeParse(range);
    expect(result.error?.issues.map((issue) => issue.path)).toEqual([[path]]);
  });
});
