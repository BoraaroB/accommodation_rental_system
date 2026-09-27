import { describe, expect, it } from 'vitest';
import {
  emailSchema,
  loginSchema,
  redirectPathSchema,
  registerSchema,
} from './auth.js';

const registration = {
  email: 'guest@example.com',
  password: 'correct-horse',
  name: 'Guest',
};

describe('emailSchema', () => {
  it('trims and lowercases the address', () => {
    expect(emailSchema.parse('  Guest@Example.COM ')).toBe('guest@example.com');
  });
});

describe('registerSchema', () => {
  it('accepts a registration and trims the name', () => {
    expect(
      registerSchema.parse({ ...registration, name: '  Guest  ' }),
    ).toEqual(registration);
  });

  it('drops fields that would grant rights', () => {
    const parsed = registerSchema.parse({
      ...registration,
      isSuperadmin: true,
      hostOf: ['adriatic'],
    });
    expect(parsed).toEqual(registration);
  });

  it.each([
    ['a password shorter than 8 characters', { password: 'short' }],
    ['a blank name', { name: '   ' }],
  ])('rejects %s', (_case, change) => {
    expect(
      registerSchema.safeParse({ ...registration, ...change }).success,
    ).toBe(false);
  });

  it('accepts a password of exactly 72 bytes', () => {
    // 'é' is 2 bytes in UTF-8: 36 of them are 72 bytes.
    const password = 'é'.repeat(36);
    expect(
      registerSchema.safeParse({ ...registration, password }).success,
    ).toBe(true);
  });

  it('rejects a longer password, which bcrypt would truncate', () => {
    const result = registerSchema.safeParse({
      ...registration,
      password: 'é'.repeat(37),
    });
    expect(result.error?.issues[0]?.path).toEqual(['password']);
  });
});

describe('loginSchema', () => {
  it('normalizes the e-mail like registration does', () => {
    expect(
      loginSchema.parse({ email: ' Guest@Example.com', password: 'x' }),
    ).toEqual({ email: 'guest@example.com', password: 'x' });
  });
});

describe('redirectPathSchema', () => {
  it.each([
    '/',
    '/adriatic',
    '/adriatic/host?tab=bookings',
    '/adriatic/listings/abc?from=2026-10-01&to=2026-10-04',
    '/login-help',
  ])('accepts the path %s', (path) => {
    expect(redirectPathSchema.safeParse(path).success).toBe(true);
  });

  it.each([
    ['an empty value', ''],
    ['a relative path', 'adriatic'],
    ['a protocol-relative URL', '//evil.example'],
    ['an absolute URL', 'https://evil.example'],
    ['a backslash, read as a slash', '/\\evil.example'],
    ['a tab, dropped by browsers', '/\t/evil.example'],
    ['the sign-in page', '/login'],
    ['the sign-in page with a query', '/login?redirect=/admin'],
    ['the registration page', '/register'],
    ['the sign-in page in capitals', '/Login'],
  ])('rejects %s', (_case, path) => {
    expect(redirectPathSchema.safeParse(path).success).toBe(false);
  });
});
