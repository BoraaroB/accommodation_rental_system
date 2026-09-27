import { describe, expect, it } from 'vitest';
import {
  hostBookingSearchParams,
  hostListingSearchParams,
  parseHostBookingFilters,
  parseHostListingFilters,
} from './hostFilters';

const LISTING_ID = '0b7a6c1e-3f2d-4c5b-9a8e-1d2c3b4a5f60';
const params = (search: string) => new URLSearchParams(search);

describe('host listing filters', () => {
  it('reads the search and the page', () => {
    expect(parseHostListingFilters(params('q=Split&page=2'))).toEqual({
      q: 'Split',
      page: 2,
      pageSize: 24,
    });
  });

  it('drops a blank search and a bad page', () => {
    expect(parseHostListingFilters(params('q=%20%20&page=abc'))).toEqual({
      q: undefined,
      page: 1,
      pageSize: 24,
    });
  });

  it('writes only what differs from the defaults', () => {
    expect(hostListingSearchParams({ q: 'Split', page: 1 }).toString()).toBe(
      'q=Split',
    );
    expect(hostListingSearchParams({ page: 3 }).toString()).toBe('page=3');
  });
});

describe('host booking filters', () => {
  it('reads every filter', () => {
    expect(
      parseHostBookingFilters(
        params(
          `listingId=${LISTING_ID}&status=cancelled&from=2026-01-01&to=2026-02-01&page=2`,
        ),
      ),
    ).toEqual({
      listingId: LISTING_ID,
      status: 'cancelled',
      from: '2026-01-01',
      to: '2026-02-01',
      page: 2,
      pageSize: 24,
    });
  });

  it('drops a bad parameter and keeps the others', () => {
    expect(
      parseHostBookingFilters(params('listingId=nope&status=late&page=2')),
    ).toEqual({ page: 2, pageSize: 24 });
  });

  it.each([
    ['one date only', 'from=2026-10-01&status=confirmed'],
    ['to not after from', 'from=2026-10-05&to=2026-10-05&status=confirmed'],
  ])('drops both dates for %s', (_case, search) => {
    expect(parseHostBookingFilters(params(search))).toEqual({
      status: 'confirmed',
      page: 1,
      pageSize: 24,
    });
  });

  it('writes the filters in a fixed order, without the first page', () => {
    expect(
      hostBookingSearchParams({
        page: 1,
        to: '2026-10-04',
        from: '2026-10-01',
        status: 'confirmed',
      }).toString(),
    ).toBe('status=confirmed&from=2026-10-01&to=2026-10-04');
  });
});
