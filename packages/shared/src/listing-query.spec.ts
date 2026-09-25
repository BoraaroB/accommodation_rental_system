import { describe, expect, it } from 'vitest';
import { addDays, today } from './date.js';
import {
  availabilityQuerySchema,
  listingQuerySchema,
} from './listing-query.js';

const from = addDays(today(), 10);
const to = addDays(today(), 13);

/** The paths of the issues a query is rejected with. */
function issuePaths(result: {
  success: boolean;
  error?: { issues: { path: PropertyKey[] }[] };
}): string[] {
  expect(result.success).toBe(false);
  return (result.error?.issues ?? []).map((issue) => issue.path.join('.'));
}

describe('listingQuerySchema', () => {
  it('defaults to the first page of 24, newest first', () => {
    expect(listingQuerySchema.parse({})).toEqual({
      page: 1,
      pageSize: 24,
      sort: 'newest',
    });
  });

  it('coerces query-string values and trims the city', () => {
    expect(
      listingQuerySchema.parse({
        city: ' Belgrade ',
        guests: '2',
        minPriceCents: '5000',
        maxPriceCents: '15000',
        from,
        to,
        sort: 'price_asc',
        page: '2',
        pageSize: '48',
      }),
    ).toEqual({
      city: 'Belgrade',
      guests: 2,
      minPriceCents: 5000,
      maxPriceCents: 15000,
      from,
      to,
      sort: 'price_asc',
      page: 2,
      pageSize: 48,
    });
  });

  it('treats empty numbers as not sent', () => {
    expect(
      listingQuerySchema.parse({
        guests: '',
        maxPriceCents: '',
        page: '',
        pageSize: '',
      }),
    ).toEqual({ page: 1, pageSize: 24, sort: 'newest' });
  });

  it('accepts a range from today and an equal min and max price', () => {
    const query = {
      from: today(),
      to: addDays(today(), 1),
      minPriceCents: '5000',
      maxPriceCents: '5000',
    };
    expect(listingQuerySchema.safeParse(query).success).toBe(true);
  });

  it.each([
    ['only from', { from }, 'to'],
    ['only to', { to }, 'from'],
    ['to not after from', { from, to: from }, 'to'],
    ['from in the past', { from: addDays(today(), -1), to }, 'from'],
    [
      'a max price below the min',
      { minPriceCents: '2', maxPriceCents: '1' },
      'maxPriceCents',
    ],
    [
      'a price above the database maximum',
      { maxPriceCents: '2147483648' },
      'maxPriceCents',
    ],
    ['more than 12 guests', { guests: '13' }, 'guests'],
    ['a page size above 48', { pageSize: '49' }, 'pageSize'],
    ['a blank city', { city: ' ' }, 'city'],
    ['a city with a NUL byte', { city: 'a\u0000b' }, 'city'],
  ])('rejects %s', (_case, query, path) => {
    expect(issuePaths(listingQuerySchema.safeParse(query))).toEqual([path]);
  });
});

describe('availabilityQuerySchema', () => {
  it('accepts a range from today', () => {
    const range = { from: today(), to: addDays(today(), 90) };
    expect(availabilityQuerySchema.parse(range)).toEqual(range);
  });

  it.each([
    ['no to', { from }, 'to'],
    ['to not after from', { from, to: from }, 'to'],
    ['from in the past', { from: addDays(today(), -1), to }, 'from'],
  ])('rejects %s', (_case, query, path) => {
    expect(issuePaths(availabilityQuerySchema.safeParse(query))).toEqual([
      path,
    ]);
  });
});
