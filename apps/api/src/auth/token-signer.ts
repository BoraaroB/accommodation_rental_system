import type { AuthUser } from './auth-user.js';

export const TOKEN_SIGNER = Symbol('TOKEN_SIGNER');

/** Issues and checks access tokens; the only place that knows what a token holds. */
export interface TokenSigner {
  sign(user: AuthUser): Promise<string>;
  /** The user the token proves, or `null` when it is invalid, expired or malformed. */
  verify(token: string): Promise<AuthUser | null>;
}
