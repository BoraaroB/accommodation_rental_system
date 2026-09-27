import { tenantSlugSchema } from '@ars/shared';
import { skipToken } from '@reduxjs/toolkit/query';
import { ArrowLeftIcon } from 'lucide-react';
import { Link, Outlet } from 'react-router';
import {
  getErrorMessage,
  getErrorStatus,
  getRequestId,
} from '../../api/errors';
import { buttonVariants } from '../../components/ui/button';
import { EmptyState } from '../../components/ui/empty-state';
import { ErrorState } from '../../components/ui/error-state';
import { Skeleton } from '../../components/ui/skeleton';
import { useGetTenantQuery } from '../../features/tenants/api';
import { TenantLogo } from '../../features/tenants/components/TenantLogo';
import { useBrandColor } from '../../features/tenants/hooks/useBrandColor';
import { useTenantSlug } from '../../hooks/useTenantSlug';

/**
 * A tenant's public portal in its branding: the header takes the tenant's
 * primary colour, name and logo. The host panel nests inside it.
 */
export function PortalLayout() {
  const tenantSlug = useTenantSlug();
  // A value that is not a slug names no portal; it is not sent to the API.
  const isSlug = tenantSlugSchema.safeParse(tenantSlug).success;
  const tenant = useGetTenantQuery(isSlug ? tenantSlug : skipToken);
  const notFound = !isSlug || getErrorStatus(tenant.error) === 404;
  useBrandColor(tenant.data?.primaryColor);

  let content = <Outlet />;
  if (notFound) {
    content = (
      <EmptyState
        title="Portal not found"
        description="There is no portal at this address."
        action={
          <Link to="/" className={buttonVariants({ variant: 'outline' })}>
            See all portals
          </Link>
        }
      />
    );
  } else if (tenant.isError && tenant.currentData === undefined) {
    content = (
      <ErrorState
        message={getErrorMessage(tenant.error)}
        requestId={getRequestId(tenant.error)}
        onRetry={() => void tenant.refetch()}
      />
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="bg-primary text-primary-foreground">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          {tenant.data ? (
            <Link
              to={`/${tenant.data.slug}`}
              className="flex min-w-0 items-center gap-2 text-lg font-semibold"
            >
              <TenantLogo logoUrl={tenant.data.logoUrl} />
              <span className="truncate">{tenant.data.name}</span>
            </Link>
          ) : notFound || tenant.isError ? (
            <span className="text-lg font-semibold">Portals</span>
          ) : (
            <Skeleton className="h-6 w-40 bg-primary-foreground/20" />
          )}
          <Link
            to="/"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-primary-foreground/85 hover:bg-primary-foreground/10 hover:text-primary-foreground"
          >
            <ArrowLeftIcon aria-hidden="true" className="size-4" />
            All portals
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {content}
      </main>
      {tenant.data?.contactEmail && (
        <footer className="border-t bg-card">
          <p className="mx-auto max-w-6xl px-4 py-4 text-sm text-muted-foreground">
            Contact:{' '}
            <a
              href={`mailto:${tenant.data.contactEmail}`}
              className="font-medium text-primary hover:underline"
            >
              {tenant.data.contactEmail}
            </a>
          </p>
        </footer>
      )}
    </div>
  );
}
