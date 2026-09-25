import { parseIsoDate } from '@ars/shared';
import { describe, expect, it } from 'vitest';
import { buildBookingWhere } from './build-booking-where.js';

const TENANT = 'tenant-a';
const LISTING = '054aaaf4-350f-48f7-a0f6-17a86b53cca9';

describe('buildBookingWhere', () => {
  it('scopes a query without filters to the tenant through the listing', () => {
    expect(buildBookingWhere(TENANT, {})).toEqual({
      listing: { tenantId: TENANT },
    });
  });

  it.each([
    ['listing', { listingId: LISTING }, { listingId: LISTING }],
    ['status', { status: 'cancelled' }, { status: 'cancelled' }],
    [
      'the stays that take a day of [from, to), whatever the status',
      { from: '2026-10-01', to: '2026-10-04' },
      {
        checkIn: { lt: parseIsoDate('2026-10-04') },
        checkOut: { gt: parseIsoDate('2026-10-01') },
      },
    ],
  ] as const)('filters by %s within the tenant', (_case, filters, expected) => {
    expect(buildBookingWhere(TENANT, filters)).toEqual({
      listing: { tenantId: TENANT },
      ...expected,
    });
  });
});
