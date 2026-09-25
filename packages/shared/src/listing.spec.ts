import { describe, expect, expectTypeOf, it } from 'vitest';
import type { z } from 'zod';
import type { ListingDto } from './contracts.js';
import {
  listingDtoSchema,
  listingPageSchema,
  listingUpdateSchema,
} from './listing.js';
import type { Page } from './pagination.js';

const listing: ListingDto = {
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
};

describe('listingDtoSchema', () => {
  it('infers exactly ListingDto', () => {
    expectTypeOf<
      z.infer<typeof listingDtoSchema>
    >().toEqualTypeOf<ListingDto>();
  });

  it('accepts a listing', () => {
    expect(listingDtoSchema.parse(listing)).toEqual(listing);
  });

  it('accepts a listing nobody has reviewed yet', () => {
    const unrated = { ...listing, rating: null, reviewCount: 0 };
    expect(listingDtoSchema.parse(unrated)).toEqual(unrated);
  });

  it.each([3.2, 4.7, 5])('accepts the rating %s', (rating) => {
    expect(listingDtoSchema.safeParse({ ...listing, rating }).success).toBe(
      true,
    );
  });

  it.each([
    ['a price in euros', { pricePerNightCents: 120.5 }],
    ['0 guests', { maxGuests: 0 }],
    ['13 guests', { maxGuests: 13 }],
    ['negative bedrooms', { bedrooms: -1 }],
    ['a rating with two decimals', { rating: 4.25 }],
    ['a rating above 5', { rating: 5.1 }],
    ['an unknown property type', { propertyType: 'castle' }],
    ['another currency', { currency: 'USD' }],
    ['a lowercase country code', { country: 'pt' }],
    ['a date that does not exist', { createdAt: '2025-02-30' }],
    ['a date with a time', { createdAt: '2025-08-22T00:00:00Z' }],
    ['an id that is not a uuid', { id: 'listing-1' }],
    ['a latitude out of range', { latitude: 91 }],
  ])('rejects %s', (_case, change) => {
    expect(listingDtoSchema.safeParse({ ...listing, ...change }).success).toBe(
      false,
    );
  });
});

describe('listingPageSchema', () => {
  it('infers exactly Page<ListingDto>', () => {
    expectTypeOf<z.infer<typeof listingPageSchema>>().toEqualTypeOf<
      Page<ListingDto>
    >();
  });
});

describe('listingUpdateSchema', () => {
  const edit = {
    title: 'Rooftop apartment',
    propertyType: 'apartment',
    pricePerNightCents: 12000,
    maxGuests: 3,
    bedrooms: 2,
  } as const;

  it('trims the title and drops fields that are not editable', () => {
    expect(
      listingUpdateSchema.parse({
        ...edit,
        title: ' Rooftop apartment ',
        tenantId: 'another',
      }),
    ).toEqual(edit);
  });

  it('accepts a studio with 0 bedrooms', () => {
    const studio = { ...edit, propertyType: 'studio', bedrooms: 0 };
    expect(listingUpdateSchema.parse(studio)).toEqual(studio);
  });

  it.each([
    [
      'a studio with a bedroom',
      { propertyType: 'studio', bedrooms: 1 },
      'bedrooms',
    ],
    ['0 guests', { maxGuests: 0 }, 'maxGuests'],
    ['13 guests', { maxGuests: 13 }, 'maxGuests'],
    ['a blank title', { title: ' ' }, 'title'],
    [
      'a price above the column',
      { pricePerNightCents: 2_147_483_648 },
      'pricePerNightCents',
    ],
    ['bedrooms above the column', { bedrooms: 2_147_483_648 }, 'bedrooms'],
    ['a missing field', { bedrooms: undefined }, 'bedrooms'],
  ])('rejects %s', (_case, change, path) => {
    const result = listingUpdateSchema.safeParse({ ...edit, ...change });
    expect(result.error?.issues.map((issue) => issue.path)).toEqual([[path]]);
  });
});
