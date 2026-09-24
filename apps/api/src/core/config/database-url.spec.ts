import { describe, expect, it } from 'vitest';
import { databaseNameOf, isTestDatabaseUrl } from './database-url.js';

describe('databaseNameOf', () => {
  it.each([
    ['postgresql://user:secret@localhost:5432/booking', 'booking'],
    ['postgres://user:secret@db:5432/booking_test', 'booking_test'],
    [
      'postgresql://user:secret@localhost:5432/booking?schema=public',
      'booking',
    ],
    ['postgresql://user:secret@localhost:5432/', ''],
    ['postgresql://user:secret@localhost:5432', ''],
    ['not a url', ''],
  ])('%s → %j', (url, name) => {
    expect(databaseNameOf(url)).toBe(name);
  });
});

describe('isTestDatabaseUrl', () => {
  it.each([
    ['postgresql://user:secret@localhost:5432/booking_test', true],
    [
      'postgresql://user:secret@localhost:5432/booking_test?schema=public',
      true,
    ],
    ['postgresql://user:secret@localhost:5432/booking', false],
    ['postgresql://user:secret@localhost:5432/booking_test_old', false],
    ['postgresql://user:secret_test@localhost:5432/booking', false],
    ['postgresql://user:secret@localhost:5432/', false],
  ])('%s → %s', (url, expected) => {
    expect(isTestDatabaseUrl(url)).toBe(expected);
  });
});
