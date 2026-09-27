import type { UserProfile } from '@ars/shared';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RouteObject } from 'react-router';
import { describe, expect, it } from 'vitest';
import { PortalLayout } from '../../../app/layouts/PortalLayout';
import { SiteLayout } from '../../../app/layouts/SiteLayout';
import { TOKEN_KEY } from '../../../lib/tokenStorage';
import { stubApi } from '../../../test/apiStub';
import { RequireHost } from './RequireRole';
import { aTenant, aUser } from '../../../test/fixtures';
import { renderRoute } from '../../../test/renderRoute';

// The menu in the headers it lives in: the platform's and a portal's.
const routes: RouteObject[] = [
  {
    path: '/',
    Component: SiteLayout,
    children: [
      { index: true, element: <p>Landing</p> },
      { path: 'login', element: <p>Sign-in page</p> },
    ],
  },
  {
    path: '/:tenantSlug',
    Component: PortalLayout,
    children: [
      { index: true, element: <p>Portal home</p> },
      { path: 'listings/:id', element: <p>Listing</p> },
      {
        Component: RequireHost,
        children: [{ path: 'host', element: <p>Host panel page</p> }],
      },
    ],
  },
];

const adriatic = { slug: 'adriatic', name: 'Adriatic Stays' };

function renderSignedIn(path: string, me: UserProfile) {
  stubApi({ 'GET /tenants/adriatic': aTenant(), 'GET /auth/me': me });
  return renderRoute(path, { routes, signedIn: true });
}

async function openMenu(name: string) {
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name }));
  return { user, menu: await screen.findByRole('menu') };
}

describe('AccountMenu', () => {
  it('offers sign-in that returns to the portal page', async () => {
    stubApi({ 'GET /tenants/adriatic': aTenant() });
    renderRoute('/adriatic?city=Split', { routes });

    expect(
      await screen.findByRole('link', { name: 'Sign in' }),
    ).toHaveAttribute('href', '/login?redirect=%2Fadriatic%3Fcity%3DSplit');
  });

  it('offers sign-in without a redirect on the landing page', () => {
    renderRoute('/', { routes });
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      '/login',
    );
  });

  it('hides sign-in on the sign-in page', () => {
    renderRoute('/login', { routes });
    expect(
      screen.queryByRole('link', { name: 'Sign in' }),
    ).not.toBeInTheDocument();
  });

  it('shows a host their name, and the host panel of the portal they host', async () => {
    renderSignedIn(
      '/adriatic',
      aUser({ name: 'Ana Host', hostOf: [adriatic] }),
    );

    expect(
      await screen.findByRole('link', { name: 'Host panel' }),
    ).toHaveAttribute('href', '/adriatic/host');
    const { menu } = await openMenu('Ana Host');
    expect(within(menu).getByText('ana@example.com')).toBeInTheDocument();
    expect(
      within(menu).getByRole('menuitem', {
        name: 'Host panel · Adriatic Stays',
      }),
    ).toHaveAttribute('href', '/adriatic/host');
    expect(
      within(menu).getByRole('menuitem', { name: 'Sign out' }),
    ).toBeInTheDocument();
  });

  it('shows no host panel to a client', async () => {
    renderSignedIn('/adriatic', aUser());

    const { menu } = await openMenu('Ana Client');
    expect(
      within(menu).queryByRole('menuitem', { name: /panel/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Host panel' }),
    ).not.toBeInTheDocument();
  });

  it('links a superadmin to the admin panel and to every host panel', async () => {
    renderSignedIn('/adriatic', aUser({ isSuperadmin: true }));

    expect(
      await screen.findByRole('link', { name: 'Host panel' }),
    ).toHaveAttribute('href', '/adriatic/host');
    const { menu } = await openMenu('Ana Client');
    expect(
      within(menu).getByRole('menuitem', { name: 'Admin panel' }),
    ).toHaveAttribute('href', '/admin');
  });

  it('signs out to the portal home, forgetting the token', async () => {
    const { router, store } = renderSignedIn('/adriatic/listings/abc', aUser());

    const { user, menu } = await openMenu('Ana Client');
    await user.click(within(menu).getByRole('menuitem', { name: 'Sign out' }));

    await waitFor(() => expect(store.getState().auth.token).toBeNull());
    expect(router.state.location.pathname).toBe('/adriatic');
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(
      await screen.findByRole('link', { name: 'Sign in' }),
    ).toBeInTheDocument();
    // The cleared cache is loaded again: the header is not left loading.
    expect(
      await screen.findByRole('link', { name: 'Adriatic Stays' }),
    ).toBeInTheDocument();
  });

  it('signs out of a protected page to the portal home, not to sign-in', async () => {
    const { router, store } = renderSignedIn(
      '/adriatic/host',
      aUser({ name: 'Ana Host', hostOf: [adriatic] }),
    );
    expect(await screen.findByText('Host panel page')).toBeInTheDocument();

    const { user, menu } = await openMenu('Ana Host');
    await user.click(within(menu).getByRole('menuitem', { name: 'Sign out' }));

    await waitFor(() => expect(store.getState().auth.token).toBeNull());
    expect(await screen.findByText('Portal home')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/adriatic');
  });

  it('signs out to the landing page outside a portal', async () => {
    stubApi({ 'GET /auth/me': aUser() });
    const { router, store } = renderRoute('/', { routes, signedIn: true });

    const { user, menu } = await openMenu('Ana Client');
    await user.click(within(menu).getByRole('menuitem', { name: 'Sign out' }));

    await waitFor(() => expect(store.getState().auth.token).toBeNull());
    expect(router.state.location.pathname).toBe('/');
  });
});
