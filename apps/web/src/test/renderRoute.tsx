import {
  createMemoryRouter,
  RouterProvider,
  type InitialEntry,
  type RouteObject,
} from 'react-router';
import { routes } from '../app/router';
import { renderWithStore } from './renderWithStore';

/** Renders the app's routes (or `routeList`) at `entry` with a fresh store. */
export function renderRoute(
  entry: InitialEntry,
  routeList: RouteObject[] = routes,
) {
  const router = createMemoryRouter(routeList, { initialEntries: [entry] });
  return { router, ...renderWithStore(<RouterProvider router={router} />) };
}
