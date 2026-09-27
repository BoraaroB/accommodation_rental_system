import type { AdminTenant } from '@ars/shared';
import { Trash2Icon } from 'lucide-react';
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
import { FormField } from '../../../components/ui/form-field';
import { Input } from '../../../components/ui/input';
import { useDeleteTenantMutation } from '../api';
import { portalPath } from '../paths';

// Possible improvement (not in the plan): a soft delete with a period in which
// the tenant can be restored; it needs a schema and API change (D-029, D-069).
/**
 * The tenant's delete button and its confirmation. Deleting cannot be undone
 * and takes the tenant's data with it (D-029), so the admin types the slug
 * first. The dialog stays open, with the error, when the request fails; a
 * tenant that was already deleted (404) closes it, and the list drops the row.
 */
export function DeleteTenantDialog({ tenant }: { tenant: AdminTenant }) {
  const [open, setOpen] = useState(false);
  const [typedSlug, setTypedSlug] = useState('');
  const [deleteTenant, deletion] = useDeleteTenantMutation();

  const changeOpen = (next: boolean) => {
    // Closing while the request runs would hide how it ended.
    if (deletion.isLoading) {
      return;
    }
    setOpen(next);
    if (next) {
      setTypedSlug('');
      deletion.reset();
    }
  };

  const confirm = async () => {
    const deleted = await deleteTenant(tenant.id);
    if (deleted.error === undefined) {
      setOpen(false);
      toast.success(`${tenant.name} deleted`);
    } else if (getErrorStatus(deleted.error) === 404) {
      setOpen(false);
      toast.info(`${tenant.name} was already deleted`);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={changeOpen}>
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Delete ${tenant.name}`}
          />
        }
      >
        <Trash2Icon aria-hidden="true" />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {tenant.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            The portal {portalPath(tenant.slug)} and all its listings, bookings,
            blocked days and host memberships are deleted. User accounts stay.
            This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (typedSlug === tenant.slug) {
              void confirm();
            }
          }}
          className="flex flex-col gap-4"
        >
          <FormAlert error={deletion.error} />
          <FormField label={`Type ${tenant.slug} to confirm`}>
            {(field) => (
              <Input
                {...field}
                value={typedSlug}
                onChange={(event) => setTypedSlug(event.target.value)}
                autoCapitalize="none"
                autoComplete="off"
                spellCheck={false}
              />
            )}
          </FormField>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletion.isLoading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              type="submit"
              variant="destructive"
              disabled={typedSlug !== tenant.slug || deletion.isLoading}
            >
              Delete tenant
            </AlertDialogAction>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
