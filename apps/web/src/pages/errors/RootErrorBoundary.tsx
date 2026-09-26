import { useRouteError } from 'react-router';
import { Button } from '../../components/ui/Button';
import { NotFoundPage } from '../NotFoundPage';
import { describeRouteError } from './routeError';

/**
 * The last line of defence: a full-page fallback for any route error no
 * layout caught. It uses plain links and a reload, so it works even when
 * the app's state is broken.
 */
export function RootErrorBoundary() {
  const { isNotFound, message } = describeRouteError(useRouteError());
  if (isNotFound) {
    return <NotFoundPage />;
  }

  return (
    <main
      role="alert"
      className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 px-4 text-center"
    >
      <h1 className="text-2xl font-semibold text-text">Something went wrong</h1>
      <p className="text-sm text-muted">{message}</p>
      <div className="mt-2 flex gap-3">
        <Button onClick={() => window.location.reload()}>Try again</Button>
        <a
          href="/"
          className="inline-flex h-11 items-center rounded-control px-4 text-sm font-medium text-primary hover:bg-primary/10"
        >
          Home
        </a>
      </div>
    </main>
  );
}
