import { useSearchParams } from 'react-router';
import { safeRedirect } from '../redirects';

/** The sign-in pages' `?redirect=`, when it is a path inside the app. */
export function useRedirectParam(): string | undefined {
  const [searchParams] = useSearchParams();
  return safeRedirect(searchParams.get('redirect'));
}
