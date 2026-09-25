import { z } from 'zod';
import { currencySchema } from './listing.js';

/**
 * A tenant slug: kebab-case, the format the database enforces
 * (`tenants_slug_format_check`, D-028). A value in any other form names no
 * tenant.
 */
export const tenantSlugSchema = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Expected a kebab-case slug');

/**
 * A portal as its visitors see it: the configuration and branding the web app
 * needs, without the tenant's id.
 */
export const publicTenantSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  logoUrl: z.string().nullable(),
  primaryColor: z.string().nullable(),
  contactEmail: z.string().nullable(),
  currency: currencySchema,
});

export type PublicTenant = z.infer<typeof publicTenantSchema>;
