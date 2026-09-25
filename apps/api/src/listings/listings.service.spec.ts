import type { ListingDto, ListingUpdateInput } from '@ars/shared';
import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import {
  ListingNotFoundError,
  MaxGuestsBelowBookingError,
} from './listings.errors.js';
import {
  LISTINGS_REPOSITORY,
  type ListingsRepository,
} from './listings.repository.js';
import { ListingsService } from './listings.service.js';

const LISTING_ID = '054aaaf4-350f-48f7-a0f6-17a86b53cca9';

const changes: ListingUpdateInput = {
  title: 'Renovated loft',
  propertyType: 'loft',
  pricePerNightCents: 15000,
  maxGuests: 4,
  bedrooms: 2,
};

/** A service over a fake repository whose listing's largest active booking has `maxActiveGuests` guests. */
async function createService(maxActiveGuests: number | null) {
  const update = vi.fn(() => Promise.resolve({ id: LISTING_ID } as ListingDto));
  const listings: Partial<ListingsRepository> = {
    findMaxActiveGuests: () => Promise.resolve(maxActiveGuests),
    update,
  };
  const moduleRef = await Test.createTestingModule({
    providers: [
      ListingsService,
      { provide: LISTINGS_REPOSITORY, useValue: listings },
    ],
  }).compile();
  return { service: moduleRef.get(ListingsService), update };
}

describe('ListingsService.update', () => {
  it.each([
    ['no active booking', 0],
    ['an active booking with exactly the new maximum', 4],
  ])('writes the edit with %s', async (_case, maxActiveGuests) => {
    const { service, update } = await createService(maxActiveGuests);

    await service.update('tenant-a', LISTING_ID, changes);

    expect(update).toHaveBeenCalledWith('tenant-a', LISTING_ID, changes);
  });

  it.each([
    ['the tenant has no such listing', null, ListingNotFoundError],
    ['an active booking has more guests', 5, MaxGuestsBelowBookingError],
  ])('writes nothing when %s', async (_case, maxActiveGuests, error) => {
    const { service, update } = await createService(maxActiveGuests);

    await expect(
      service.update('tenant-a', LISTING_ID, changes),
    ).rejects.toBeInstanceOf(error);
    expect(update).not.toHaveBeenCalled();
  });
});
