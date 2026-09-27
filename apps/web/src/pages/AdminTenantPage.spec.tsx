import type { AddedHost, TenantHost } from '@ars/shared';
import { fireEvent, screen, within } from '@testing-library/react';
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

const tenant = anAdminTenant();
const PAGE = `/admin/tenants/${tenant.id}`;
const TENANT = `/admin/tenants/${tenant.id}`;
const HOSTS = `${TENANT}/hosts`;
const host = aHost();

/** A superadmin on Adriatic's page; `hosts` answers the hosts list. */
function stubTenant(
  routes: StubRoutes = {},
  hosts: () => TenantHost[] = () => [host],
) {
  return stubApi({
    'GET /auth/me': aUser({ isSuperadmin: true }),
    [`GET ${TENANT}`]: tenant,
    [`GET ${HOSTS}`]: hosts,
    ...routes,
  });
}

/** Records the JSON body of each request to a route and answers `answer(body)`. */
function recording(answer: (body: Record<string, unknown>) => unknown) {
  const bodies: Record<string, unknown>[] = [];
  const handler = async (_url: URL, request: Request) => {
    const body = (await request.json()) as Record<string, unknown>;
    bodies.push(body);
    return answer(body);
  };
  return { bodies, handler };
}

/** The configuration form; both sections have a "Name". */
const configuration = async () =>
  within(await screen.findByRole('region', { name: 'Configuration' }));

/** The hosts list and the add form. */
const hostsSection = async () =>
  within(await screen.findByRole('region', { name: 'Hosts' }));

/** Fills the add form of the hosts section and submits it. */
async function addHost(
  user: ReturnType<typeof userEvent.setup>,
  { email, name, password }: { email: string; name: string; password: string },
) {
  const section = await hostsSection();
  await user.type(section.getByLabelText('E-mail'), email);
  if (name !== '') {
    await user.type(section.getByLabelText('Name'), name);
  }
  await user.type(section.getByLabelText('Password'), password);
  await user.click(section.getByRole('button', { name: 'Add host' }));
  return section;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AdminTenantPage — configuration', () => {
  it("shows the tenant's configuration and its portal", async () => {
    stubTenant();
    renderRoute(PAGE, { signedIn: true });

    expect(
      await screen.findByRole('heading', { name: 'Adriatic Stays' }),
    ).toBeInTheDocument();
    const form = await configuration();
    expect(form.getByLabelText('Name')).toHaveValue('Adriatic Stays');
    expect(form.getByLabelText('Slug')).toHaveValue('adriatic');
    expect(form.getByLabelText('Logo URL')).toHaveValue('');
    expect(form.getByLabelText('Primary colour')).toHaveValue('#0e7490');
    expect(form.getByLabelText('Pick the primary colour')).toHaveValue(
      '#0e7490',
    );
    expect(form.getByLabelText('Contact e-mail')).toHaveValue(
      'hello@adriatic.example',
    );
    expect(form.getByRole('button', { name: 'Save changes' })).toBeDisabled();
    expect(
      screen.getByRole('link', { name: 'View the portal' }),
    ).toHaveAttribute('href', '/adriatic');
    expect(screen.getByRole('link', { name: 'All tenants' })).toHaveAttribute(
      'href',
      '/admin/tenants',
    );
  });

  it('saves only the changed fields, a cleared one as null', async () => {
    const user = userEvent.setup();
    const success = vi.spyOn(toast, 'success').mockImplementation(() => 1);
    const patch = recording((changes) => ({ ...tenant, ...changes }));
    const api = stubTenant({ [`PATCH ${TENANT}`]: patch.handler });
    renderRoute(PAGE, { signedIn: true });

    const form = await configuration();
    await user.clear(form.getByLabelText('Name'));
    await user.type(form.getByLabelText('Name'), '  Adriatic Villas ');
    await user.clear(form.getByLabelText('Contact e-mail'));
    await user.click(form.getByRole('button', { name: 'Save changes' }));

    await vi.waitFor(() =>
      expect(success).toHaveBeenCalledWith('Tenant saved'),
    );
    expect(patch.bodies).toEqual([
      { name: 'Adriatic Villas', contactEmail: null },
    ]);
    // Loaded, saved, then loaded again (cache tags); the form is clean.
    await vi.waitFor(() => expect(api.requestCount(TENANT)).toBe(3));
    expect(form.getByRole('button', { name: 'Save changes' })).toBeDisabled();
    expect(form.getByLabelText('Name')).toHaveValue('Adriatic Villas');
    expect(form.getByLabelText('Contact e-mail')).toHaveValue('');
  });

  it('takes the colour from the picker', async () => {
    const user = userEvent.setup();
    vi.spyOn(toast, 'success').mockImplementation(() => 1);
    const patch = recording((changes) => ({ ...tenant, ...changes }));
    stubTenant({ [`PATCH ${TENANT}`]: patch.handler });
    renderRoute(PAGE, { signedIn: true });

    const form = await configuration();
    // A colour input cannot be typed into; its input event carries the value.
    fireEvent.input(form.getByLabelText('Pick the primary colour'), {
      target: { value: '#be123c' },
    });

    expect(form.getByLabelText('Primary colour')).toHaveValue('#be123c');
    await user.click(form.getByRole('button', { name: 'Save changes' }));
    await vi.waitFor(() =>
      expect(patch.bodies).toEqual([{ primaryColor: '#be123c' }]),
    );
  });

  it('warns that a new slug moves the portal', async () => {
    const user = userEvent.setup();
    stubTenant();
    renderRoute(PAGE, { signedIn: true });

    const form = await configuration();
    await user.type(form.getByLabelText('Slug'), '-stays');

    expect(form.getByLabelText('Slug')).toHaveAccessibleDescription(
      'The portal moves here; its old address /adriatic stops working',
    );
  });

  it('sends nothing while a field breaks its rule', async () => {
    const user = userEvent.setup();
    const api = stubTenant();
    renderRoute(PAGE, { signedIn: true });

    const form = await configuration();
    await user.clear(form.getByLabelText('Slug'));
    await user.type(form.getByLabelText('Slug'), 'admin');
    await user.clear(form.getByLabelText('Primary colour'));
    await user.type(form.getByLabelText('Primary colour'), 'teal');
    await user.type(form.getByLabelText('Logo URL'), 'javascript:alert(1)');
    await user.click(form.getByRole('button', { name: 'Save changes' }));

    expect(
      await form.findByText('This slug is reserved for the app’s own pages'),
    ).toBeInTheDocument();
    expect(
      form.getByText('Enter a colour as #rrggbb, e.g. #0e7490'),
    ).toBeInTheDocument();
    expect(
      form.getByText(
        'Enter an http(s) address, e.g. https://example.com/logo.png',
      ),
    ).toBeInTheDocument();
    expect(api.requestCount(TENANT)).toBe(1);
  });

  // `UNIQUE_VIOLATION`: two requests raced for the slug.
  it.each(['SLUG_TAKEN', 'UNIQUE_VIOLATION'])(
    'shows a taken slug (%s) on its field',
    async (code) => {
      const user = userEvent.setup();
      stubTenant({
        [`PATCH ${TENANT}`]: jsonResponse(
          409,
          apiErrorBody(409, code, 'A record with this value already exists'),
        ),
      });
      renderRoute(PAGE, { signedIn: true });

      const form = await configuration();
      await user.clear(form.getByLabelText('Slug'));
      await user.type(form.getByLabelText('Slug'), 'alpine');
      await user.click(form.getByRole('button', { name: 'Save changes' }));

      await vi.waitFor(() =>
        expect(form.getByLabelText('Slug')).toHaveAccessibleDescription(
          'Another tenant already uses this slug',
        ),
      );
      // On the field only, not repeated above the form.
      expect(form.getAllByRole('alert')).toHaveLength(1);
    },
  );

  it('discards the changes and the error of a failed save', async () => {
    const user = userEvent.setup();
    stubTenant({
      [`PATCH ${TENANT}`]: jsonResponse(
        404,
        apiErrorBody(404, 'TENANT_NOT_FOUND', 'Tenant not found'),
      ),
    });
    renderRoute(PAGE, { signedIn: true });

    const form = await configuration();
    await user.clear(form.getByLabelText('Name'));
    await user.type(form.getByLabelText('Name'), 'Adriatic Villas');
    await user.click(form.getByRole('button', { name: 'Save changes' }));
    expect(await form.findByRole('alert')).toHaveTextContent(
      'Tenant not found',
    );
    await user.click(form.getByRole('button', { name: 'Discard changes' }));

    expect(form.getByLabelText('Name')).toHaveValue('Adriatic Stays');
    expect(form.queryByRole('alert')).not.toBeInTheDocument();
    expect(form.getByRole('button', { name: 'Save changes' })).toBeDisabled();
  });

  it.each([
    ['a value that is not an id', '/admin/tenants/not-a-uuid'],
    ['an id the API does not know', PAGE],
  ])('says the tenant is not found for %s', async (_case, path) => {
    stubTenant({
      [`GET ${TENANT}`]: jsonResponse(
        404,
        apiErrorBody(404, 'TENANT_NOT_FOUND', 'Tenant not found'),
      ),
    });
    renderRoute(path, { signedIn: true });

    expect(await screen.findByText('Tenant not found')).toBeInTheDocument();
  });
});

describe('AdminTenantPage — hosts', () => {
  it('lists the hosts', async () => {
    stubTenant();
    renderRoute(PAGE, { signedIn: true });

    const list = await screen.findByRole('list', { name: 'Hosts' });
    expect(within(list).getByText('host1@adriatic.example')).toBeVisible();
    expect(within(list).getByText('Ivo Host')).toBeVisible();
  });

  it('says when the tenant has no hosts yet', async () => {
    stubTenant({}, () => []);
    renderRoute(PAGE, { signedIn: true });

    expect(await screen.findByText('No hosts yet')).toBeInTheDocument();
  });

  it('adds a host and lists it', async () => {
    const user = userEvent.setup();
    const success = vi.spyOn(toast, 'success').mockImplementation(() => 1);
    const newHost = aHost({
      id: '1b2c3d4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e',
      email: 'maja@adriatic.example',
      name: 'Maja Host',
    });
    let hosts = [host];
    const post = recording((): AddedHost => {
      hosts = [...hosts, newHost];
      return { ...newHost, accountCreated: true };
    });
    stubTenant({ [`POST ${HOSTS}`]: post.handler }, () => hosts);
    renderRoute(PAGE, { signedIn: true });

    const section = await addHost(user, {
      email: 'Maja@Adriatic.example',
      name: 'Maja Host',
      password: 'secret-pass',
    });

    await vi.waitFor(() =>
      expect(success).toHaveBeenCalledWith(
        'maja@adriatic.example added as a host',
      ),
    );
    expect(post.bodies).toEqual([
      {
        email: 'maja@adriatic.example',
        name: 'Maja Host',
        password: 'secret-pass',
      },
    ]);
    // The list is loaded again (cache tags) and the form is empty.
    expect(
      await section.findByText('maja@adriatic.example'),
    ).toBeInTheDocument();
    expect(section.getByLabelText('E-mail')).toHaveValue('');
    expect(section.queryByRole('status')).not.toBeInTheDocument();
  });

  it('says when an existing account became the host unchanged', async () => {
    const user = userEvent.setup();
    vi.spyOn(toast, 'success').mockImplementation(() => 1);
    stubTenant({
      [`POST ${HOSTS}`]: {
        ...aHost({ email: 'ana@example.com', name: 'Ana Client' }),
        accountCreated: false,
      },
    });
    renderRoute(PAGE, { signedIn: true });

    const section = await addHost(user, {
      email: 'ana@example.com',
      name: 'Someone Else',
      password: 'another-pass',
    });

    expect(await section.findByRole('status')).toHaveTextContent(
      'ana@example.com already had an account. It now hosts this tenant; its name and password were not changed.',
    );
  });

  it('shows an account that already hosts the tenant on the e-mail', async () => {
    const user = userEvent.setup();
    stubTenant({
      [`POST ${HOSTS}`]: jsonResponse(
        409,
        apiErrorBody(
          409,
          'ALREADY_HOST',
          'This account is already a host of the tenant',
        ),
      ),
    });
    renderRoute(PAGE, { signedIn: true });

    const section = await addHost(user, {
      email: 'host1@adriatic.example',
      name: 'Ivo Host',
      password: 'secret-pass',
    });

    await vi.waitFor(() =>
      expect(section.getByLabelText('E-mail')).toHaveAccessibleDescription(
        'This account already hosts this tenant',
      ),
    );
    // On the field only, not repeated above the form.
    expect(section.getAllByRole('alert')).toHaveLength(1);
  });

  it('sends no host while a field breaks its rule', async () => {
    const user = userEvent.setup();
    const api = stubTenant();
    renderRoute(PAGE, { signedIn: true });

    const section = await addHost(user, {
      email: 'not-an-email',
      name: '',
      password: 'short',
    });

    expect(
      await section.findByText('Enter a valid e-mail address'),
    ).toBeInTheDocument();
    expect(section.getByText('Enter a name')).toBeInTheDocument();
    expect(section.getByText('Use at least 8 characters')).toBeInTheDocument();
    expect(api.requestCount(HOSTS)).toBe(1);
  });

  it('removes a host after the confirmation', async () => {
    const user = userEvent.setup();
    const success = vi.spyOn(toast, 'success').mockImplementation(() => 1);
    let hosts = [host];
    const api = stubTenant(
      {
        [`DELETE ${HOSTS}/${host.id}`]: () => {
          hosts = [];
          return new Response(null, { status: 204 });
        },
      },
      () => hosts,
    );
    renderRoute(PAGE, { signedIn: true });

    await user.click(
      await screen.findByRole('button', {
        name: 'Remove host1@adriatic.example',
      }),
    );
    const dialog = await screen.findByRole('alertdialog', {
      name: 'Remove Ivo Host as a host?',
    });
    expect(dialog).toHaveTextContent(
      'host1@adriatic.example will no longer manage Adriatic Stays. The account stays',
    );
    await user.click(
      within(dialog).getByRole('button', { name: 'Remove host' }),
    );

    await vi.waitFor(() =>
      expect(success).toHaveBeenCalledWith(
        'host1@adriatic.example is no longer a host',
      ),
    );
    expect(api.requestCount(`${HOSTS}/${host.id}`)).toBe(1);
    expect(await screen.findByText('No hosts yet')).toBeInTheDocument();
  });

  it('closes the confirmation when the host was already removed', async () => {
    const user = userEvent.setup();
    const info = vi.spyOn(toast, 'info').mockImplementation(() => 1);
    // Removed meanwhile, e.g. in another tab: the list still shows the host.
    let hosts = [host];
    stubTenant(
      {
        [`DELETE ${HOSTS}/${host.id}`]: () => {
          hosts = [];
          return jsonResponse(
            404,
            apiErrorBody(
              404,
              'HOST_NOT_FOUND',
              'This user is not a host of the tenant',
            ),
          );
        },
      },
      () => hosts,
    );
    renderRoute(PAGE, { signedIn: true });

    await user.click(
      await screen.findByRole('button', {
        name: 'Remove host1@adriatic.example',
      }),
    );
    const dialog = await screen.findByRole('alertdialog');
    await user.click(
      within(dialog).getByRole('button', { name: 'Remove host' }),
    );

    await vi.waitFor(() =>
      expect(info).toHaveBeenCalledWith(
        'host1@adriatic.example was already removed',
      ),
    );
    // The list is loaded again without the host (cache tags).
    expect(await screen.findByText('No hosts yet')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});
