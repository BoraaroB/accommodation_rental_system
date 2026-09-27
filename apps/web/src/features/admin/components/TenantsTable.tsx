import type { AdminTenant } from '@ars/shared';
import { Link } from 'react-router';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';
import { adminTenantPath, portalPath } from '../paths';
import { DeleteTenantDialog } from './DeleteTenantDialog';

/** Shown from `md` up; phones get the name, the slug and the delete button. */
const WIDE = 'hidden md:table-cell';

/** The tenant's primary colour as a swatch and its value; the default when it has none. */
function ColourCell({ colour }: { colour: string | null }) {
  if (colour === null) {
    return <span className="text-muted-foreground">Default</span>;
  }
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden="true"
        className="size-4 rounded-sm ring-1 ring-foreground/10"
        // The tenant's own colour, a `#rrggbb` value (D-052).
        style={{ backgroundColor: colour }}
      />
      {colour}
    </span>
  );
}

/**
 * Every tenant (challenge item 10): the name opens its configuration and
 * hosts, the slug its portal; each row can be deleted.
 */
export function TenantsTable({ tenants }: { tenants: AdminTenant[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Name</TableHead>
          <TableHead>Slug</TableHead>
          <TableHead className={WIDE}>Contact</TableHead>
          <TableHead className={WIDE}>Colour</TableHead>
          <TableHead>
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tenants.map((tenant) => (
          <TableRow key={tenant.id}>
            <TableCell className="whitespace-normal">
              <Link
                to={adminTenantPath(tenant.id)}
                className="font-medium hover:underline"
              >
                {tenant.name}
              </Link>
            </TableCell>
            <TableCell>
              {/* The slug is the portal's address. */}
              <Link
                to={portalPath(tenant.slug)}
                className="text-primary hover:underline"
              >
                {tenant.slug}
              </Link>
            </TableCell>
            <TableCell className={WIDE}>
              {tenant.contactEmail ?? (
                <span className="text-muted-foreground">—</span>
              )}
            </TableCell>
            <TableCell className={WIDE}>
              <ColourCell colour={tenant.primaryColor} />
            </TableCell>
            <TableCell className="w-0 text-right">
              <DeleteTenantDialog tenant={tenant} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
