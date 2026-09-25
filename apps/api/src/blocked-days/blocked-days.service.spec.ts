import { addDays, today, type IsoDate } from '@ars/shared';
import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import { ListingsService } from '../listings/listings.service.js';
import { DayAlreadyBookedError } from './blocked-days.errors.js';
import {
  BLOCKED_DAYS_REPOSITORY,
  type BlockedDaysRepository,
} from './blocked-days.repository.js';
import { BlockedDaysService } from './blocked-days.service.js';

const LISTING_ID = '054aaaf4-350f-48f7-a0f6-17a86b53cca9';
const USER_ID = '0b8f7a3e-54c1-4f0e-9d7a-2f1c3b4a5d6e';
const range = { from: addDays(today(), 10), to: addDays(today(), 13) };

/** A service whose listing has active bookings on `bookedDays` within the range. */
async function createService(bookedDays: IsoDate[]) {
  const createMany = vi.fn(() => Promise.resolve());
  const listings: Partial<ListingsService> = {
    getBookedDays: () => Promise.resolve(bookedDays),
  };
  const blockedDays: Partial<BlockedDaysRepository> = { createMany };
  const moduleRef = await Test.createTestingModule({
    providers: [
      BlockedDaysService,
      { provide: ListingsService, useValue: listings },
      { provide: BLOCKED_DAYS_REPOSITORY, useValue: blockedDays },
    ],
  }).compile();
  return { service: moduleRef.get(BlockedDaysService), createMany };
}

describe('BlockedDaysService.block', () => {
  it('blocks every day of [from, to) in the name of the user', async () => {
    const { service, createMany } = await createService([]);

    const result = await service.block('tenant-a', LISTING_ID, range, USER_ID);

    const days = [range.from, addDays(range.from, 1), addDays(range.from, 2)];
    expect(result).toEqual({ ...range, days });
    expect(createMany).toHaveBeenCalledWith(
      'tenant-a',
      LISTING_ID,
      days,
      USER_ID,
    );
  });

  it('blocks nothing and names the first booked day when a booking takes one', async () => {
    const booked = [addDays(range.from, 1), addDays(range.from, 2)];
    const { service, createMany } = await createService(booked);

    const blocking = service.block('tenant-a', LISTING_ID, range, USER_ID);

    await expect(blocking).rejects.toBeInstanceOf(DayAlreadyBookedError);
    await expect(blocking).rejects.toThrow(`${booked[0]} is booked`);
    expect(createMany).not.toHaveBeenCalled();
  });
});
