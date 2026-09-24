import { describe, expect, it } from 'vitest';
import {
  mapRows,
  parseBookingRow,
  parseCsv,
  parseListingRow,
  type CsvRow,
} from './mappers.js';

const listingRow: CsvRow = {
  id: '128699a9-d81d-4217-b143-21d21169ed25',
  title: 'Rooftop apartment near the main square',
  city: 'Lisbon',
  country: 'PT',
  latitude: '38.750054',
  longitude: '-9.20119',
  property_type: 'apartment',
  max_guests: '3',
  bedrooms: '2',
  price_per_night_cents: '12000',
  currency: 'EUR',
  rating: '4.2',
  review_count: '64',
  created_at: '2025-08-22',
};

const bookingRow: CsvRow = {
  id: '4e8fb98b-e2c2-4eed-a7c3-bf18994b9afc',
  listing_id: '054aaaf4-350f-48f7-a0f6-17a86b53cca9',
  check_in: '2026-07-28',
  check_out: '2026-08-01',
  guests: '1',
  status: 'completed',
};

describe('parseCsv', () => {
  it('returns one object per row, keyed by the header, with string values', () => {
    expect(parseCsv('id,guests\na,1\n\nb,2\n')).toEqual([
      { id: 'a', guests: '1' },
      { id: 'b', guests: '2' },
    ]);
  });

  it('rejects a row with a missing column', () => {
    expect(() => parseCsv('id,guests\na\n')).toThrow();
  });
});

describe('parseListingRow', () => {
  it('maps snake_case strings to a typed ListingDto', () => {
    expect(parseListingRow(listingRow)).toEqual({
      id: '128699a9-d81d-4217-b143-21d21169ed25',
      title: 'Rooftop apartment near the main square',
      city: 'Lisbon',
      country: 'PT',
      latitude: 38.750054,
      longitude: -9.20119,
      propertyType: 'apartment',
      maxGuests: 3,
      bedrooms: 2,
      pricePerNightCents: 12000,
      currency: 'EUR',
      rating: 4.2,
      reviewCount: 64,
      createdAt: '2025-08-22',
    });
  });

  it('maps an empty rating to null', () => {
    const row = { ...listingRow, rating: '', review_count: '0' };
    expect(parseListingRow(row)).toMatchObject({
      rating: null,
      reviewCount: 0,
    });
  });

  it.each([
    ['an empty number', { bedrooms: '' }],
    ['a number in exponent notation', { max_guests: '1e1' }],
    ['a price in euros', { price_per_night_cents: '120.50' }],
    ['an unknown property type', { property_type: 'castle' }],
    ['a missing column', { created_at: undefined }],
  ])('rejects %s', (_case, change) => {
    expect(() =>
      parseListingRow({ ...listingRow, ...change } as CsvRow),
    ).toThrow();
  });
});

describe('parseBookingRow', () => {
  it('maps snake_case strings to a typed BookingDto', () => {
    expect(parseBookingRow(bookingRow)).toEqual({
      id: '4e8fb98b-e2c2-4eed-a7c3-bf18994b9afc',
      listingId: '054aaaf4-350f-48f7-a0f6-17a86b53cca9',
      checkIn: '2026-07-28',
      checkOut: '2026-08-01',
      guests: 1,
      status: 'completed',
    });
  });

  it.each([
    ['0 guests', { guests: '0' }],
    ['an unknown status', { status: 'pending' }],
    ['a date that does not exist', { check_out: '2026-02-30' }],
  ])('rejects %s', (_case, change) => {
    expect(() => parseBookingRow({ ...bookingRow, ...change })).toThrow();
  });
});

describe('mapRows', () => {
  it('maps every row', () => {
    expect(mapRows('bookings.csv', [bookingRow], parseBookingRow)).toHaveLength(
      1,
    );
  });

  it('names the file, the row and the field of the first invalid row', () => {
    const rows = [bookingRow, { ...bookingRow, guests: 'two' }];

    expect(() => mapRows('bookings.csv', rows, parseBookingRow)).toThrow(
      /^bookings\.csv, row 2:\n.*\n.*guests/,
    );
  });
});
