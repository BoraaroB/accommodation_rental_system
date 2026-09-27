import { redirectPathSchema, type UserProfile } from '@ars/shared';
import { canUseAdminPanel } from './access';

function withRedirect(path: string, redirect: string | undefined): string {
  return redirect === undefined
    ? path
    : `${path}?${new URLSearchParams({ redirect }).toString()}`;
}

/** The sign-in page, returning to `redirect` afterwards. */
export function signInPath(redirect?: string): string {
  return withRedirect('/login', redirect);
}

/** The registration page, returning to `redirect` after the sign-in that follows. */
export function registerPath(redirect?: string): string {
  return withRedirect('/register', redirect);
}

/** The `?redirect=` value when it is a path inside the app; `undefined` otherwise. */
export function safeRedirect(value: string | null): string | undefined {
  const result = redirectPathSchema.safeParse(value);
  return result.success ? result.data : undefined;
}

/**
 * Where a signed-in user goes from the sign-in pages: back to the page they
 * came from, otherwise to their panel. `null` for a host of several tenants,
 * who chooses one (D-065).
 */
export function postSignInDestination(
  user: UserProfile,
  redirect: string | undefined,
): string | null {
  if (redirect !== undefined) {
    return redirect;
  }
  if (canUseAdminPanel(user)) {
    return '/admin';
  }
  const [first, ...others] = user.hostOf;
  if (first === undefined) {
    return '/';
  }
  return others.length === 0 ? hostPanelPath(first.slug) : null;
}

/** The host panel of the tenant `tenantSlug`. */
export function hostPanelPath(tenantSlug: string): string {
  return `/${tenantSlug}/host`;
}
