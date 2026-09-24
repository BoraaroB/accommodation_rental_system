import { describe, expect, expectTypeOf, it } from 'vitest';
import type { z } from 'zod';
import { bookingDtoSchema } from './booking.js';
import type { BookingDto } from './contracts.js';

const booking: BookingDto = {
  id: '4e8fb98b-e2c2-4eed-a7c3-bf18994b9afc',
  listingId: '054aaaf4-350f-48f7-a0f6-17a86b53cca9',
  checkIn: '2026-07-28',
  checkOut: '2026-08-01',
  guests: 1,
  status: 'completed',
};

describe('bookingDtoSchema', () => {
  it('infers exactly BookingDto', () => {
    expectTypeOf<
      z.infer<typeof bookingDtoSchema>
    >().toEqualTypeOf<BookingDto>();
  });

  it('accepts a booking', () => {
    expect(bookingDtoSchema.parse(booking)).toEqual(booking);
  });

  it.each([
    ['0 guests', { guests: 0 }],
    ['a fractional guest count', { guests: 1.5 }],
    ['an unknown status', { status: 'pending' }],
    ['a check-in that is not a date', { checkIn: '28.07.2026' }],
    ['a listing id that is not a uuid', { listingId: '' }],
  ])('rejects %s', (_case, change) => {
    expect(bookingDtoSchema.safeParse({ ...booking, ...change }).success).toBe(
      false,
    );
  });
});
