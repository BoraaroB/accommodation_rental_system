import { screen } from '@testing-library/react';
import {
  createMemoryRouter,
  RouterProvider,
  type RouteObject,
} from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithStore } from '../test/renderWithStore';
import { RootErrorBoundary } from '../pages/errors/RootErrorBoundary';
import { PortalLayout } from './layouts/PortalLayout';
import { contentBoundary, routes } from './router';

function renderAt(path: string, routeList: RouteObject[] = routes) {
  const router = createMemoryRouter(routeList, { initialEntries: [path] });
  return renderWithStore(<RouterProvider router={router} />);
}

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
    renderAt('/adriatic/no/such/page');
    expect(
      screen.getByRole('heading', { name: 'Page not found' }),
    ).toBeInTheDocument();
  });

  it('renders the portal layout for a tenant slug', () => {
    renderAt('/adriatic');
    expect(screen.getByRole('link', { name: 'adriatic' })).toHaveAttribute(
      'href',
      '/adriatic',
    );
  });

  it('renders the host panel inside the portal', () => {
    renderAt('/adriatic/host');
    expect(screen.getByRole('link', { name: 'adriatic' })).toBeInTheDocument();
    expect(
      screen.getByRole('navigation', { name: 'Host panel' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Listings' })).toHaveAttribute(
      'href',
      '/adriatic/host/listings',
    );
  });

  it('renders the admin layout on /admin, not a tenant portal', () => {
    renderAt('/admin');
    expect(
      screen.getByRole('navigation', { name: 'Admin panel' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'admin' }),
    ).not.toBeInTheDocument();
  });

  it('keeps the layout when a page inside it fails', () => {
    renderAt('/adriatic', [
      {
        path: '/:tenantSlug',
        Component: PortalLayout,
        children: [contentBoundary([{ index: true, Component: Broken }])],
      },
    ]);
    expect(screen.getByRole('link', { name: 'adriatic' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Render failed');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('shows the full-page fallback for an error outside every layout', () => {
    renderAt('/', [
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
