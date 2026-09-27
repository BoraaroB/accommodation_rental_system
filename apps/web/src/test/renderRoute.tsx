import {
  createMemoryRouter,
  type InitialEntry,
  type RouteObject,
} from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { routes } from '../app/router';
import { makeStore, type AppStore } from '../store/store';
import { TEST_TOKEN } from './fixtures';
import { renderWithStore } from './renderWithStore';

export interface RenderRouteOptions {
  /** The routes to render; the app's routes by default. */
  routes?: RouteObject[];
  /** Start signed in (with `TEST_TOKEN`); `GET /auth/me` must be stubbed. */
  signedIn?: boolean;
  store?: AppStore;
}

/** Renders the app's routes (or `routes`) at `entry` with a fresh store. */
export function renderRoute(
  entry: InitialEntry,
  {
    routes: routeList = routes,
    signedIn = false,
    store = makeStore({ token: signedIn ? TEST_TOKEN : null }),
  }: RenderRouteOptions = {},
) {
  const router = createMemoryRouter(routeList, { initialEntries: [entry] });
  return {
    router,
    ...renderWithStore(<RouterProvider router={router} />, store),
  };
}
