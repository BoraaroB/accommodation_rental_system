import { HouseIcon } from 'lucide-react';
import { Link, Outlet } from 'react-router';
import { AccountMenu } from '../../features/auth/components/AccountMenu';

/** The platform's own pages — the landing page and sign-in — under its navbar. */
export function SiteLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Link
            to="/"
            className="flex min-w-0 items-center gap-2 text-lg font-semibold"
          >
            <span
              aria-hidden="true"
              className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"
            >
              <HouseIcon className="size-4" />
            </span>
            <span className="truncate">Accommodation Rental System</span>
          </Link>
          <AccountMenu />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-10">
        <Outlet />
      </main>
    </div>
  );
}
