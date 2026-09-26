# Feature 9 — Web bootstrap

- **Branch:** `feat/web-bootstrap`
- **Status:** PR merged — #17, 2026-09-26

## Goal and scope

The web app's foundation, with no feature pages yet: Vite + React 19 + Tailwind 4 with design tokens, a validated env module and `apps/web/.env.example`, the Redux store with one RTK Query `baseApi` and a global error middleware, the router with error boundaries on three levels, the base UI kit and the three layouts.

Challenge references:

- "we expect what you do build to be built well — with tests, a clear structure and a usable UI."
- "Feel free to take UI inspiration from Airbnb or Booking. We are not looking for visual design; we are looking for something that can actually be used."

Done when (from the plan): the app starts and NotFound works; tests are green.

## Decisions

Approved by the repository owner in the design:

- **Scaffold:** `create-vite` 9.2.1 `react-ts` template (TypeScript `~6.0`, oxlint), without the demo files and without its own `.gitignore` (the root one covers it).
- **Route groups:** public (`/`, `/:tenantSlug`), host (`/:tenantSlug/host`, nested in `PortalLayout`) and superadmin (`/admin`), plus `*` → NotFound. No placeholder pages: features 10–13 add the pages; `RequireRole` and the sign-in routes come with feature 11.
- **Layout error boundaries:** each layout has a pathless child route with an `ErrorBoundary`, so an error replaces only the content and the header and navigation stay.
- **Error middleware:** 403 → "You don't have permission" toast; 5xx and network errors → a toast with the request id. 401 handling (logout) comes with the auth slice in feature 11, as planned.
- **Dev server env:** `WEB_PORT` and `API_PROXY_TARGET` are read with `loadEnv` and validated with zod only when the dev server runs, so a production build does not need them.
- **`Skeleton` and `EmptyState`** are added now, in a minimal form, because `QueryState` renders them (a small change of the feature order, approved).
- **Vitest (web):** `environment: 'jsdom'`, a setup file with `@testing-library/jest-dom/vitest` and an explicit `cleanup`; `test.env` provides `VITE_API_BASE_URL` (Vitest 4.1 serves `import.meta.env` from it).

Changed during implementation:

- **Folder structure** ([D-058](../decisions.md#d-058-the-web-app-is-organised-by-feature-with-conventional-folder-names)): asked for by the repository owner after the first version. The plan's `shared/*` folders became conventional names (`components/ui`, `api`, `config`, `lib`), the store and its typed hooks moved to `store/`, and the route error components and NotFound to `pages/`.
- **Error reporting happens once per error** ([D-055](../decisions.md#d-055-every-client-error-is-reported-once)): React 19 calls `onCaughtError` for errors the widget `ErrorBoundary` has already reported, so that hook skips them.
- **Tailwind's default palette is removed** (`--color-*: initial`), so only token colours exist ([D-056](../decisions.md#d-056-colours-come-only-from-design-tokens)).
- **Toasts are capped at three**, newest kept, so a burst of failing requests cannot fill the screen.

Fixed after the review:

- A proxy's HTML error page (e.g. nginx 502) reaches RTK Query as `PARSING_ERROR` with the status in `originalStatus`; `getErrorStatus` reads it, so it gets the server-error toast and "The request failed (HTTP 502)".
- `VITE_API_BASE_URL` and `API_PROXY_TARGET` accept only `http(s)` URLs (`z.url()` alone accepts `localhost:3000`).
- `QueryState` keeps the data it shows when a refresh for the same arguments fails (it checks `currentData`); new arguments that fail still show the error.
- Route error fallbacks show an exception's own message only in development.
- The toast's dismiss button is 44 px; the toast stack no longer wraps the toasts' own live regions in a second one.

Recorded as [D-054](../decisions.md#d-054-a-layouts-error-boundary-sits-on-a-pathless-content-route) to [D-058](../decisions.md#d-058-the-web-app-is-organised-by-feature-with-conventional-folder-names); D-022, D-025, D-027 and D-030 have new statuses.

## What was done

- **Scaffold:** `apps/web` (`@ars/web`) from `create-vite` 9.2.1 `react-ts`, without the demo files. Scripts `dev`, `build`, `preview`, `lint` (`oxlint --deny-warnings src`), `typecheck` (`tsc -b`), `test`, `test:watch`. Dependencies: React 19.3, React Router 8.4, Redux Toolkit 2.12, react-redux 9.3, zod 4, `@ars/shared`; Tailwind 4.3 through `@tailwindcss/vite`; Testing Library and jsdom for tests.
- **Config:** `config/env.ts` validates `VITE_API_BASE_URL` (a path or a URL) and exposes `isDevelopment` / `isProduction`, so nothing else reads `import.meta.env`. `vite.config.ts` validates `WEB_PORT` and `API_PROXY_TARGET` with zod only when the dev server runs, sets the port (`strictPort`) and proxies `/api`. `apps/web/.env.example` documents all three.
- **Styles:** `styles/tokens.css` (`@theme` tokens, default palette removed) and `styles/index.css` (Tailwind, tokens, page base styles).
- **State:** `makeStore()` with `baseApi` (no endpoints yet; schema validation off in production and `catchSchemaFailure` → `CUSTOM_ERROR`) and the `ui` slice (toasts). `rtkErrorMiddleware` turns 403 into a permission toast and 5xx / network errors into a toast with the request id; other errors are left to the page. Typed `useAppDispatch` / `useAppSelector`.
- **Errors:** `getErrorMessage`, `getRequestId`, `getErrorStatus` and `isServerOrNetworkError` in `api/errors.ts`; `reportError` in `lib/logger.ts`, called by the React root hooks and the widget `ErrorBoundary`.
- **UI kit:** `Button` (primary, secondary, ghost, danger; three sizes), `Input`, `Field` (label, hint and error linked through `useId`, `aria-invalid` and `aria-describedby`), `Card`, `Badge`, `Skeleton`, `EmptyState`, `ErrorState`, `QueryState`, `Toast`, `ErrorBoundary`.
- **Routing:** `/admin` → `AdminLayout`; `/:tenantSlug` → `PortalLayout` with `host` → `HostLayout` nested inside (tabs on desktop, a bottom bar on phones); `*` → `NotFoundPage`. The root route has `RootErrorBoundary`; each layout's pages go into `contentBoundary([...])`. No placeholder pages.

## Key files

- `apps/web/src/main.tsx` — root, error hooks, providers
- `apps/web/src/app/router.ts`, `app/layouts/`, `pages/NotFoundPage.tsx`, `pages/errors/`
- `apps/web/src/store/` (`store.ts`, `hooks.ts`, `uiSlice.ts`, `rtkErrorMiddleware.ts`), `components/Toasts.tsx`
- `apps/web/src/api/baseApi.ts`, `api/errors.ts`, `config/env.ts`, `lib/logger.ts`
- `apps/web/src/components/ui/`
- `apps/web/src/styles/tokens.css`
- `apps/web/vite.config.ts`, `apps/web/vitest.config.ts`, `apps/web/.env.example`

## Verification

- `npm run lint`, `npm run typecheck`, `npm test` (web: 8 files, 50 tests; api 205; shared 227), `npm run build`, `npm run format:check` and `npm run test:e2e -w apps/api` (257) are green.
- Web tests cover: the env schema; `getErrorMessage` for an API body, a validation `message[]`, an HTTP error with an empty body, a non-JSON error page (`PARSING_ERROR` + `originalStatus`), network, schema and serialized errors; the middleware (403, 5xx, a proxy's HTML 502 and network toast; 400/404/409 do not; at most three toasts); `Toasts` (dismiss by click and by timer); `ErrorBoundary` (fallback and `reportError`); the router (unknown URL → NotFound, portal, host panel inside the portal, `/admin` is not a portal, a failing page keeps the layout, the root fallback); `QueryState` (loading, error with request id and Retry, a failed refresh keeps the data, failed new arguments show the error, empty, data); `Field` (hint, error, `aria-invalid`).
- Manual: `npm run dev -w apps/web` starts on `WEB_PORT`; with the API running, `/api/health` through the dev server returns 200, `/api/v1/tenants` returns the three tenants and `/api/v1/nope` returns the API's 404 body. `vite build` produces only the token colours in the CSS.

## Deliberately left out

- `/` renders an empty page until feature 10 adds the landing page (NotFound's "home" link leads there).
- Pages: the landing page, the portal, listing detail and tenant branding (feature 10); sign-in and registration (feature 11); host (12) and admin (13) pages.
- The auth slice, the token in `prepareHeaders`, `RequireRole`, the 403 page and 401 handling in the middleware (feature 11, as planned).
- UI kit parts not needed yet: `Select`, `Modal`, `Drawer`, `Pagination`, `DataTable`, and the filter drawer state in the `ui` slice — added by the features that use them.

## Possible improvements (not in the plan)

- Send response schema mismatches to `reportError` through RTK Query's `onSchemaFailure` (comment in `api/baseApi.ts`).

## Commit message

One commit on `feat/web-bootstrap`, merged into `main` by merge commit `1ee9762` (PR #17).

`bccf99a`:

```
feat(web): bootstrap the web app with store, router and UI kit

- Add apps/web (Vite 8, React 19, Tailwind 4) with design tokens and a zod-validated env
- Add the Redux store: RTK Query baseApi, toast slice and a global error middleware
- Add routes with portal, host and admin layouts, three levels of error boundaries and NotFound
- Add the base UI kit (Button, Field, QueryState, ErrorState, Toast, ErrorBoundary, ...)
- Organise the app by feature with conventional folders and add Vitest + Testing Library tests
```
