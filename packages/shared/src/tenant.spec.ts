import { describe, expect, it } from 'vitest';
import { tenantSlugSchema } from './tenant.js';

describe('tenantSlugSchema', () => {
  it.each(['adriatic', 'central-europe', 'west-europe-2'])(
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
  ])('rejects %j', (slug) => {
    expect(tenantSlugSchema.safeParse(slug).success).toBe(false);
  });
});
