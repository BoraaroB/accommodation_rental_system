import { createBrowserRouter, type RouteObject } from 'react-router';
import { LandingPage } from '../pages/LandingPage';
import { ListingDetailPage } from '../pages/ListingDetailPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { PortalHomePage } from '../pages/PortalHomePage';
import { RootErrorBoundary } from '../pages/errors/RootErrorBoundary';
import { RouteErrorState } from '../pages/errors/RouteErrorState';
import { AdminLayout } from './layouts/AdminLayout';
import { HostLayout } from './layouts/HostLayout';
import { PortalLayout } from './layouts/PortalLayout';
import { RootLayout } from './layouts/RootLayout';

/**
 * A pathless route around a layout's pages. Its error boundary replaces only
 * the page, so the layout's header and navigation stay.
 */
export function contentBoundary(children: RouteObject[]): RouteObject {
  return { ErrorBoundary: RouteErrorState, children };
}

/**
 * Browser routes. The auth, host and admin features add their pages; the
 * host and admin groups get role checks with sign-in.
 */
// Possible improvement (not in the plan): load the pages with the routes'
// `lazy`, so the first visit downloads less (the build warns above 500 kB).
export const routes: RouteObject[] = [
  {
    path: '/',
    Component: RootLayout,
    ErrorBoundary: RootErrorBoundary,
    children: [
      // The demo's landing page: every portal.
      { index: true, Component: LandingPage },
      // Platform admin panel (superadmin). `admin` is a reserved tenant slug.
      {
        path: 'admin',
        Component: AdminLayout,
        children: [contentBoundary([])],
      },
      // A tenant's public portal; its host panel (hosts of this tenant) nests inside.
      {
        path: ':tenantSlug',
        Component: PortalLayout,
        children: [
          contentBoundary([
            { index: true, Component: PortalHomePage },
            { path: 'listings/:id', Component: ListingDetailPage },
            {
              path: 'host',
              Component: HostLayout,
              children: [contentBoundary([])],
            },
          ]),
        ],
      },
      { path: '*', Component: NotFoundPage },
    ],
  },
];

export const router = createBrowserRouter(routes);
