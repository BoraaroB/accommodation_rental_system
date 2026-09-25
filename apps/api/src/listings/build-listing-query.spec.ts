import { parseIsoDate } from '@ars/shared';
import { describe, expect, it } from 'vitest';
import {
  buildListingOrderBy,
  buildListingWhere,
} from './build-listing-query.js';

const TENANT = 'tenant-a';

describe('buildListingWhere', () => {
  it('scopes a query without filters to the tenant only', () => {
    expect(buildListingWhere(TENANT, {})).toEqual({ tenantId: TENANT });
  });

  it.each([
    ['city', { city: 'Belgrade' }, { city: 'Belgrade' }],
    ['guests', { guests: 3 }, { maxGuests: { gte: 3 } }],
    [
      'a price range',
      { minPriceCents: 5000, maxPriceCents: 15000 },
      { pricePerNightCents: { gte: 5000, lte: 15000 } },
    ],
    [
      'a min price only',
      { minPriceCents: 5000 },
      { pricePerNightCents: { gte: 5000 } },
    ],
    [
      'a max price only',
      { maxPriceCents: 15000 },
      { pricePerNightCents: { lte: 15000 } },
    ],
  ])('filters by %s within the tenant', (_case, filters, expected) => {
    expect(buildListingWhere(TENANT, filters)).toEqual({
      tenantId: TENANT,
      ...expected,
    });
  });

  it('searches q in the title or the city, regardless of case', () => {
    expect(buildListingWhere(TENANT, { q: 'split' })).toEqual({
      tenantId: TENANT,
      OR: [
        { title: { contains: 'split', mode: 'insensitive' } },
        { city: { contains: 'split', mode: 'insensitive' } },
      ],
    });
  });

  it('searches LIKE wildcards and the escape character as plain text', () => {
    const where = buildListingWhere(TENANT, { q: '50%_\\' });
    expect(where.OR).toContainEqual({
      title: { contains: '50\\%\\_\\\\', mode: 'insensitive' },
    });
  });

  it('keeps only listings free for the whole range [from, to)', () => {
    const from = parseIsoDate('2026-10-01');
    const to = parseIsoDate('2026-10-04');

    expect(
      buildListingWhere(TENANT, { from: '2026-10-01', to: '2026-10-04' }),
    ).toEqual({
      tenantId: TENANT,
      bookings: {
        none: {
          status: { not: 'cancelled' },
          checkIn: { lt: to },
          checkOut: { gt: from },
        },
      },
      blockedDays: { none: { day: { gte: from, lt: to } } },
    });
  });
});

describe('buildListingOrderBy', () => {
  it.each([
    ['newest', { createdAt: 'desc' }],
    ['price_asc', { pricePerNightCents: 'asc' }],
    ['price_desc', { pricePerNightCents: 'desc' }],
    ['rating_desc', { rating: { sort: 'desc', nulls: 'last' } }],
  ] as const)('orders %s, then by id', (sort, first) => {
    expect(buildListingOrderBy(sort)).toEqual([first, { id: 'asc' }]);
  });
});
