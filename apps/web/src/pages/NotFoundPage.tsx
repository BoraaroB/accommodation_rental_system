import { Link } from 'react-router';

/** Any URL no route matches (`path: '*'`) and a 404 thrown by a route. */
export function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-sm text-muted-foreground">
        The page you are looking for does not exist or has moved.
      </p>
      <Link to="/" className="font-medium text-primary hover:underline">
        Go to the home page
      </Link>
    </main>
  );
}
