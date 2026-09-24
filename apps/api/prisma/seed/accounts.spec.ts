import { describe, expect, it } from 'vitest';
import { SEED_TENANTS, SEED_USERS, tenantSlugForCountry } from './accounts.js';

describe('tenantSlugForCountry', () => {
  it.each([
    ['RS', 'adriatic'],
    ['HR', 'adriatic'],
    ['SI', 'adriatic'],
    ['DE', 'central-europe'],
    ['AT', 'central-europe'],
    ['CZ', 'central-europe'],
    ['HU', 'central-europe'],
    ['CH', 'central-europe'],
    ['ES', 'west-europe'],
    ['PT', 'west-europe'],
    ['NL', 'west-europe'],
  ])('puts a listing in %s into %s', (country, slug) => {
    expect(tenantSlugForCountry(country)).toBe(slug);
  });

  it('rejects a country no tenant covers', () => {
    expect(() => tenantSlugForCountry('FR')).toThrow(/"FR"/);
  });
});

describe('SEED_USERS', () => {
  it('has one superadmin, two hosts per tenant and one client', () => {
    expect(SEED_USERS.filter((user) => user.isSuperadmin)).toHaveLength(1);
    for (const tenant of SEED_TENANTS) {
      expect(
        SEED_USERS.filter((user) => user.hostOf.includes(tenant.slug)),
      ).toHaveLength(2);
    }
    expect(
      SEED_USERS.filter(
        (user) => !user.isSuperadmin && user.hostOf.length === 0,
      ),
    ).toHaveLength(1);
  });

  it('uses unique lowercase e-mails, as the database requires', () => {
    const emails = SEED_USERS.map((user) => user.email);
    expect(new Set(emails).size).toBe(emails.length);
    for (const email of emails) {
      expect(email).toBe(email.toLowerCase());
    }
  });
});
