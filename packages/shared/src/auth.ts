import { z } from 'zod';
import { plainTextSchema } from './text.js';

/** bcrypt hashes only the first 72 bytes of a password and ignores the rest. */
const PASSWORD_MAX_BYTES = 72;

/** Length of `value` in UTF-8 bytes, the encoding bcrypt hashes. */
function utf8ByteLength(value: string): number {
  let bytes = 0;
  for (const char of value) {
    const codePoint = char.codePointAt(0) ?? 0;
    if (codePoint < 0x80) bytes += 1;
    else if (codePoint < 0x800) bytes += 2;
    else if (codePoint < 0x10000) bytes += 3;
    else bytes += 4;
  }
  return bytes;
}

/**
 * An e-mail address, trimmed and lowercased before it is checked: one account
 * per address, whatever its case (D-003).
 */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email().max(254));

/** A password as an account is created with it: 8 characters to 72 bytes. */
export const passwordSchema = z
  .string()
  .min(8)
  .refine((value) => utf8ByteLength(value) <= PASSWORD_MAX_BYTES, {
    message: `Too long: expected at most ${PASSWORD_MAX_BYTES} bytes`,
  });

/** A person's name on their account. */
export const userNameSchema = plainTextSchema.max(100);

/** A user's id: a uuid. */
export const userIdSchema = z.uuid();

/**
 * Registration. It always creates a client: a field such as `isSuperadmin` is
 * not part of the schema and is dropped (D-008).
 */
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: userNameSchema,
});

/** Sign-in. The password rules are not repeated: a wrong password is a 401, not a 400. */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

/** The response of a successful sign-in; the token is sent as `Authorization: Bearer <token>`. */
export const accessTokenSchema = z.object({
  accessToken: z.string().min(1),
});

/** A tenant the user hosts: the slug for routing, the name for the menu. */
export const hostedTenantSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
});

/**
 * Who the signed-in user is (`GET /auth/me`, and the response of registration).
 * The web app uses `isSuperadmin` and `hostOf` for UI gating only; the API
 * checks permissions on every request (D-007).
 */
export const userProfileSchema = z.object({
  id: userIdSchema,
  email: z.email(),
  name: z.string().min(1),
  isSuperadmin: z.boolean(),
  hostOf: z.array(hostedTenantSchema),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type AccessToken = z.infer<typeof accessTokenSchema>;
export type HostedTenant = z.infer<typeof hostedTenantSchema>;
export type UserProfile = z.infer<typeof userProfileSchema>;
