import { skipToken } from '@reduxjs/toolkit/query';
import { selectToken } from '../../../store/authSlice';
import { useAppSelector } from '../../../store/hooks';
import { useGetMeQuery } from '../api';

/**
 * The signed-in user: `isSignedIn` from the kept token, the profile from
 * `GET /auth/me` (not requested when signed out). `me` is the query, for
 * `QueryState`.
 */
export function useCurrentUser() {
  const token = useAppSelector(selectToken);
  const me = useGetMeQuery(token === null ? skipToken : undefined);
  return { isSignedIn: token !== null, user: me.data, me };
}
