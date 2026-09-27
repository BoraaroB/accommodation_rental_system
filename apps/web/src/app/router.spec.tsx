import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { stubApi } from '../test/apiStub';
import { aTenant } from '../test/fixtures';
import { renderRoute } from '../test/renderRoute';
import { RootErrorBoundary } from '../pages/errors/RootErrorBoundary';
import { PortalLayout } from './layouts/PortalLayout';
import { contentBoundary } from './router';

function Broken(): never {
  throw new Error('Render failed');
}

describe('router', () => {
  beforeEach(() => {
    // React and React Router log the errors these tests throw on purpose.
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows NotFound for an unknown URL', () => {
    renderRoute('/adriatic/no/such/page');
    expect(
      screen.getByRole('heading', { name: 'Page not found' }),
    ).toBeInTheDocument();
  });

  it('renders the host panel inside the portal', async () => {
    stubApi({ 'GET /tenants/adriatic': aTenant() });
    renderRoute('/adriatic/host');
    expect(
      await screen.findByRole('link', { name: 'Adriatic Stays' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('navigation', { name: 'Host panel' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Listings' })).toHaveAttribute(
      'href',
      '/adriatic/host/listings',
    );
  });

  it('renders the admin layout on /admin, not a tenant portal', () => {
    renderRoute('/admin');
    expect(
      screen.getByRole('navigation', { name: 'Admin panel' }),
    ).toBeInTheDocument();
  });

  it('keeps the layout when a page inside it fails', async () => {
    stubApi({ 'GET /tenants/adriatic': aTenant() });
    renderRoute('/adriatic', [
      {
        path: '/:tenantSlug',
        Component: PortalLayout,
        children: [contentBoundary([{ index: true, Component: Broken }])],
      },
    ]);
    expect(
      await screen.findByRole('link', { name: 'Adriatic Stays' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Render failed');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('shows the full-page fallback for an error outside every layout', () => {
    renderRoute('/', [
      {
        path: '/',
        ErrorBoundary: RootErrorBoundary,
        children: [{ index: true, Component: Broken }],
      },
    ]);
    expect(
      screen.getByRole('heading', { name: 'Something went wrong' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Try again' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute(
      'href',
      '/',
    );
  });
});
