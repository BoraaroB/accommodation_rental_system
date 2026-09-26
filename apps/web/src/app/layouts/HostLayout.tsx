import { NavLink, Outlet } from 'react-router';
import { cx } from '../../lib/cx';

const tabs = [
  { to: 'listings', label: 'Listings' },
  { to: 'bookings', label: 'Bookings' },
] as const;

/** The host panel: tabs on top on desktop, a bottom navigation bar on phones. */
export function HostLayout() {
  return (
    <div className="pb-16 md:pb-0">
      <nav
        aria-label="Host panel"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface-raised md:static md:mb-6 md:gap-2 md:border-t-0 md:border-b md:bg-transparent"
      >
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              cx(
                'flex h-14 flex-1 items-center justify-center text-sm font-medium md:h-11 md:flex-none md:border-b-2 md:px-4',
                isActive
                  ? 'text-primary md:border-primary'
                  : 'text-muted hover:text-text md:border-transparent',
              )
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
