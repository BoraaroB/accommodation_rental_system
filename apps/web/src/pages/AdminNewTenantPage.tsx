import { ArrowLeftIcon } from 'lucide-react';
import { Link } from 'react-router';
import { buttonVariants } from '../components/ui/button';
import { TenantForm } from '../features/admin/components/TenantForm';
import { ADMIN_TENANTS_PATH } from '../features/admin/paths';

/** A new tenant (challenge item 10); saving it opens its page. */
export function AdminNewTenantPage() {
  return (
    <div className="flex flex-col gap-6">
      <Link
        to={ADMIN_TENANTS_PATH}
        className={buttonVariants({
          variant: 'ghost',
          className: 'self-start',
        })}
      >
        <ArrowLeftIcon aria-hidden="true" />
        All tenants
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">New tenant</h1>
      <section
        aria-label="Configuration"
        className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 md:p-6"
      >
        <TenantForm />
      </section>
    </div>
  );
}
