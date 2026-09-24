/** The signed-in user as the access token proves it: identity only, no roles (D-007). */
export interface AuthUser {
  id: string;
  email: string;
}

/** The request fields `AuthGuard` reads and sets. */
export interface AuthenticatedRequest {
  headers: { authorization?: string };
  /** Set by `AuthGuard` on every route that is not `@Public()`. */
  user?: AuthUser;
}
