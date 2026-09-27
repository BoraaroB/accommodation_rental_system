import type { PublicTenant } from '@ars/shared';
import { ArrowRightIcon, MapPinIcon } from 'lucide-react';
import { Link } from 'react-router';
import { EmptyState } from '../components/ui/empty-state';
import { QueryState } from '../components/ui/query-state';
import { Skeleton } from '../components/ui/skeleton';
import { useGetTenantsQuery } from '../features/tenants/api';
import { brandStyle } from '../features/tenants/brandStyle';
import { TenantLogo } from '../features/tenants/components/TenantLogo';

/** The demo's entry point: every tenant's portal, in `SiteLayout`. */
export function LandingPage() {
  const tenants = useGetTenantsQuery();
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Find your next stay
        </h1>
        <p className="text-muted-foreground">
          Choose a portal. Each portal shows only its own stays.
        </p>
      </section>
      <QueryState
        query={tenants}
        isEmpty={(list) => list.length === 0}
        empty={<EmptyState title="There are no portals yet" />}
        loading={
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((key) => (
              <Skeleton key={key} className="h-36 rounded-xl" />
            ))}
          </div>
        }
      >
        {(list) => (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((tenant) => (
              <li key={tenant.slug}>
                <PortalCard tenant={tenant} />
              </li>
            ))}
          </ul>
        )}
      </QueryState>
    </div>
  );
}

function PortalCard({ tenant }: { tenant: PublicTenant }) {
  return (
    <Link
      to={`/${tenant.slug}`}
      style={brandStyle(tenant.primaryColor)}
      className="group flex h-full flex-col gap-4 rounded-xl bg-card p-5 ring-1 ring-foreground/10 transition hover:shadow-md hover:ring-primary/40"
    >
      <span className="flex items-center gap-3">
        {tenant.logoUrl ? (
          <TenantLogo logoUrl={tenant.logoUrl} className="size-10" />
        ) : (
          <span
            aria-hidden="true"
            className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary"
          >
            <MapPinIcon className="size-5" />
          </span>
        )}
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-semibold">{tenant.name}</span>
          <span className="text-sm text-muted-foreground">/{tenant.slug}</span>
        </span>
      </span>
      <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-primary">
        Explore stays
        <ArrowRightIcon
          aria-hidden="true"
          className="size-4 transition-transform group-hover:translate-x-0.5"
        />
      </span>
    </Link>
  );
}
