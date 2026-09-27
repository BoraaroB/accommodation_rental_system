import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { apiErrorBody, jsonResponse, stubApi } from '../../test/apiStub';
import { aTenant } from '../../test/fixtures';
import { renderRoute } from '../../test/renderRoute';
import { PortalLayout } from './PortalLayout';

const routes = [
  {
    path: '/:tenantSlug',
    Component: PortalLayout,
    children: [{ index: true, element: <p>Portal page</p> }],
  },
];

describe('PortalLayout', () => {
  it("shows the portal in its tenant's branding", async () => {
    stubApi({
      'GET /tenants/adriatic': aTenant({
        logoUrl: 'https://cdn.example.com/adriatic.png',
        primaryColor: '#aa3300',
        contactEmail: 'contact@adriatic.example.com',
      }),
    });
    const { unmount } = renderRoute('/adriatic', { routes });

    const home = await screen.findByRole('link', { name: 'Adriatic Stays' });
    expect(home).toHaveAttribute('href', '/adriatic');
    expect(home.querySelector('img')).toHaveAttribute(
      'src',
      'https://cdn.example.com/adriatic.png',
    );
    // On the document, so popups rendered into <body> take it too.
    expect(document.documentElement.style.getPropertyValue('--primary')).toBe(
      '#aa3300',
    );
    expect(screen.getByRole('link', { name: 'All portals' })).toHaveAttribute(
      'href',
      '/',
    );
    expect(
      screen.getByRole('link', { name: 'contact@adriatic.example.com' }),
    ).toHaveAttribute('href', 'mailto:contact@adriatic.example.com');
    expect(screen.getByText('Portal page')).toBeInTheDocument();

    // Leaving the portal gives the document its own colour back.
    unmount();
    expect(document.documentElement.style.getPropertyValue('--primary')).toBe(
      '',
    );
  });

  it('shows "Portal not found" for an unknown tenant', async () => {
    stubApi({
      'GET /tenants/nowhere': jsonResponse(
        404,
        apiErrorBody(404, 'TENANT_NOT_FOUND', 'Tenant not found'),
      ),
    });
    renderRoute('/nowhere', { routes });

    expect(await screen.findByText('Portal not found')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'See all portals' }),
    ).toHaveAttribute('href', '/');
    expect(screen.queryByText('Portal page')).not.toBeInTheDocument();
  });

  it('shows "Portal not found" for an address that is not a slug, without asking the API', () => {
    renderRoute('/Not_A_Slug', { routes });
    expect(screen.getByText('Portal not found')).toBeInTheDocument();
  });

  it('shows the error with Retry when the portal cannot be loaded', async () => {
    stubApi({
      'GET /tenants/adriatic': jsonResponse(
        500,
        apiErrorBody(500, 'INTERNAL_ERROR', 'Internal server error'),
      ),
    });
    renderRoute('/adriatic', { routes });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Internal server error',
    );
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'All portals' })).toHaveAttribute(
      'href',
      '/',
    );
    expect(screen.queryByText('Portal page')).not.toBeInTheDocument();
  });
});
