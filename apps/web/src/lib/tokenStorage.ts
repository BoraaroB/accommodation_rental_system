import { accessTokenSchema } from '@ars/shared';

/** The `localStorage` key of the access token. */
export const TOKEN_KEY = 'ars.accessToken';

/**
 * Keeps the access token between visits. `localStorage` can be unavailable
 * (private mode, blocked site data); the token then lasts for this visit only.
 * The token is never logged.
 */
// Possible improvement (not in the plan): follow the `storage` event, so a
// sign-in or sign-out in one tab applies to the other tabs.
export const tokenStorage = {
  /** The kept token; an empty or missing value is no token. */
  read(): string | null {
    try {
      const token = accessTokenSchema.shape.accessToken.safeParse(
        localStorage.getItem(TOKEN_KEY),
      );
      return token.success ? token.data : null;
    } catch {
      return null;
    }
  },
  save(token: string): void {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      // Kept in the store for this visit only.
    }
  },
  clear(): void {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // Nothing could be stored, so nothing is left.
    }
  },
};
