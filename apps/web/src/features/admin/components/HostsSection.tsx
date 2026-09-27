import type { AdminTenant, TenantHost } from '@ars/shared';
import { useState } from 'react';
import { toast } from 'sonner';
import { getErrorStatus } from '../../../api/errors';
import { FormAlert } from '../../../components/FormAlert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../../../components/ui/alert-dialog';
import { Button } from '../../../components/ui/button';
import { EmptyState } from '../../../components/ui/empty-state';
import { QueryState } from '../../../components/ui/query-state';
import { Skeleton } from '../../../components/ui/skeleton';
import { useGetTenantHostsQuery, useRemoveHostMutation } from '../api';
import { AddHostForm } from './AddHostForm';

/**
 * The host's remove button and a plain confirmation: only the membership
 * goes, the account stays (D-053). A host already removed (404) closes it,
 * and the list drops the row.
 */
function RemoveHostDialog({
  tenant,
  host,
}: {
  tenant: AdminTenant;
  host: TenantHost;
}) {
  const [open, setOpen] = useState(false);
  const [removeHost, removal] = useRemoveHostMutation();

  const changeOpen = (next: boolean) => {
    // Closing while the request runs would hide how it ended.
    if (removal.isLoading) {
      return;
    }
    setOpen(next);
    if (next) {
      removal.reset();
    }
  };

  const confirm = async () => {
    const removed = await removeHost({ tenantId: tenant.id, userId: host.id });
    if (removed.error === undefined) {
      setOpen(false);
      toast.success(`${host.email} is no longer a host`);
    } else if (getErrorStatus(removed.error) === 404) {
      setOpen(false);
      toast.info(`${host.email} was already removed`);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={changeOpen}>
      <AlertDialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            aria-label={`Remove ${host.email}`}
          />
        }
      >
        Remove
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove {host.name} as a host?</AlertDialogTitle>
          <AlertDialogDescription>
            {host.email} will no longer manage {tenant.name}. The account stays
            and can still use the portal as a client.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <FormAlert error={removal.error} />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={removal.isLoading}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={removal.isLoading}
            onClick={() => void confirm()}
          >
            Remove host
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** The tenant's hosts (challenge item 12): the list, removal and the add form. */
export function HostsSection({ tenant }: { tenant: AdminTenant }) {
  const hosts = useGetTenantHostsQuery(tenant.id);

  return (
    <div className="flex flex-col gap-6">
      <QueryState
        query={hosts}
        isEmpty={(list) => list.length === 0}
        empty={
          <EmptyState
            title="No hosts yet"
            description="Add the first host below."
          />
        }
        loading={<Skeleton className="h-24 w-full rounded-xl" />}
      >
        {(list) => (
          <ul aria-label="Hosts" className="flex flex-col divide-y">
            {list.map((host) => (
              <li
                key={host.id}
                className="flex items-center justify-between gap-4 py-3"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{host.email}</span>
                  <span className="truncate text-sm text-muted-foreground">
                    {host.name}
                  </span>
                </div>
                <RemoveHostDialog tenant={tenant} host={host} />
              </li>
            ))}
          </ul>
        )}
      </QueryState>
      <AddHostForm tenantId={tenant.id} />
    </div>
  );
}
