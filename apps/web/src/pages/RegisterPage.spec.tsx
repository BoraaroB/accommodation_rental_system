import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RouteObject } from 'react-router';
import { toast } from 'sonner';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiErrorBody, jsonResponse, stubApi } from '../test/apiStub';
import { aUser } from '../test/fixtures';
import { renderRoute } from '../test/renderRoute';
import { RegisterPage } from './RegisterPage';

const routes: RouteObject[] = [
  { path: '/register', Component: RegisterPage },
  { path: '*', element: <p>Elsewhere</p> },
];

async function register(password = 'correct-horse') {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Name'), 'Ana Client');
  await user.type(screen.getByLabelText('E-mail'), 'ana@example.com');
  await user.type(screen.getByLabelText('Password'), password);
  await user.click(screen.getByRole('button', { name: 'Create account' }));
}

describe('RegisterPage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('explains the password rule and sends nothing', async () => {
    const api = stubApi({});
    renderRoute('/register', { routes });
    await register('short');

    expect(
      await screen.findByText('Use at least 8 characters'),
    ).toBeInTheDocument();
    expect(api.requestCount('/auth/register')).toBe(0);
  });

  it('shows a taken e-mail on its field', async () => {
    const api = stubApi({
      'POST /auth/register': jsonResponse(
        409,
        apiErrorBody(
          409,
          'EMAIL_TAKEN',
          'An account with this e-mail already exists',
        ),
      ),
    });
    renderRoute('/register', { routes });
    await register();

    await screen.findByText('An account with this e-mail already exists');
    expect(screen.getByLabelText('E-mail')).toHaveAccessibleDescription(
      'An account with this e-mail already exists',
    );
    // On the field only, not repeated above the form.
    expect(
      screen.getAllByText('An account with this e-mail already exists'),
    ).toHaveLength(1);
    expect(api.requestCount('/auth/login')).toBe(0);
  });

  it('creates the account, signs in and returns to the page in `redirect`', async () => {
    const api = stubApi({
      'POST /auth/register': aUser(),
      'POST /auth/login': { accessToken: 'new-token' },
      'GET /auth/me': aUser(),
    });
    const { store, router } = renderRoute('/register?redirect=%2Fadriatic', {
      routes,
    });
    await register();

    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/adriatic'),
    );
    expect(store.getState().auth.token).toBe('new-token');
    expect(api.requestCount('/auth/login')).toBe(1);
  });

  it('offers sign-in when the account was created but signing in failed', async () => {
    vi.spyOn(toast, 'error').mockImplementation(() => 1);
    stubApi({
      'POST /auth/register': aUser(),
      'POST /auth/login': jsonResponse(
        503,
        apiErrorBody(503, 'SERVICE_UNAVAILABLE', 'Service unavailable'),
      ),
    });
    renderRoute('/register?redirect=%2Fadriatic', { routes });
    await register();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Your account was created, but signing in failed.',
    );
    expect(screen.getAllByRole('link', { name: 'Sign in' })[0]).toHaveAttribute(
      'href',
      '/login?redirect=%2Fadriatic',
    );
  });

  it('keeps the redirect on the way to sign-in', () => {
    renderRoute('/register?redirect=%2Fadriatic', { routes });
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      '/login?redirect=%2Fadriatic',
    );
  });
});
