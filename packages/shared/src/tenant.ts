import { z } from 'zod';
import { emailSchema } from './auth.js';
import { currencySchema } from './listing.js';
import { plainTextSchema } from './text.js';

/**
 * Words that name the web app's own routes (`/admin`, `/login`, …), so a
 * portal at `/{slug}` can never shadow one (D-028).
 */
export const RESERVED_TENANT_SLUGS: readonly string[] = [
  'admin',
  'api',
  'login',
  'register',
];

/**
 * A tenant slug: kebab-case, the format the database enforces
 * (`tenants_slug_format_check`, D-028), at most 63 characters (a DNS label;
 * it also keeps the unique index's rows small), and not a reserved word. A
 * value in any other form names no tenant.
 */
export const tenantSlugSchema = z
  .string()
  .max(63)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Expected a kebab-case slug')
  .refine((slug) => !RESERVED_TENANT_SLUGS.includes(slug), {
    message: 'This slug is reserved',
  });

/** A tenant's id, the `:tenantId` of admin routes: a uuid. */
export const tenantIdSchema = z.uuid();

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

/** A tenant in the admin panel: its configuration and the id its routes use. */
export const adminTenantSchema = publicTenantSchema.extend({
  id: tenantIdSchema,
});

/**
 * The tenant's configuration as the admin panel writes it. Name and slug are
 * required; the rest may be left out or `null`. The web app renders these
 * values, so the logo is an http(s) URL on a domain (it goes into
 * `<img src>`) and the colour is `#rrggbb` (it goes into a CSS variable). The
 * currency is not written: EUR is the only one.
 */
export const tenantCreateSchema = z.object({
  slug: tenantSlugSchema,
  // Possible improvement (not in the plan): a maximum length for the name and
  // the logo URL.
  name: plainTextSchema,
  logoUrl: plainTextSchema.pipe(z.httpUrl()).nullish(),
  primaryColor: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^#[0-9a-f]{6}$/, 'Expected a colour as #rrggbb')
    .nullish(),
  contactEmail: emailSchema.nullish(),
});

/**
 * A partial edit of the configuration (JSON Merge Patch): a field that is not
 * sent stays as it is, `null` clears an optional one. An edit changes at
 * least one field.
 */
export const tenantUpdateSchema = tenantCreateSchema
  .partial()
  .refine(
    (changes) => Object.values(changes).some((value) => value !== undefined),
    { message: 'Send at least one field to change' },
  );

export type PublicTenant = z.infer<typeof publicTenantSchema>;
export type AdminTenant = z.infer<typeof adminTenantSchema>;
export type TenantCreateInput = z.infer<typeof tenantCreateSchema>;
export type TenantUpdateInput = z.infer<typeof tenantUpdateSchema>;
