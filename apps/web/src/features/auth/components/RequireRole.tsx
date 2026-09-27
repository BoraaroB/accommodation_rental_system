import type { UserProfile } from '@ars/shared';
import { Navigate, Outlet, useLocation } from 'react-router';
import { QueryState } from '../../../components/ui/query-state';
import { Skeleton } from '../../../components/ui/skeleton';
import { useTenantSlug } from '../../../hooks/useTenantSlug';
import { canUseAdminPanel, canUseHostPanel } from '../access';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { signInPath } from '../redirects';
import { AccessDenied } from './AccessDenied';

interface RequireRoleProps {
  /** Whether the signed-in user may see the pages inside. */
  allows: (user: UserProfile) => boolean;
}

/**
 * A layout route around protected pages. Signed out: to sign-in, and back
 * here afterwards. Signed in without the rights: the 403 page. The API still
 * checks every request (D-007).
 */
function RequireRole({ allows }: RequireRoleProps) {
  const location = useLocation();
  const { isSignedIn, me } = useCurrentUser();

  if (!isSignedIn) {
    return (
      <Navigate replace to={signInPath(location.pathname + location.search)} />
    );
  }
  return (
    <QueryState
      query={me}
      loading={
        <div className="mx-auto max-w-6xl px-4 py-6">
          <Skeleton className="h-32 w-full" />
        </div>
      }
    >
      {(user) => (allows(user) ? <Outlet /> : <AccessDenied user={user} />)}
    </QueryState>
  );
}

/** The admin panel: superadmins only. */
export function RequireSuperadmin() {
  return <RequireRole allows={canUseAdminPanel} />;
}

/** A tenant's host panel: its hosts and superadmins. */
export function RequireHost() {
  const tenantSlug = useTenantSlug();
  return <RequireRole allows={(user) => canUseHostPanel(user, tenantSlug)} />;
}
