import type { UserProfile } from '@ars/shared';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import type { RouteObject } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiErrorBody, jsonResponse, stubApi } from '../../../test/apiStub';
import { aUser } from '../../../test/fixtures';
import { renderRoute } from '../../../test/renderRoute';
import { RequireHost, RequireSuperadmin } from './RequireRole';

const routes: RouteObject[] = [
  { path: '/login', element: <p>Sign-in page</p> },
  {
    Component: RequireSuperadmin,
    children: [{ path: '/admin', element: <p>Admin panel</p> }],
  },
  {
    path: '/:tenantSlug',
    children: [
      {
        Component: RequireHost,
        children: [{ path: 'host', element: <p>Host panel</p> }],
      },
    ],
  },
];

const adriatic = { slug: 'adriatic', name: 'Adriatic Stays' };
const alpine = { slug: 'alpine', name: 'Alpine Chalets' };

function renderSignedIn(path: string, me: UserProfile) {
  stubApi({ 'GET /auth/me': me });
  return renderRoute(path, { routes, signedIn: true });
}

describe('RequireRole', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(['/adriatic/host?tab=bookings', '/admin'])(
    'sends a signed-out user from %s to sign in and back',
    async (path) => {
      const { router } = renderRoute(path, { routes });

      expect(await screen.findByText('Sign-in page')).toBeInTheDocument();
      expect(router.state.location.pathname).toBe('/login');
      expect(
        new URLSearchParams(router.state.location.search).get('redirect'),
      ).toBe(path);
    },
  );

  it.each([
    [
      'the host of the portal',
      '/adriatic/host',
      aUser({ hostOf: [adriatic] }),
      'Host panel',
    ],
    [
      'a superadmin',
      '/adriatic/host',
      aUser({ isSuperadmin: true }),
      'Host panel',
    ],
    ['a superadmin', '/admin', aUser({ isSuperadmin: true }), 'Admin panel'],
  ])('lets %s open %s', async (_case, path, me, page) => {
    renderSignedIn(path, me);
    expect(await screen.findByText(page)).toBeInTheDocument();
  });

  it.each([
    ['a client', '/adriatic/host', aUser()],
    ["another portal's host", '/adriatic/host', aUser({ hostOf: [alpine] })],
    ['a client', '/admin', aUser()],
    ['a host', '/admin', aUser({ hostOf: [adriatic] })],
  ])('shows %s the 403 page on %s', async (_case, path, me) => {
    renderSignedIn(path, me);

    expect(
      await screen.findByRole('heading', {
        name: "You don't have access to this page",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(me.email)).toBeInTheDocument();
    expect(screen.queryByText(/panel$/)).not.toBeInTheDocument();
  });

  it('signs out from the 403 page to sign in with another account', async () => {
    const { router, store } = renderSignedIn('/admin', aUser());
    await userEvent.setup().click(
      await screen.findByRole('button', {
        name: 'Sign in with another account',
      }),
    );

    expect(await screen.findByText('Sign-in page')).toBeInTheDocument();
    expect(store.getState().auth.token).toBeNull();
    expect(
      new URLSearchParams(router.state.location.search).get('redirect'),
    ).toBe('/admin');
  });

  it('shows the error with Retry when the user cannot be loaded, without sending them away', async () => {
    vi.spyOn(toast, 'error').mockImplementation(() => 1);
    stubApi({
      'GET /auth/me': jsonResponse(
        500,
        apiErrorBody(500, 'INTERNAL_ERROR', 'Internal server error'),
      ),
    });
    const { router, store } = renderRoute('/admin', {
      routes,
      signedIn: true,
    });

    expect(
      await screen.findByRole('button', { name: 'Retry' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/admin');
    expect(store.getState().auth.token).not.toBeNull();
    expect(screen.queryByText('Admin panel')).not.toBeInTheDocument();
  });

  it('sends the user to sign in again when the token has expired', async () => {
    vi.spyOn(toast, 'info').mockImplementation(() => 1);
    stubApi({
      'GET /auth/me': jsonResponse(
        401,
        apiErrorBody(401, 'INVALID_TOKEN', 'The access token is invalid'),
      ),
    });
    const { router, store } = renderRoute('/adriatic/host', {
      routes,
      signedIn: true,
    });

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(store.getState().auth.token).toBeNull();
    expect(
      new URLSearchParams(router.state.location.search).get('redirect'),
    ).toBe('/adriatic/host');
  });
});
