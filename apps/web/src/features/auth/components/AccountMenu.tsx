import {
  ChevronDownIcon,
  CircleUserIcon,
  LayoutDashboardIcon,
  LogInIcon,
  LogOutIcon,
  ShieldIcon,
} from 'lucide-react';
import {
  Link,
  matchPath,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router';
import { buttonVariants } from '../../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';
import { signedOut } from '../../../store/authSlice';
import { useAppDispatch } from '../../../store/hooks';
import { canUseAdminPanel } from '../access';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { hostPanelPath, signInPath } from '../redirects';

const AUTH_PAGES = ['/login', '/register'];

export interface AccountMenuProps {
  /** In the portal header, on the tenant's colour. */
  onBrand?: boolean;
}

/**
 * The account corner of every header. Signed out: "Sign in", returning to
 * this page (from the landing page, the user goes to their panel instead).
 * Signed in: the user's panels and "Sign out".
 */
export function AccountMenu({ onBrand = false }: AccountMenuProps) {
  const location = useLocation();
  const { tenantSlug } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isSignedIn, user } = useCurrentUser();

  if (!isSignedIn) {
    if (AUTH_PAGES.some((path) => matchPath(path, location.pathname))) {
      return null;
    }
    const here = location.pathname + location.search;
    return (
      <Link
        to={signInPath(here === '/' ? undefined : here)}
        className={buttonVariants({
          variant: onBrand ? 'onPrimary' : 'outline',
        })}
      >
        <LogInIcon aria-hidden="true" />
        Sign in
      </Link>
    );
  }

  async function signOut() {
    // Leave first: a protected page sends a signed-out user to sign in. The
    // router renders a navigation as a transition, after the store's update;
    // `flushSync` renders the new page before the token is dropped.
    await navigate(tenantSlug === undefined ? '/' : `/${tenantSlug}`, {
      flushSync: true,
    });
    dispatch(signedOut());
  }

  const panels = user
    ? [
        ...(canUseAdminPanel(user)
          ? [{ to: '/admin', label: 'Admin panel', Icon: ShieldIcon }]
          : []),
        ...user.hostOf.map((tenant) => ({
          to: hostPanelPath(tenant.slug),
          label: `Host panel · ${tenant.name}`,
          Icon: LayoutDashboardIcon,
        })),
      ]
    : [];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={buttonVariants({ variant: onBrand ? 'onPrimary' : 'ghost' })}
      >
        <CircleUserIcon aria-hidden="true" />
        <span className="sr-only sm:not-sr-only sm:max-w-40 sm:truncate">
          {user?.name ?? 'Account'}
        </span>
        <ChevronDownIcon aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {user && (
          <DropdownMenuGroup>
            <DropdownMenuLabel className="flex flex-col">
              <span className="truncate text-sm text-foreground">
                {user.name}
              </span>
              <span className="truncate font-normal">{user.email}</span>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
        )}
        {panels.length > 0 && (
          <>
            <DropdownMenuSeparator />
            {panels.map(({ to, label, Icon }) => (
              <DropdownMenuLinkItem key={to} render={<Link to={to} />}>
                <Icon aria-hidden="true" />
                <span className="truncate">{label}</span>
              </DropdownMenuLinkItem>
            ))}
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void signOut()}>
          <LogOutIcon aria-hidden="true" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
