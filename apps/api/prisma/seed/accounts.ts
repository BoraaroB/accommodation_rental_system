/** A seeded portal and the listing countries it receives (D-004). */
export interface SeedTenant {
  slug: string;
  name: string;
  contactEmail: string;
  /** ISO 3166-1 alpha-2 codes; every listing in one of them belongs to this tenant. */
  countries: readonly string[];
}

/** A seeded account; every one signs in with `SEED_DEMO_PASSWORD`. */
export interface SeedUser {
  email: string;
  name: string;
  isSuperadmin: boolean;
  /** Slugs of the tenants this user hosts. */
  hostOf: readonly string[];
}

/** Three portals split by region: 363, 428 and 209 listings. */
export const SEED_TENANTS: readonly SeedTenant[] = [
  {
    slug: 'adriatic',
    name: 'Adriatic Stays',
    contactEmail: 'contact@adriatic.example.com',
    countries: ['RS', 'HR', 'SI'],
  },
  {
    slug: 'central-europe',
    name: 'Central Europe Stays',
    contactEmail: 'contact@central-europe.example.com',
    countries: ['DE', 'AT', 'CZ', 'HU', 'CH'],
  },
  {
    slug: 'west-europe',
    name: 'West Europe Stays',
    contactEmail: 'contact@west-europe.example.com',
    countries: ['ES', 'PT', 'NL'],
  },
];

/** One superadmin, two hosts per tenant and one demo client. */
export const SEED_USERS: readonly SeedUser[] = [
  {
    email: 'admin@example.com',
    name: 'Platform Admin',
    isSuperadmin: true,
    hostOf: [],
  },
  ...SEED_TENANTS.flatMap((tenant) =>
    [1, 2].map((n) => ({
      email: `host${n}.${tenant.slug}@example.com`,
      name: `${tenant.name} Host ${n}`,
      isSuperadmin: false,
      hostOf: [tenant.slug],
    })),
  ),
  {
    email: 'client@example.com',
    name: 'Demo Client',
    isSuperadmin: false,
    hostOf: [],
  },
];

const TENANT_BY_COUNTRY = new Map(
  SEED_TENANTS.flatMap((tenant) =>
    tenant.countries.map((country) => [country, tenant.slug] as const),
  ),
);

/** The slug of the tenant a listing in `country` belongs to; throws for a country no tenant covers. */
export function tenantSlugForCountry(country: string): string {
  const slug = TENANT_BY_COUNTRY.get(country);
  if (slug === undefined) {
    throw new Error(`No seeded tenant covers the country "${country}"`);
  }
  return slug;
}
