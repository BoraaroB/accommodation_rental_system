import type { UserProfile } from '@ars/shared';
import { ArrowRightIcon } from 'lucide-react';
import { Link } from 'react-router';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import { hostPanelPath } from '../redirects';

/** After sign-in, a host of several portals chooses the host panel to open. */
export function HostPanelPicker({ user }: { user: UserProfile }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1>Choose a host panel</h1>
        </CardTitle>
        <CardDescription>You host more than one portal.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-2">
          {user.hostOf.map((tenant) => (
            <li key={tenant.slug}>
              <Link
                to={hostPanelPath(tenant.slug)}
                className="flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm font-medium ring-1 ring-foreground/10 hover:bg-muted"
              >
                {tenant.name}
                <ArrowRightIcon
                  aria-hidden="true"
                  className="size-4 text-muted-foreground"
                />
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Link
          to="/"
          className="text-sm font-medium text-primary hover:underline"
        >
          Browse portals
        </Link>
      </CardFooter>
    </Card>
  );
}
