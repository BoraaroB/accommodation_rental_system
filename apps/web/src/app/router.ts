import { createBrowserRouter, redirect, type RouteObject } from 'react-router';
import {
  RequireHost,
  RequireSuperadmin,
} from '../features/auth/components/RequireRole';
import { HostBookingsPage } from '../pages/HostBookingsPage';
import { HostListingPage } from '../pages/HostListingPage';
import { HostListingsPage } from '../pages/HostListingsPage';
import { LandingPage } from '../pages/LandingPage';
import { ListingDetailPage } from '../pages/ListingDetailPage';
import { LoginPage } from '../pages/LoginPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { PortalHomePage } from '../pages/PortalHomePage';
import { RegisterPage } from '../pages/RegisterPage';
import { RootErrorBoundary } from '../pages/errors/RootErrorBoundary';
import { RouteErrorState } from '../pages/errors/RouteErrorState';
import { AdminLayout } from './layouts/AdminLayout';
import { HostLayout } from './layouts/HostLayout';
import { PortalLayout } from './layouts/PortalLayout';
import { RootLayout } from './layouts/RootLayout';
import { SiteLayout } from './layouts/SiteLayout';

/**
 * A pathless route around a layout's pages. Its error boundary replaces only
 * the page, so the layout's header and navigation stay.
 */
export function contentBoundary(children: RouteObject[]): RouteObject {
  return { ErrorBoundary: RouteErrorState, children };
}

/**
 * Browser routes. One sign-in page serves every portal and both panels
 * (D-065); the host and admin panels check the role and send a signed-out
 * user to sign in. The admin feature adds its pages.
 */
// Possible improvement (not in the plan): load the pages with the routes'
// `lazy`, so the first visit downloads less (the build warns above 500 kB).
export const routes: RouteObject[] = [
  {
    path: '/',
    Component: RootLayout,
    ErrorBoundary: RootErrorBoundary,
    children: [
      // The platform's pages: the landing page (every portal) and sign-in.
      // `login` and `register` are reserved tenant slugs.
      {
        Component: SiteLayout,
        children: [
          contentBoundary([
            { index: true, Component: LandingPage },
            { path: 'login', Component: LoginPage },
            { path: 'register', Component: RegisterPage },
          ]),
        ],
      },
      // Platform admin panel (superadmin). `admin` is a reserved tenant slug.
      // The role check is a pathless parent, so it covers every admin page.
      {
        Component: RequireSuperadmin,
        children: [
          {
            path: 'admin',
            Component: AdminLayout,
            children: [contentBoundary([])],
          },
        ],
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
              Component: RequireHost,
              children: [
                {
                  path: 'host',
                  Component: HostLayout,
                  children: [
                    contentBoundary([
                      // The panel opens on the listings (sign-in lands here).
                      { index: true, loader: () => redirect('listings') },
                      { path: 'listings', Component: HostListingsPage },
                      { path: 'listings/:id', Component: HostListingPage },
                      { path: 'bookings', Component: HostBookingsPage },
                    ]),
                  ],
                },
              ],
            },
          ]),
        ],
      },
      { path: '*', Component: NotFoundPage },
    ],
  },
];

export const router = createBrowserRouter(routes);
