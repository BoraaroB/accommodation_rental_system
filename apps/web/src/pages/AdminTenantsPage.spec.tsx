import type { AdminTenant } from '@ars/shared';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  apiErrorBody,
  jsonResponse,
  stubApi,
  type StubRoutes,
} from '../test/apiStub';
import { anAdminTenant, aUser } from '../test/fixtures';
import { renderRoute } from '../test/renderRoute';

const adriatic = anAdminTenant();
const alpine = anAdminTenant({
  id: '9e8d7c6b-5a4f-4e3d-8c2b-1a0f9e8d7c6b',
  slug: 'alpine',
  name: 'Alpine Lodges',
  primaryColor: null,
  contactEmail: null,
});
const TENANT = `/admin/tenants/${adriatic.id}`;

/** A superadmin with `tenants` on the platform; a deletion removes one. */
function stubTenants(tenants: AdminTenant[], routes: StubRoutes = {}) {
  let current = tenants;
  return stubApi({
    'GET /auth/me': aUser({ isSuperadmin: true }),
    'GET /admin/tenants': () => current,
    [`DELETE ${TENANT}`]: () => {
      current = current.filter((tenant) => tenant.id !== adriatic.id);
      return new Response(null, { status: 204 });
    },
    ...routes,
  });
}

async function openDeleteDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    await screen.findByRole('button', { name: 'Delete Adriatic Stays' }),
  );
  return screen.findByRole('alertdialog', { name: 'Delete Adriatic Stays?' });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AdminTenantsPage', () => {
  it('lists the tenants with links to their page and portal', async () => {
    stubTenants([adriatic, alpine]);
    renderRoute('/admin/tenants', { signedIn: true });

    expect(
      await screen.findByRole('link', { name: 'Adriatic Stays' }),
    ).toHaveAttribute('href', TENANT);
    expect(screen.getByRole('link', { name: 'adriatic' })).toHaveAttribute(
      'href',
      '/adriatic',
    );
    expect(screen.getByText('hello@adriatic.example')).toBeInTheDocument();
    expect(screen.getByText('#0e7490')).toBeInTheDocument();
    // A tenant without a colour uses the default one.
    expect(screen.getByText('Default')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('2 tenants');
    expect(screen.getByRole('link', { name: 'New tenant' })).toHaveAttribute(
      'href',
      '/admin/tenants/new',
    );
  });

  it('offers the first tenant when there is none', async () => {
    stubTenants([]);
    renderRoute('/admin/tenants', { signedIn: true });

    expect(await screen.findByText('No tenants yet')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'New tenant' })).toHaveLength(2);
  });

  it('deletes a tenant once its slug is typed', async () => {
    const user = userEvent.setup();
    const success = vi.spyOn(toast, 'success').mockImplementation(() => 1);
    const api = stubTenants([adriatic, alpine]);
    renderRoute('/admin/tenants', { signedIn: true });

    const dialog = await openDeleteDialog(user);
    expect(dialog).toHaveTextContent(
      'The portal /adriatic and all its listings, bookings, blocked days and host memberships are deleted. User accounts stay.',
    );
    const confirm = within(dialog).getByRole('button', {
      name: 'Delete tenant',
    });
    expect(confirm).toBeDisabled();
    await user.type(
      within(dialog).getByLabelText('Type adriatic to confirm'),
      'adriati',
    );
    expect(confirm).toBeDisabled();
    await user.type(
      within(dialog).getByLabelText('Type adriatic to confirm'),
      'c',
    );
    await user.click(confirm);

    await vi.waitFor(() =>
      expect(success).toHaveBeenCalledWith('Adriatic Stays deleted'),
    );
    expect(api.requestCount(TENANT)).toBe(1);
    // The list is loaded again without the tenant (cache tags).
    await vi.waitFor(() =>
      expect(
        screen.queryByRole('link', { name: 'Adriatic Stays' }),
      ).not.toBeInTheDocument(),
    );
    expect(api.requestCount('/admin/tenants')).toBe(2);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Alpine Lodges' })).toBeVisible();
  });

  it('sends nothing when the dialog is cancelled', async () => {
    const user = userEvent.setup();
    const api = stubTenants([adriatic]);
    renderRoute('/admin/tenants', { signedIn: true });

    const dialog = await openDeleteDialog(user);
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    await vi.waitFor(() =>
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument(),
    );
    expect(api.requestCount(TENANT)).toBe(0);
    expect(screen.getByRole('link', { name: 'Adriatic Stays' })).toBeVisible();
  });

  it('keeps the dialog open when the deletion fails', async () => {
    const user = userEvent.setup();
    const error = vi.spyOn(toast, 'error').mockImplementation(() => 1);
    const api = stubTenants([adriatic], {
      [`DELETE ${TENANT}`]: () =>
        jsonResponse(500, apiErrorBody(500, 'INTERNAL', 'Internal error')),
    });
    renderRoute('/admin/tenants', { signedIn: true });

    const dialog = await openDeleteDialog(user);
    await user.type(
      within(dialog).getByLabelText('Type adriatic to confirm'),
      'adriatic',
    );
    await user.click(
      within(dialog).getByRole('button', { name: 'Delete tenant' }),
    );

    // The error middleware's toast says what failed; the admin can try again.
    await vi.waitFor(() => expect(error).toHaveBeenCalled());
    await vi.waitFor(() =>
      expect(
        within(dialog).getByRole('button', { name: 'Delete tenant' }),
      ).toBeEnabled(),
    );
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(api.requestCount('/admin/tenants')).toBe(1);
  });

  it('closes the dialog when the tenant was already deleted', async () => {
    const user = userEvent.setup();
    const info = vi.spyOn(toast, 'info').mockImplementation(() => 1);
    // Deleted meanwhile, e.g. in another tab: the list still shows it.
    let listed = [adriatic, alpine];
    stubTenants([], {
      'GET /admin/tenants': () => listed,
      [`DELETE ${TENANT}`]: () => {
        listed = [alpine];
        return jsonResponse(
          404,
          apiErrorBody(404, 'TENANT_NOT_FOUND', 'Tenant not found'),
        );
      },
    });
    renderRoute('/admin/tenants', { signedIn: true });

    const dialog = await openDeleteDialog(user);
    await user.type(
      within(dialog).getByLabelText('Type adriatic to confirm'),
      'adriatic',
    );
    await user.click(
      within(dialog).getByRole('button', { name: 'Delete tenant' }),
    );

    await vi.waitFor(() =>
      expect(info).toHaveBeenCalledWith('Adriatic Stays was already deleted'),
    );
    // The list is loaded again without the tenant (cache tags).
    await vi.waitFor(() =>
      expect(
        screen.queryByRole('link', { name: 'Adriatic Stays' }),
      ).not.toBeInTheDocument(),
    );
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});
