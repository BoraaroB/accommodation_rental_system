import { PlusIcon } from 'lucide-react';
import { Link } from 'react-router';
import { buttonVariants } from '../components/ui/button';
import { EmptyState } from '../components/ui/empty-state';
import { ErrorBoundary } from '../components/ui/error-boundary';
import { ErrorState } from '../components/ui/error-state';
import { QueryState } from '../components/ui/query-state';
import { Skeleton } from '../components/ui/skeleton';
import { useGetAdminTenantsQuery } from '../features/admin/api';
import { TenantsTable } from '../features/admin/components/TenantsTable';
import { NEW_TENANT_PATH } from '../features/admin/paths';
import { pluralize } from '../lib/format';

/** Every tenant (challenge item 10): open, create or delete one. */
export function AdminTenantsPage() {
  const tenants = useGetAdminTenantsQuery();

  const newTenantLink = (
    <Link to={NEW_TENANT_PATH} className={buttonVariants()}>
      <PlusIcon aria-hidden="true" />
      New tenant
    </Link>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Tenants</h1>
        {newTenantLink}
      </div>
      <QueryState
        query={tenants}
        isEmpty={(list) => list.length === 0}
        empty={
          <EmptyState
            title="No tenants yet"
            description="A tenant is a portal with its own listings and hosts."
            action={newTenantLink}
          />
        }
        loading={<Skeleton className="h-64 w-full rounded-xl" />}
      >
        {(list) => (
          <div className="flex flex-col gap-4">
            <p role="status" className="text-sm font-medium">
              {pluralize(list.length, 'tenant')}
            </p>
            <div className="rounded-xl bg-card px-2 ring-1 ring-foreground/10">
              <ErrorBoundary
                fallback={
                  <ErrorState message="The table could not be shown." />
                }
              >
                <TenantsTable tenants={list} />
              </ErrorBoundary>
            </div>
          </div>
        )}
      </QueryState>
    </div>
  );
}
