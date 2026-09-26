import { Link, Outlet, useParams } from 'react-router';

/** A tenant's public portal: header and content. The host panel nests inside it. */
export function PortalLayout() {
  const { tenantSlug } = useParams();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border bg-surface-raised">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link
            to={`/${tenantSlug}`}
            className="text-lg font-semibold text-primary"
          >
            {tenantSlug}
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
