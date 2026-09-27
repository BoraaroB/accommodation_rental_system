import { Link, NavLink, Outlet } from 'react-router';
import { AccountMenu } from '../../features/auth/components/AccountMenu';
import { cn } from '../../lib/utils';

/**
 * The platform admin panel; it belongs to no tenant, so it has no branding.
 * `RequireSuperadmin` lets only superadmins see it.
 */
export function AdminLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
          <Link to="/admin" className="text-lg font-semibold text-foreground">
            Admin
          </Link>
          <nav aria-label="Admin panel">
            <NavLink
              to="/admin/tenants"
              className={({ isActive }) =>
                cn(
                  'text-sm font-medium',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground',
                )
              }
            >
              Tenants
            </NavLink>
          </nav>
          <div className="ml-auto">
            <AccountMenu />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
