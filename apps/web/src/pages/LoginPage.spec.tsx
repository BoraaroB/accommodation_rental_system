import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RouteObject } from 'react-router';
import { describe, expect, it } from 'vitest';
import { apiErrorBody, jsonResponse, stubApi } from '../test/apiStub';
import { TOKEN_KEY } from '../lib/tokenStorage';
import { aUser } from '../test/fixtures';
import { renderRoute } from '../test/renderRoute';
import { LoginPage } from './LoginPage';

const routes: RouteObject[] = [
  { path: '/login', Component: LoginPage },
  { path: '*', element: <p>Elsewhere</p> },
];

const adriatic = { slug: 'adriatic', name: 'Adriatic Stays' };
const alpine = { slug: 'alpine', name: 'Alpine Chalets' };

async function signIn(email = 'Ana@Example.com', password = 'correct-horse') {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('E-mail'), email);
  await user.type(screen.getByLabelText('Password'), password);
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
}

/** Answers sign-in with a token and `/auth/me` with `me`; records the sign-in bodies. */
function stubSignIn(me = aUser()) {
  const bodies: Promise<unknown>[] = [];
  const api = stubApi({
    'POST /auth/login': (_url: URL, request: Request) => {
      bodies.push(request.clone().json());
      return { accessToken: 'new-token' };
    },
    'GET /auth/me': me,
  });
  return { api, bodies };
}

describe('LoginPage', () => {
  it('sends nothing while the form is invalid', async () => {
    const api = stubApi({});
    renderRoute('/login', { routes });
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Sign in' }));

    expect(
      await screen.findByText('Enter a valid e-mail address'),
    ).toBeInTheDocument();
    expect(screen.getByText('Enter your password')).toBeInTheDocument();
    expect(api.requestCount('/auth/login')).toBe(0);
  });

  it('shows why the sign-in failed and stays signed out', async () => {
    stubApi({
      'POST /auth/login': jsonResponse(
        401,
        apiErrorBody(401, 'INVALID_CREDENTIALS', 'Invalid e-mail or password'),
      ),
    });
    const { store, router } = renderRoute('/login', { routes });
    await signIn();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Invalid e-mail or password',
    );
    expect(store.getState().auth.token).toBeNull();
    expect(router.state.location.pathname).toBe('/login');
  });

  it('signs in, keeps the token and returns to the page in `redirect`', async () => {
    const { bodies } = stubSignIn();
    const { store, router } = renderRoute(
      '/login?redirect=%2Fadriatic%3Fcity%3DSplit',
      { routes },
    );
    await signIn();

    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/adriatic'),
    );
    expect(router.state.location.search).toBe('?city=Split');
    expect(store.getState().auth.token).toBe('new-token');
    expect(localStorage.getItem(TOKEN_KEY)).toBe('new-token');
    // The shared schema lowercases the e-mail before it is sent.
    expect(await Promise.all(bodies)).toEqual([
      { email: 'ana@example.com', password: 'correct-horse' },
    ]);
  });

  it('ignores a redirect that would leave the app', async () => {
    stubSignIn();
    const { router } = renderRoute('/login?redirect=%2F%2Fevil.example', {
      routes,
    });
    await signIn();

    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
  });

  it.each([
    [
      'a superadmin to the admin panel',
      aUser({ isSuperadmin: true }),
      '/admin',
    ],
    [
      'the host of one portal to its host panel',
      aUser({ hostOf: [adriatic] }),
      '/adriatic/host',
    ],
    ['a client to the portals', aUser(), '/'],
  ])('sends %s', async (_case, me, destination) => {
    stubSignIn(me);
    const { router } = renderRoute('/login', { routes });
    await signIn();

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(destination),
    );
  });

  it('lets the host of several portals choose a host panel', async () => {
    stubSignIn(aUser({ hostOf: [adriatic, alpine] }));
    renderRoute('/login', { routes });
    await signIn();

    const picker = await screen.findByRole('list');
    expect(
      within(picker).getByRole('link', { name: 'Adriatic Stays' }),
    ).toHaveAttribute('href', '/adriatic/host');
    expect(
      within(picker).getByRole('link', { name: 'Alpine Chalets' }),
    ).toHaveAttribute('href', '/alpine/host');
    expect(
      screen.getByRole('heading', { name: 'Choose a host panel' }),
    ).toBeInTheDocument();
  });

  it('sends a user who is already signed in on', async () => {
    stubApi({ 'GET /auth/me': aUser() });
    const { router } = renderRoute('/login?redirect=%2Fadriatic', {
      routes,
      signedIn: true,
    });

    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/adriatic'),
    );
  });

  it('keeps the redirect on the way to registration', () => {
    renderRoute('/login?redirect=%2Fadriatic', { routes });
    expect(
      screen.getByRole('link', { name: 'Create an account' }),
    ).toHaveAttribute('href', '/register?redirect=%2Fadriatic');
  });
});
