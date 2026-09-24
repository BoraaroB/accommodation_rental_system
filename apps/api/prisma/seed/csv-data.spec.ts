import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { tenantSlugForCountry } from './accounts.js';
import {
  mapRows,
  parseBookingRow,
  parseCsv,
  parseListingRow,
} from './mappers.js';

/** The delivered CSV files; only date-independent facts are asserted. */
const readData = (file: string) =>
  parseCsv(
    readFileSync(new URL(`../../../../data/${file}`, import.meta.url), 'utf8'),
  );

describe('the delivered CSV', () => {
  const listings = mapRows(
    'listings.csv',
    readData('listings.csv'),
    parseListingRow,
  );
  const bookings = mapRows(
    'bookings.csv',
    readData('bookings.csv'),
    parseBookingRow,
  );

  it('maps every row', () => {
    expect(listings).toHaveLength(1000);
    expect(bookings).toHaveLength(12_757);
  });

  it('keeps the unreviewed listings', () => {
    expect(listings.filter((listing) => listing.rating === null)).toHaveLength(
      109,
    );
  });

  it('splits the listings 363 / 428 / 209 across the tenants', () => {
    const perTenant = new Map<string, number>();
    for (const listing of listings) {
      const slug = tenantSlugForCountry(listing.country);
      perTenant.set(slug, (perTenant.get(slug) ?? 0) + 1);
    }

    expect(Object.fromEntries(perTenant)).toEqual({
      adriatic: 363,
      'central-europe': 428,
      'west-europe': 209,
    });
  });
});
