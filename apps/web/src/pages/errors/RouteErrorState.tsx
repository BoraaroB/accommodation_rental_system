import { useRouteError } from 'react-router';
import { EmptyState } from '../../components/ui/empty-state';
import { ErrorState } from '../../components/ui/error-state';
import { describeRouteError } from './routeError';

/**
 * A layout's content boundary: replaces only the page, so the layout's
 * header and navigation stay usable.
 */
export function RouteErrorState() {
  const { isNotFound, message } = describeRouteError(useRouteError());
  if (isNotFound) {
    return (
      <EmptyState
        title="Page not found"
        description="The page you are looking for does not exist or has moved."
      />
    );
  }
  return (
    <ErrorState message={message} onRetry={() => window.location.reload()} />
  );
}
