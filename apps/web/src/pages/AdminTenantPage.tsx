import { tenantIdSchema } from '@ars/shared';
import { skipToken } from '@reduxjs/toolkit/query';
import { ArrowLeftIcon, ExternalLinkIcon } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { getErrorStatus } from '../api/errors';
import { buttonVariants } from '../components/ui/button';
import { EmptyState } from '../components/ui/empty-state';
import { QueryState } from '../components/ui/query-state';
import { Skeleton } from '../components/ui/skeleton';
import { useGetAdminTenantQuery } from '../features/admin/api';
import { HostsSection } from '../features/admin/components/HostsSection';
import { TenantForm } from '../features/admin/components/TenantForm';
import { ADMIN_TENANTS_PATH, portalPath } from '../features/admin/paths';

const SECTION =
  'flex flex-col gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10 md:p-6';

/**
 * One tenant in the admin panel: its configuration (challenge item 11) and
 * its hosts (item 12).
 */
export function AdminTenantPage() {
  const { tenantId = '' } = useParams();
  // A value that is not a tenant id names no tenant; it is not sent to the API.
  const isTenantId = tenantIdSchema.safeParse(tenantId).success;
  const tenant = useGetAdminTenantQuery(isTenantId ? tenantId : skipToken);

  const backLink = (
    <Link
      to={ADMIN_TENANTS_PATH}
      className={buttonVariants({ variant: 'ghost', className: 'self-start' })}
    >
      <ArrowLeftIcon aria-hidden="true" />
      All tenants
    </Link>
  );

  if (!isTenantId || getErrorStatus(tenant.error) === 404) {
    return (
      <div className="flex flex-col gap-6">
        {backLink}
        <EmptyState
          title="Tenant not found"
          description="It may have been deleted, or the link is wrong."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {backLink}
      <QueryState
        query={tenant}
        loading={<Skeleton className="h-96 w-full rounded-xl" />}
      >
        {(tenant) => (
          <article className="flex flex-col gap-6">
            <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-semibold tracking-tight">
                  {tenant.name}
                </h1>
                <p className="text-muted-foreground">
                  {portalPath(tenant.slug)}
                </p>
              </div>
              <Link
                to={portalPath(tenant.slug)}
                className={buttonVariants({
                  variant: 'outline',
                  className: 'self-start md:self-auto',
                })}
              >
                <ExternalLinkIcon aria-hidden="true" />
                View the portal
              </Link>
            </header>
            <section
              aria-labelledby="configuration-heading"
              className={SECTION}
            >
              <h2 id="configuration-heading" className="text-xl font-semibold">
                Configuration
              </h2>
              {/* A new tenant starts a new form. */}
              <TenantForm key={tenant.id} tenant={tenant} />
            </section>
            <section aria-labelledby="hosts-heading" className={SECTION}>
              <h2 id="hosts-heading" className="text-xl font-semibold">
                Hosts
              </h2>
              <HostsSection key={tenant.id} tenant={tenant} />
            </section>
          </article>
        )}
      </QueryState>
    </div>
  );
}
