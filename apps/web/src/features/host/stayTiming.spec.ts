import { describe, expect, it } from 'vitest';
import { stayTiming } from './stayTiming';

const stay = { checkIn: '2026-10-10', checkOut: '2026-10-13' };

describe('stayTiming', () => {
  it.each([
    ['2026-10-09', 'upcoming'],
    ['2026-10-10', 'in-progress'],
    ['2026-10-12', 'in-progress'],
    // The checkout day is free again: the stay is over.
    ['2026-10-13', 'past'],
    ['2026-11-01', 'past'],
  ])('on %s the stay is %s', (day, timing) => {
    expect(stayTiming(stay, day)).toBe(timing);
  });
});
