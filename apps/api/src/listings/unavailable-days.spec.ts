import { describe, expect, it } from 'vitest';
import { unavailableDays } from './unavailable-days.js';

const range = { from: '2026-10-01', to: '2026-10-08' };

describe('unavailableDays', () => {
  it('takes every night of a stay but not its checkout day', () => {
    const stays = [{ checkIn: '2026-10-02', checkOut: '2026-10-04' }];

    expect(unavailableDays(range, { stays, blockedDays: [] })).toEqual([
      '2026-10-02',
      '2026-10-03',
    ]);
  });

  it('lets a stay begin on the previous checkout day', () => {
    const stays = [
      { checkIn: '2026-10-04', checkOut: '2026-10-05' },
      { checkIn: '2026-10-02', checkOut: '2026-10-04' },
    ];

    expect(unavailableDays(range, { stays, blockedDays: [] })).toEqual([
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
    ]);
  });

  it('clips stays that start before or end after the range', () => {
    const stays = [
      { checkIn: '2026-09-28', checkOut: '2026-10-02' },
      { checkIn: '2026-10-07', checkOut: '2026-10-12' },
    ];

    expect(unavailableDays(range, { stays, blockedDays: [] })).toEqual([
      '2026-10-01',
      '2026-10-07',
    ]);
  });

  it('adds blocked days within the range, sorted and once each', () => {
    const occupancy = {
      stays: [{ checkIn: '2026-10-05', checkOut: '2026-10-06' }],
      blockedDays: ['2026-10-08', '2026-10-05', '2026-10-01', '2026-09-30'],
    };

    expect(unavailableDays(range, occupancy)).toEqual([
      '2026-10-01',
      '2026-10-05',
    ]);
  });

  it('is empty when nothing occupies the range', () => {
    expect(unavailableDays(range, { stays: [], blockedDays: [] })).toEqual([]);
  });
});
