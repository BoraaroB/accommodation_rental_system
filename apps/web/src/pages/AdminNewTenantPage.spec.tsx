import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  apiErrorBody,
  jsonResponse,
  stubApi,
  type StubRoutes,
} from '../test/apiStub';
import { aHost, anAdminTenant, aUser } from '../test/fixtures';
import { renderRoute } from '../test/renderRoute';

const created = anAdminTenant({
  id: '2d3e4f5a-6b7c-4d8e-9f0a-1b2c3d4e5f6a',
  slug: 'lakeside',
  name: 'Lakeside Cabins',
  primaryColor: null,
  contactEmail: null,
});

function stubNewTenant(routes: StubRoutes = {}) {
  return stubApi({
    'GET /auth/me': aUser({ isSuperadmin: true }),
    ...routes,
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AdminNewTenantPage', () => {
  it('creates a tenant and opens its page for the hosts', async () => {
    const user = userEvent.setup();
    const success = vi.spyOn(toast, 'success').mockImplementation(() => 1);
    let body: unknown;
    stubNewTenant({
      'POST /admin/tenants': async (_url: URL, request: Request) => {
        body = await request.json();
        return created;
      },
      [`GET /admin/tenants/${created.id}`]: created,
      [`GET /admin/tenants/${created.id}/hosts`]: [aHost()],
    });
    const { router } = renderRoute('/admin/tenants/new', { signedIn: true });

    await user.type(await screen.findByLabelText('Name'), 'Lakeside Cabins');
    await user.type(screen.getByLabelText('Slug'), 'lakeside');
    await user.click(screen.getByRole('button', { name: 'Create tenant' }));

    // Optional fields left empty are sent as not set.
    await vi.waitFor(() =>
      expect(body).toEqual({
        name: 'Lakeside Cabins',
        slug: 'lakeside',
        logoUrl: null,
        primaryColor: null,
        contactEmail: null,
      }),
    );
    expect(
      await screen.findByRole('heading', { name: 'Hosts' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(`/admin/tenants/${created.id}`);
    expect(success).toHaveBeenCalledWith('Lakeside Cabins created', {
      description: 'Its portal is live at /lakeside. Add its hosts below.',
    });
  });

  it('sends nothing without a name or with a reserved slug', async () => {
    const user = userEvent.setup();
    const api = stubNewTenant();
    renderRoute('/admin/tenants/new', { signedIn: true });

    await user.type(await screen.findByLabelText('Slug'), 'login');
    await user.click(screen.getByRole('button', { name: 'Create tenant' }));

    expect(await screen.findByText('Enter a name')).toBeInTheDocument();
    expect(
      screen.getByText('This slug is reserved for the app’s own pages'),
    ).toBeInTheDocument();
    expect(api.requestCount('/admin/tenants')).toBe(0);
  });

  it('asks for a kebab-case slug', async () => {
    const user = userEvent.setup();
    const api = stubNewTenant();
    renderRoute('/admin/tenants/new', { signedIn: true });

    await user.type(await screen.findByLabelText('Name'), 'Lakeside Cabins');
    await user.type(screen.getByLabelText('Slug'), 'Lakeside Cabins');
    await user.click(screen.getByRole('button', { name: 'Create tenant' }));

    expect(
      await screen.findByText(
        'Use lowercase letters, digits and single hyphens, e.g. adriatic-stays',
      ),
    ).toBeInTheDocument();
    expect(api.requestCount('/admin/tenants')).toBe(0);
  });

  it('shows a taken slug on its field and stays on the form', async () => {
    const user = userEvent.setup();
    stubNewTenant({
      'POST /admin/tenants': jsonResponse(
        409,
        apiErrorBody(
          409,
          'SLUG_TAKEN',
          'Another tenant already uses this slug',
        ),
      ),
    });
    const { router } = renderRoute('/admin/tenants/new', { signedIn: true });

    await user.type(await screen.findByLabelText('Name'), 'Adriatic Again');
    await user.type(screen.getByLabelText('Slug'), 'adriatic');
    await user.click(screen.getByRole('button', { name: 'Create tenant' }));

    expect(
      await screen.findByText('Another tenant already uses this slug'),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/admin/tenants/new');
  });
});
