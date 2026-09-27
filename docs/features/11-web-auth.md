# Feature 11 — Web auth

- **Branch:** `feat/web-auth`
- **Status:** done – awaiting commit

## Goal and scope

Sign-in and registration in the web app, the auth state, route protection and 401 handling (plan: "login and register, auth slice, `RequireRole`, 401 handling"; done when the redirect and logout tests are green).

Challenge references:

- "5. Registration and sign-in. Registration is for clients — host accounts are created by the superadmin."
- "6. Three kinds of user — client, host and superadmin"
- "Keep auth simple — we are not asking for SSO, 2FA or refresh-token rotation. What interests us is how you separate who you are from what you may do."
- "What happens to a client's account across portals is also yours to decide."

## Decisions

Approved by the repository owner in the design:

- **One global sign-in page** ([D-065](../decisions.md#d-065-one-global-sign-in-page)), a change of plan: `/login` and `/register` instead of `/:tenantSlug/login`, `/:tenantSlug/register` and `/admin/login`.
- **Where users go after sign-in:** back to `?redirect=` (a path inside the app only, `redirectPathSchema` in `@ars/shared`); otherwise a superadmin to `/admin`, the host of one tenant to `/{slug}/host`, the host of several to a list of their host panels, anyone else to `/`. The panel roots are the destinations; features 12 and 13 add their pages.
- **Who sees what:** the host panel is for the tenant's hosts and the superadmin, the admin panel for the superadmin, mirroring the API's `ROLE_PERMISSIONS` (asked by the owner and confirmed: the superadmin may open every page). Signed out → sign-in and back; signed in without the rights → a 403 page.
- **Auth state:** only the token in Redux (`store/authSlice.ts`, next to the UI slice, because `api/baseApi` reads it), kept in `localStorage` (`lib/tokenStorage.ts`); a listener saves and clears it and drops every cached response on sign-out; `prepareHeaders` sends it; `rtkErrorMiddleware` signs out on a 401 while signed in.
- **Registration signs in straight away** with the same credentials (the existing login endpoint).
- **Account menu** on the shadcn `dropdown-menu`, in the platform's, the portal's and the admin header.

Changed during implementation:

- The 403 page is `features/auth/components/AccessDenied.tsx`, not `pages/ForbiddenPage.tsx`: `RequireRole` renders it, and features do not import from `pages/` (D-058).
- The redirect helpers are in `features/auth/redirects.ts` (`signInPath`, `registerPath`, `safeRedirect`, `postSignInDestination`, `hostPanelPath`) and the UI gating in `features/auth/access.ts` (`canUseHostPanel`, `canUseAdminPanel`), instead of one `destination.ts`.
- `RequireSuperadmin` and `RequireHost` are **pathless parents** of the `admin` and `host` routes: a pathless layout route never matches as the last route of a URL, so a guard with the path and the layout as its pathless child rendered nothing.
- "Sign in" on the landing page carries no `redirect`, so hosts and the superadmin reach their panel; in a portal it returns to the current page.
- On phones the portal header's "All portals" and "Host panel" links show only their icons (the names stay for screen readers), so the header fits 375 px with the account menu.

Found in the manual scenario and fixed:

- **Signing out of a protected page ended on the sign-in page** instead of the portal home. React Router renders a navigation as a transition, so the store's sign-out rendered first and `RequireRole` redirected to sign-in. The account menu now navigates with `flushSync` and drops the token afterwards; `flushSync` needs `RouterProvider` from `react-router/dom`, which the React Router docs recommend in the browser (`main.tsx` and the test helper used the one from `react-router`). jsdom does not show the race (`act` flushes both updates together); the scenario in the browser checks it.

Found in the review and fixed:

- An account created while the automatic sign-in failed (5xx) left only a toast, and submitting again said the e-mail was taken; the form now says the account was created and links to sign-in.
- A kept token is read through `accessTokenSchema`, so an empty value is no token.
- The sign-in pages are recognised in any letter case, as the router matches paths (`redirectPathSchema`, the account menu with `matchPath`).
- The admin check goes through `canUseAdminPanel` everywhere; the header link style on the tenant's colour is the button's `onPrimary` variant instead of a class exported from the account menu.
- Tests added: the portal header loads again after sign-out, a 5xx from `/auth/me` shows Retry without leaving the page, `tokenStorage` without `localStorage`; tests use the exported `TOKEN_KEY`.

## What was done

- Shared: `redirectPathSchema` in `packages/shared/src/auth.ts`.
- Auth state: `store/authSlice.ts`, `store/authListener.ts`, `lib/tokenStorage.ts`, `makeStore(auth)`, `prepareHeaders` in `api/baseApi.ts`, the 401 branch in `store/rtkErrorMiddleware.ts`.
- `features/auth/`: `api.ts` (`login`, `register`, `getMe`), `hooks/useCurrentUser.ts`, `hooks/useRedirectParam.ts`, `redirects.ts`, `access.ts`, and the components `RequireRole` (`RequireSuperadmin`, `RequireHost`), `AccessDenied`, `RedirectIfSignedIn`, `HostPanelPicker`, `LoginForm`, `RegisterForm`, `FormAlert`, `AccountMenu`.
- Pages and layouts: `pages/LoginPage.tsx`, `pages/RegisterPage.tsx`; `app/layouts/SiteLayout.tsx` (the landing page's navbar moved there, with the account menu); the account menu and the "Host panel" link in `PortalLayout`; the account menu in `AdminLayout`; the routes in `app/router.ts`.
- UI kit: `dropdown-menu` (shadcn CLI) with an added `DropdownMenuLinkItem` on Base UI's `Menu.LinkItem`; the button's `onPrimary` variant.
- Test helpers: `renderRoute(entry, { routes, signedIn, store })`, `aUser()` and `TEST_TOKEN`, stub handlers receive the `Request` (for headers and bodies), every test starts with an empty `localStorage`.
- Docs: D-065, D-030's status, the plan (changes table, routes, route protection), `architecture.md`, `README.md`, the web rules.

## Key files

- `apps/web/src/app/router.ts`
- `apps/web/src/features/auth/components/RequireRole.tsx`, `AccountMenu.tsx`, `RedirectIfSignedIn.tsx`, `LoginForm.tsx`, `RegisterForm.tsx`
- `apps/web/src/features/auth/redirects.ts`, `access.ts`, `api.ts`
- `apps/web/src/store/authSlice.ts`, `authListener.ts`, `rtkErrorMiddleware.ts`; `apps/web/src/lib/tokenStorage.ts`
- `packages/shared/src/auth.ts` (`redirectPathSchema`)

## Tests

- Shared: `redirectPathSchema` accepts app paths and rejects empty, relative, `//host`, absolute, backslash, tab, `/login` (also `/Login`) and `/register`.
- Web:
  - auth state: the kept token at start, saved and cleared, the cache dropped on sign-out, the `Authorization` header only when signed in; `tokenStorage` with an empty value and without `localStorage`;
  - `rtkErrorMiddleware`: a 401 while signed in signs out with a toast, a 401 without a token is left to the form;
  - `redirects`: every branch of `postSignInDestination`, `safeRedirect`, the encoded paths;
  - `LoginPage`: an invalid form sends nothing, a wrong password shows the alert, the redirect is followed and an unsafe one ignored, the destination per role, the host panel list, a signed-in user is sent on, the redirect kept on the way to registration;
  - `RegisterPage`: the password rule, a taken e-mail on its field, registration signs in and follows the redirect, the note when the sign-in after it fails;
  - `RequireRole`: signed out → sign-in with the page and query, access and 403 per role, "Sign in with another account", a 5xx from `/auth/me` shows Retry, an expired token → sign-in;
  - `AccountMenu`: "Sign in" with the redirect (none on the landing page, hidden on `/login`), the host's name and panels, no panel for a client, the superadmin's links, sign-out to the portal home (also from a protected page) and to `/`;
  - the router: the host and admin panels for signed-in users, `/login` and `/register` served by the platform.

## Verification

| Command                         | Result                                                |
| ------------------------------- | ----------------------------------------------------- |
| `npm run lint`, `typecheck`     | green                                                 |
| `npm test`                      | shared 238, API 227, web 166                          |
| `npm run build`, `format:check` | green (the known chunk-size warning of the web build) |
| API e2e                         | not run: nothing in `apps/api` changed                |

Manual scenario (current API and web dev server, headless Chrome driven through the DevTools protocol, 1280 px and 375 px), 25 checks, all passing:

- Signed out: "Sign in" in a portal carries the page, on the landing page it does not; `/adriatic/host` → `/login?redirect=%2Fadriatic%2Fhost`; a wrong password shows "Invalid e-mail or password".
- Client: back to `/adriatic?city=Belgrade` after sign-in, token kept; no panels in the menu; 403 on `/adriatic/host` and `/admin`; sign-out from a listing → the portal home, token gone.
- Host (`host1.adriatic`): to `/adriatic/host`; "Host panel" in the Adriatic header, not in another portal's; 403 on `/west-europe/host`; no horizontal scroll at 375 px.
- A tampered token on `/admin` → sign-in with the redirect and the "session has expired" toast.
- Superadmin: to `/admin`; opens `/central-europe/host`; signs out of it to `/central-europe` (the race above).
- A host of two portals (a membership added through the admin API and removed afterwards) gets the host panel list.
- Registration of a new account signs in and returns to `/central-europe`; a signed-in user leaves `/register`. The test account stays in the local database.

## Deliberately left out

- The admin and host panel pages and their index routes (features 12 and 13); `/admin` and `/:tenantSlug/host` show their layout only.
- Tenant branding on the sign-in page: it belongs to no portal.
- The token's expiry is not read on the client; the API's 401 is the signal.

## Possible improvements (not in the plan)

- Follow the `storage` event, so a sign-in or sign-out in one tab applies to the other tabs (comment in `lib/tokenStorage.ts`).
- Show the portal of `?redirect=` on the sign-in page ("Sign in to Adriatic Stays") in its branding (comment in `pages/LoginPage.tsx`).
- Rate-limit sign-in and registration (already noted in the API's `AuthController`).
