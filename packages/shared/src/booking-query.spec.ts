import { describe, expect, it } from 'vitest';
import { hostBookingQuerySchema } from './booking-query.js';
import { addDays, today } from './date.js';

describe('hostBookingQuerySchema', () => {
  it('accepts a range in the past and the filters', () => {
    const query = {
      listingId: '054aaaf4-350f-48f7-a0f6-17a86b53cca9',
      status: 'completed',
      from: addDays(today(), -30),
      to: addDays(today(), -20),
    };
    expect(hostBookingQuerySchema.parse(query)).toEqual({
      ...query,
      page: 1,
      pageSize: 24,
    });
  });

  it.each([
    ['only from', { from: today() }, 'to'],
    ['to not after from', { from: today(), to: today() }, 'to'],
  ])('rejects %s', (_case, query, path) => {
    const result = hostBookingQuerySchema.safeParse(query);
    expect(result.error?.issues.map((issue) => issue.path)).toEqual([[path]]);
  });
});
