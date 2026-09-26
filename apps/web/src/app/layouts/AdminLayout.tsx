import { Link, NavLink, Outlet } from 'react-router';
import { cx } from '../../lib/cx';

/** The platform admin panel; it belongs to no tenant, so it has no branding. */
export function AdminLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border bg-surface-raised">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
          <Link to="/admin" className="text-lg font-semibold text-text">
            Admin
          </Link>
          <nav aria-label="Admin panel">
            <NavLink
              to="/admin/tenants"
              className={({ isActive }) =>
                cx(
                  'text-sm font-medium',
                  isActive ? 'text-primary' : 'text-muted hover:text-text',
                )
              }
            >
              Tenants
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
