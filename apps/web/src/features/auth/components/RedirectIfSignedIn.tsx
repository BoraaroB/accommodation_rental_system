import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { QueryState } from '../../../components/ui/query-state';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useRedirectParam } from '../hooks/useRedirectParam';
import { postSignInDestination } from '../redirects';
import { HostPanelPicker } from './HostPanelPicker';

/**
 * The sign-in pages show `children` only when signed out. A signed-in user —
 * also right after signing in — goes where `postSignInDestination` says, or
 * chooses a host panel.
 */
export function RedirectIfSignedIn({ children }: { children: ReactNode }) {
  const redirect = useRedirectParam();
  const { isSignedIn, me } = useCurrentUser();

  if (!isSignedIn) {
    return children;
  }
  return (
    <QueryState query={me}>
      {(user) => {
        const destination = postSignInDestination(user, redirect);
        return destination === null ? (
          <HostPanelPicker user={user} />
        ) : (
          <Navigate replace to={destination} />
        );
      }}
    </QueryState>
  );
}
