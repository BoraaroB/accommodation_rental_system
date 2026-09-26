import { createBrowserRouter, type RouteObject } from 'react-router';
import { NotFoundPage } from '../pages/NotFoundPage';
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
 * Browser routes. Pages are added by the portal, auth, host and admin
 * features; the host and admin groups get role checks with sign-in.
 */
export const routes: RouteObject[] = [
  {
    path: '/',
    Component: RootLayout,
    ErrorBoundary: RootErrorBoundary,
    children: [
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
