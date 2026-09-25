import { z } from 'zod';
import {
  emailSchema,
  passwordSchema,
  userIdSchema,
  userNameSchema,
} from './auth.js';

/**
 * A host account added to a tenant by the superadmin (D-008), with the rules
 * of registration. When the e-mail already has an account, that account only
 * becomes a host: its name and password stay as they are.
 */
export const hostInputSchema = z.object({
  email: emailSchema,
  name: userNameSchema,
  password: passwordSchema,
});

/** A host of a tenant, as the admin panel lists it. */
export const tenantHostSchema = z.object({
  id: userIdSchema,
  email: z.email(),
  name: z.string().min(1),
});

/**
 * The host just added. `accountCreated` is false when the e-mail already had
 * an account, so the password that was sent was not applied.
 */
export const addedHostSchema = tenantHostSchema.extend({
  accountCreated: z.boolean(),
});

export type HostInput = z.infer<typeof hostInputSchema>;
export type TenantHost = z.infer<typeof tenantHostSchema>;
export type AddedHost = z.infer<typeof addedHostSchema>;
