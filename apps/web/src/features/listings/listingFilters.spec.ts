import { addDays, today } from '@ars/shared';
import { describe, expect, it } from 'vitest';
import { parseListingFilters, toSearchParams } from './listingFilters';

const inDays = (days: number) => addDays(today(), days);

const defaults = { sort: 'newest', page: 1, pageSize: 24 };

function parse(search: string) {
  return parseListingFilters(new URLSearchParams(search));
}

describe('parseListingFilters', () => {
  it('reads every filter, coercing numbers', () => {
    const from = inDays(10);
    const to = inDays(13);
    expect(
      parse(
        `city=Split&guests=2&minPriceCents=5000&maxPriceCents=15000&from=${from}&to=${to}&sort=price_asc&page=3`,
      ),
    ).toEqual({
      city: 'Split',
      guests: 2,
      minPriceCents: 5000,
      maxPriceCents: 15000,
      from,
      to,
      sort: 'price_asc',
      page: 3,
      pageSize: 24,
    });
  });

  it('fills in the defaults for an empty URL', () => {
    expect(parse('')).toEqual(defaults);
  });

  it.each([
    ['guests=abc&city=Split', { city: 'Split' }],
    ['city=%20&guests=2', { guests: 2 }],
    ['sort=cheapest&page=0&city=Split', { city: 'Split' }],
  ])('drops only the invalid parameter of %s', (search, expected) => {
    expect(parse(search)).toEqual({ ...defaults, ...expected });
  });

  it.each([
    ['in the past', `from=${inDays(-1)}&to=${inDays(2)}`],
    ['with departure before arrival', `from=${inDays(5)}&to=${inDays(4)}`],
    ['with the same day twice', `from=${inDays(5)}&to=${inDays(5)}`],
    ['without a departure', `from=${inDays(5)}`],
    ['without an arrival', `to=${inDays(5)}`],
  ])('drops both dates of a range %s', (_, dates) => {
    const filters = parse(`city=Split&${dates}`);
    expect(filters.city).toBe('Split');
    expect(filters.from).toBeUndefined();
    expect(filters.to).toBeUndefined();
  });

  it('drops a maximum price below the minimum', () => {
    const filters = parse('minPriceCents=9000&maxPriceCents=5000');
    expect(filters.minPriceCents).toBe(9000);
    expect(filters.maxPriceCents).toBeUndefined();
  });
});

describe('toSearchParams', () => {
  it('writes filters in a fixed order and leaves out empty and default values', () => {
    expect(
      toSearchParams({
        page: 1,
        sort: 'newest',
        pageSize: 24,
        guests: 2,
        city: 'Novi Sad',
        from: undefined,
      }).toString(),
    ).toBe('city=Novi+Sad&guests=2');
  });

  it('writes a page and a sort other than the defaults', () => {
    expect(toSearchParams({ sort: 'rating_desc', page: 2 }).toString()).toBe(
      'sort=rating_desc&page=2',
    );
  });

  it('round-trips with parseListingFilters', () => {
    const search = `city=Split&guests=3&minPriceCents=5000&from=${inDays(3)}&to=${inDays(6)}&sort=price_desc&page=2`;
    expect(toSearchParams(parse(search)).toString()).toBe(search);
  });
});
