import type { ListingDto, Page, PublicTenant } from '@ars/shared';

/** A portal as `GET /tenants/:tenantSlug` returns it. */
export function aTenant(overrides: Partial<PublicTenant> = {}): PublicTenant {
  return {
    slug: 'adriatic',
    name: 'Adriatic Stays',
    logoUrl: null,
    primaryColor: null,
    contactEmail: null,
    currency: 'EUR',
    ...overrides,
  };
}

/** A listing as the portal API returns it. */
export function aListing(overrides: Partial<ListingDto> = {}): ListingDto {
  return {
    id: '0b7a6c1e-3f2d-4c5b-9a8e-1d2c3b4a5f60',
    title: 'Sea view apartment',
    city: 'Split',
    country: 'HR',
    latitude: 43.508,
    longitude: 16.44,
    propertyType: 'apartment',
    maxGuests: 4,
    bedrooms: 2,
    pricePerNightCents: 12000,
    currency: 'EUR',
    rating: 4.6,
    reviewCount: 23,
    createdAt: '2026-01-10',
    ...overrides,
  };
}

/** One page of `items`; `total` defaults to the items on it. */
export function aPage<T>(
  items: T[],
  overrides: Partial<Page<T>> = {},
): Page<T> {
  return { items, page: 1, pageSize: 24, total: items.length, ...overrides };
}
