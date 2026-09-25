import { describe, expect, it } from 'vitest';
import {
  RESERVED_TENANT_SLUGS,
  tenantCreateSchema,
  tenantSlugSchema,
  tenantUpdateSchema,
} from './tenant.js';

describe('tenantSlugSchema', () => {
  it.each(['adriatic', 'central-europe', 'west-europe-2', 'a'.repeat(63)])(
    'accepts %s',
    (slug) => {
      expect(tenantSlugSchema.safeParse(slug).success).toBe(true);
    },
  );

  it.each([
    'Adriatic',
    'central--europe',
    '-adriatic',
    'adriatic-',
    'a b',
    'a\u0000b',
    '',
    'a'.repeat(64),
  ])('rejects %j', (slug) => {
    expect(tenantSlugSchema.safeParse(slug).success).toBe(false);
  });

  it.each(RESERVED_TENANT_SLUGS)('rejects the reserved word %s', (slug) => {
    expect(tenantSlugSchema.safeParse(slug).success).toBe(false);
  });
});

describe('tenantCreateSchema', () => {
  const tenant = { slug: 'north-sea', name: 'North Sea' };

  it('needs only the name and the slug', () => {
    expect(tenantCreateSchema.parse(tenant)).toEqual(tenant);
  });

  it('normalizes the configuration', () => {
    expect(
      tenantCreateSchema.parse({
        slug: 'north-sea',
        name: '  North Sea  ',
        logoUrl: ' https://cdn.example.com/logo.png ',
        primaryColor: '#0A7C8B',
        contactEmail: ' Hello@North-Sea.example ',
      }),
    ).toEqual({
      slug: 'north-sea',
      name: 'North Sea',
      logoUrl: 'https://cdn.example.com/logo.png',
      primaryColor: '#0a7c8b',
      contactEmail: 'hello@north-sea.example',
    });
  });

  it('accepts null for the optional fields', () => {
    const config = { logoUrl: null, primaryColor: null, contactEmail: null };
    expect(tenantCreateSchema.parse({ ...tenant, ...config })).toEqual({
      ...tenant,
      ...config,
    });
  });

  it('drops fields it does not know, such as the currency', () => {
    expect(
      tenantCreateSchema.parse({ ...tenant, currency: 'USD', id: 'x' }),
    ).toEqual(tenant);
  });

  it.each([
    ['a missing name', { name: undefined }],
    ['a blank name', { name: '   ' }],
    ['a missing slug', { slug: undefined }],
    ['a reserved slug', { slug: 'admin' }],
    ['a javascript: logo URL', { logoUrl: 'javascript:alert(1)' }],
    ['a data: logo URL', { logoUrl: 'data:image/png;base64,AA' }],
    ['a logo URL without a domain', { logoUrl: 'https://localhost/logo.png' }],
    [
      'a logo URL with a NUL character',
      { logoUrl: 'https://cdn.example.com/a\u0000b.png' },
    ],
    ['a colour name', { primaryColor: 'teal' }],
    ['a short colour', { primaryColor: '#0a7' }],
    ['an invalid e-mail', { contactEmail: 'not-an-email' }],
  ])('rejects %s', (_case, change) => {
    expect(tenantCreateSchema.safeParse({ ...tenant, ...change }).success).toBe(
      false,
    );
  });
});

describe('tenantUpdateSchema', () => {
  it('keeps only the fields that were sent', () => {
    expect(tenantUpdateSchema.parse({ name: 'North Sea' })).toEqual({
      name: 'North Sea',
    });
  });

  it('keeps null, which clears a field', () => {
    expect(tenantUpdateSchema.parse({ logoUrl: null })).toEqual({
      logoUrl: null,
    });
  });

  it.each([
    ['an empty edit', {}],
    ['an edit of unknown fields only', { currency: 'USD' }],
    ['a null name', { name: null }],
    ['a null slug', { slug: null }],
    ['a reserved slug', { slug: 'login' }],
  ])('rejects %s', (_case, changes) => {
    expect(tenantUpdateSchema.safeParse(changes).success).toBe(false);
  });
});
