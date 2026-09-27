# Architecture

The target architecture. Each section notes the feature that implements it; [progress.md](progress.md) shows what exists today. The reasons behind the choices are in [decisions.md](decisions.md).

## Overview

```mermaid
flowchart LR
  CSV[data/*.csv] -->|seed, once| DB[(PostgreSQL 18)]
  DB <-->|Prisma 7| API[apps/api<br/>NestJS 12]
  API <-->|/api/v1, JSON| WEB[apps/web<br/>React 19 SPA]
  SHARED[packages/shared<br/>contracts, zod schemas, utils] -.-> API
  SHARED -.-> WEB
```

- **`packages/shared`** (`@ars/shared`) — `contracts.ts` as delivered, zod schemas for API inputs and responses, and pure utilities (`today`, `addDays`, `eurosToCents`). Compiled to ESM in `dist/`. _Feature 1 (utilities), later features add schemas._
- **`apps/api`** — NestJS 12 (ESM) with Prisma 7 on PostgreSQL 18. _Features 2–8._
- **`apps/web`** — Vite 8, React 19, React Router 8, Tailwind 4, Redux Toolkit + RTK Query. _Features 9–13._
- **Docker Compose** — Postgres, the API (migrate → seed → start) and nginx serving the web build and proxying `/api`. _Features 2 (database) and 14 (full stack)._

## Data flow: CSV → database → API → UI

1. **Seed** (`npm run db:seed`, feature 4): `csv-parse` reads the CSV as snake_case strings; mappers convert and validate each row with zod; batched `createMany` inserts them. Tenants are assigned by country ([D-004](decisions.md#d-004-three-tenants-split-by-region)). The CSV is never read at runtime ([D-015](decisions.md#d-015-csv-is-loaded-once-by-a-typescript-seed)).
2. **Database** (feature 3): Prisma models with camelCase fields mapped to snake_case columns. Money is `Int` cents, calendar dates are `date`. CHECK and EXCLUDE constraints in the initial migration enforce the contract's value rules and non-overlapping active bookings; deleting a tenant cascades to its data ([D-036](decisions.md#d-036-the-database-enforces-the-contracts-value-rules)).
3. **API** (features 5–8): repositories load tenant-scoped rows; mappers turn them into `ListingDto` / `BookingDto` (`Date` → `IsoDate`, `Decimal` → `number | null`, no `tenantId`) ([D-016](decisions.md#d-016-contractsts-is-the-api-response-shape)).
4. **UI** (features 9–13): RTK Query fetches with arguments taken from the URL ([D-017](decisions.md#d-017-listing-filters-live-in-the-url)) and validates responses against the shared schemas in development.

## API structure

Each module follows controller → service → repository:

- **Controller** — routing, validation with shared zod schemas, permission declaration.
- **Service** — business rules; throws domain exceptions with a `code`.
- **Repository** — the only Prisma access; always receives `tenantId` for tenant data.

All routes are under `/api/v1` ([D-018](decisions.md#d-018-uri-versioning-under-apiv1)); tenant routes under `/api/v1/tenants/:tenantSlug/...`.

## API modules

One Nest module per area ([D-035](decisions.md#d-035-one-nest-module-per-area)). `AppModule` only imports modules, so it is the table of contents; each module file lists what its area provides.

```
apps/api/src/
  main.ts                 bootstrap: create the app, configureApp(), listen; fatal log + exit 1 on failure
  app.module.ts           imports the modules below
  app.setup.ts            prefix, versioning, CORS, logger, middleware that must run before the body parser
  api.constants.ts        `api` prefix and default version `1`
  core/
    config/               AppConfigModule — env file + zod validation, ConfigService (global)
    request-context/      RequestContextModule — request id, AsyncLocalStorage context
    logging/              LoggingModule — AppLoggerService, one line per request
    errors/               ErrorsModule — catch-all and Prisma filters (APP_FILTER), error body
    database/             DatabaseModule — PrismaService (the Prisma client)
  generated/prisma/       Prisma client (generated, gitignored)
  health/                 HealthModule — GET /api/health
```

| Module                 | Provides                                                                   | Imports                |
| ---------------------- | -------------------------------------------------------------------------- | ---------------------- |
| `AppConfigModule`      | `ConfigModule.forRoot` (global `ConfigService`)                            | —                      |
| `RequestContextModule` | `RequestContextService`, `RequestIdMiddleware`, `RequestContextMiddleware` | —                      |
| `LoggingModule`        | `AppLoggerService`, `RequestLoggerMiddleware`                              | `RequestContextModule` |
| `ErrorsModule`         | `AllExceptionsFilter`, `PrismaExceptionFilter` as `APP_FILTER`             | `RequestContextModule` |
| `DatabaseModule`       | `PrismaService` (exported)                                                 | —                      |
| `HealthModule`         | `HealthController`                                                         | —                      |

Features 5–8 add one module per entity — `users`, `tenants`, `listings`, `bookings`, `blocked-days`, `hosts` — plus `auth`, each in `src/<entities>/`, generated with the Nest CLI by the feature that gives it its first provider. Modules with a Prisma repository import `DatabaseModule`. An entity served to several audiences has one controller per audience in its module (e.g. `listings.controller.ts` for the portal, `host-listings.controller.ts` for the host panel). Repositories are an interface plus an injection token, implemented with Prisma.

**Public portal** (feature 6), all `@Public()`; the tenant routes go through `TenantGuard` ([D-044](decisions.md#d-044-a-portal-shows-only-its-own-tenants-listings)):

| Route (under `/api/v1`)                              | Module / controller                | Response                                                                                                                                  |
| ---------------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /tenants`                                       | `tenants/` · `TenantsController`   | `PublicTenant[]`, by slug                                                                                                                 |
| `GET /tenants/:tenantSlug`                           | `tenants/` · `TenantsController`   | `PublicTenant`, from the record `TenantGuard` loaded ([D-047](decisions.md#d-047-the-portals-configuration-comes-with-the-tenant-lookup)) |
| `GET /tenants/:tenantSlug/cities`                    | `listings/` · `ListingsController` | `string[]`, alphabetical                                                                                                                  |
| `GET /tenants/:tenantSlug/listings`                  | `listings/` · `ListingsController` | `Page<ListingDto>` ([D-045](decisions.md#d-045-listing-pages-24-by-default-at-most-48-ties-broken-by-id))                                 |
| `GET /tenants/:tenantSlug/listings/:id`              | `listings/` · `ListingsController` | `ListingDto`; 404 `LISTING_NOT_FOUND`                                                                                                     |
| `GET /tenants/:tenantSlug/listings/:id/availability` | `listings/` · `ListingsController` | `{ from, to, unavailableDays }` ([D-046](decisions.md#d-046-public-availability-lists-the-taken-days-of-a-range))                         |

Inputs are validated by `listingQuerySchema`, `availabilityQuerySchema` and `listingIdSchema` from `@ars/shared`; the web app uses the same schemas.

**Host panel** (feature 7), signed-in only; every controller runs `@UseGuards(TenantGuard, PermissionsGuard)`, so a host of the tenant and the superadmin get in, a client or another tenant's host gets 403 ([D-005](decisions.md#d-005-a-host-manages-all-listings-of-their-tenant)):

| Route (under `/api/v1`)                                           | Permission          | Module / controller                       | Response                                                                                                                                                                              |
| ----------------------------------------------------------------- | ------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /tenants/:tenantSlug/host/listings?q`                        | `listing:read`      | `listings/` · `HostListingsController`    | `Page<ListingDto>`, newest first ([D-050](decisions.md#d-050-the-host-listing-search-matches-the-title-or-the-city))                                                                  |
| `GET /tenants/:tenantSlug/host/listings/:id`                      | `listing:read`      | `listings/` · `HostListingsController`    | `ListingDto`; 404 `LISTING_NOT_FOUND`                                                                                                                                                 |
| `PATCH /tenants/:tenantSlug/host/listings/:id`                    | `listing:update`    | `listings/` · `HostListingsController`    | `ListingDto`; 409 `MAX_GUESTS_BELOW_BOOKING` ([D-014](decisions.md#d-014-listing-edits-cannot-break-booking-invariants))                                                              |
| `GET /tenants/:tenantSlug/host/listings/:id/blocked-days`         | `blocked-day:read`  | `blocked-days/` · `BlockedDaysController` | `{ from, to, days }`; past ranges allowed                                                                                                                                             |
| `POST /tenants/:tenantSlug/host/listings/:id/blocked-days`        | `blocked-day:write` | `blocked-days/` · `BlockedDaysController` | 201 `{ from, to, days }`; 409 `DAY_ALREADY_BOOKED` ([D-010](decisions.md#d-010-blocked-days-one-row-per-day), [D-049](decisions.md#d-049-a-blocking-request-covers-at-most-366-days)) |
| `DELETE /tenants/:tenantSlug/host/listings/:id/blocked-days`      | `blocked-day:write` | `blocked-days/` · `BlockedDaysController` | 204                                                                                                                                                                                   |
| `GET /tenants/:tenantSlug/host/bookings?listingId&status&from&to` | `booking:read`      | `bookings/` · `BookingsController`        | `Page<HostBooking>` by check-in ([D-048](decisions.md#d-048-host-bookings-carry-the-listings-title-and-a-total-at-its-current-price))                                                 |

`BlockedDaysService` asks the exported `ListingsService` whether the listing exists in the tenant and which days its active bookings take; `BlockedDaysRepository` touches only blocked-day rows. Inputs are validated by `hostListingQuerySchema`, `listingUpdateSchema`, `dateRangeSchema`, `blockDaysSchema`, `upcomingDateRangeSchema` and `hostBookingQuerySchema`.

**Admin panel** (feature 8), signed-in only; platform routes without a tenant, so every controller runs `@UseGuards(PermissionsGuard)` alone and only the superadmin gets in — a client or any host gets 403 ([D-051](decisions.md#d-051-the-admin-panel-addresses-tenants-by-id)):

| Route (under `/api/v1`)                         | Permission     | Module / controller                   | Response                                                                                                                                          |
| ----------------------------------------------- | -------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /admin/tenants`                            | `tenant:read`  | `tenants/` · `AdminTenantsController` | `AdminTenant[]`, by slug                                                                                                                          |
| `GET /admin/tenants/:tenantId`                  | `tenant:read`  | `tenants/` · `AdminTenantsController` | `AdminTenant`; 404 `TENANT_NOT_FOUND`                                                                                                             |
| `POST /admin/tenants`                           | `tenant:write` | `tenants/` · `AdminTenantsController` | 201 `AdminTenant`; 409 `SLUG_TAKEN` ([D-028](decisions.md#d-028-tenant-slugs-are-kebab-case-with-reserved-words))                                 |
| `PATCH /admin/tenants/:tenantId`                | `tenant:write` | `tenants/` · `AdminTenantsController` | `AdminTenant`; a merge patch ([D-052](decisions.md#d-052-tenant-configuration-is-edited-as-a-merge-patch)); 409 `SLUG_TAKEN`                      |
| `DELETE /admin/tenants/:tenantId`               | `tenant:write` | `tenants/` · `AdminTenantsController` | 204; cascades, users stay ([D-029](decisions.md#d-029-deleting-a-tenant-cascades-users-stay))                                                     |
| `GET /admin/tenants/:tenantId/hosts`            | `host:read`    | `hosts/` · `HostsController`          | `TenantHost[]`, by e-mail                                                                                                                         |
| `POST /admin/tenants/:tenantId/hosts`           | `host:write`   | `hosts/` · `HostsController`          | 201 `AddedHost` (`accountCreated`); 409 `ALREADY_HOST` ([D-053](decisions.md#d-053-adding-a-host-reuses-an-existing-account-without-changing-it)) |
| `DELETE /admin/tenants/:tenantId/hosts/:userId` | `host:write`   | `hosts/` · `HostsController`          | 204; 404 `HOST_NOT_FOUND`; the account stays                                                                                                      |

`HostsService` checks the tenant through the exported `TenantsService`, reads accounts through `USERS_REPOSITORY` and hashes a new host's password with the `PASSWORD_HASHER` that `AuthModule` exports; `HostsRepository` writes memberships, and a new account together with its membership. Inputs are validated by `tenantIdSchema`, `tenantCreateSchema`, `tenantUpdateSchema`, `userIdSchema` and `hostInputSchema`.

## Request pipeline (API)

```mermaid
flowchart LR
  R[Request] --> RID[RequestId middleware<br/>x-request-id]
  RID --> LOG[RequestLogger middleware<br/>one line per request]
  LOG --> BP[CORS, body parser]
  BP --> CTX[RequestContext middleware<br/>AsyncLocalStorage]
  CTX --> AG[AuthGuard<br/>who you are]
  AG --> TG[TenantGuard<br/>slug → tenant, 404]
  TG --> PG[PermissionsGuard<br/>what you may do]
  PG --> V[zod validation]
  V --> H[Handler → service → repository]
  H -. exception .-> F[Exception filters<br/>apiErrorSchema]
```

- **Authentication** (feature 5): a global `AuthGuard` verifies the JWT (`sub`, `email`); `@Public()` opts a route out.
- **Tenant resolution** (feature 5): `TenantGuard` resolves `:tenantSlug` and exposes the tenant with `@CurrentTenant()`. Platform routes (the admin panel) have no tenant and skip it.
- **Authorization** (feature 5): `PermissionsGuard` checks `@RequirePermissions(...)` against the role computed for the URL's tenant — superadmin, host (membership) or client — through `ROLE_PERMISSIONS` ([D-007](decisions.md#d-007-roles-are-not-in-the-token)); on a platform route the role is superadmin or client.
- **Errors** (features 2–3): a catch-all filter and a Prisma filter return the `apiErrorSchema` shape; 5xx never include a stack trace ([D-019](decisions.md#d-019-one-error-format-for-the-whole-api)).
- **Logging** (feature 2): request id in every log line, the response header and the error body; one log line per request ([D-020](decisions.md#d-020-logging-with-the-built-in-consolelogger), [D-034](decisions.md#d-034-request-id-through-a-response-header-and-asynclocalstorage)). `RequestId` and `RequestLogger` are registered with `app.use` so they run before CORS and the body parser; the request context is entered after the body parser, because an `AsyncLocalStorage` context does not survive its stream callbacks.

## Tenant isolation

Enforced in the application layer ([D-006](decisions.md#d-006-tenant-isolation-in-the-application-layer)):

- the tenant comes only from the URL slug, resolved by `TenantGuard`;
- every repository method for listings, bookings and blocked days takes `tenantId`; single rows are loaded by `id` **and** `tenantId`;
- e2e tests prove that another tenant's data returns 404 and another tenant's host routes return 403.

## Availability

Derived at read time from bookings and blocked days ([D-009](decisions.md#d-009-availability-is-derived-at-read-time), [D-010](decisions.md#d-010-blocked-days-one-row-per-day)):

- stays are half-open `[checkIn, checkOut)`; the checkout day is free;
- cancelled bookings block nothing;
- a listing is free for `[from, to)` when no active booking overlaps and no day in the range is blocked.

In the API (feature 6) one pair of Prisma predicates, `activeStaysOverlapping` and `blockedDaysWithin` (`listings/build-listing-query.ts`), serves both the list's date filter (inside `none`) and the listing's calendar (as relation selects). The pure `unavailableDays` turns the stays and blocked days it loads into the taken days of the range.

The host panel (feature 7) reuses them: blocking checks the range with the same active-stay predicate (a booked day is a 409, a day under a cancelled booking may be blocked), unblocking and the blocked-day list use `blockedDaysWithin`, and the host booking filter uses `staysOverlapping` — the same overlap without the status.

## Web structure

`apps/web/src`, organised by feature with conventional folder names ([D-058](decisions.md#d-058-the-web-app-is-organised-by-feature-with-conventional-folder-names)). Feature 9 lays the foundation; feature 10 adds the landing page and the portal; features 11–13 add sign-in and the panels.

```
main.tsx          root: error hooks, Redux provider, router
app/              router.ts (all routes), layouts/ (Root, Portal, Host, Admin)
pages/            route components: LandingPage, PortalHomePage, ListingDetailPage, NotFoundPage, errors/
features/<name>/  api.ts (injected endpoints), components/, hooks/ — tenants (portals, branding),
                  listings (URL filters, search, cards, availability); auth, host, admin follow
components/       shared components: ui/ (the UI kit: shadcn/ui on Base UI), AvailabilityCalendar,
                  DateRangePicker, Pager
hooks/            hooks shared by several features: useTenantSlug, useMediaQuery
store/            makeStore (baseApi + ui slice + rtkErrorMiddleware), typed hooks; the auth slice comes with feature 11
api/              baseApi (one createApi), errors.ts (getErrorMessage, getRequestId)
config/           env.ts: the only module that reads import.meta.env, validated with zod
lib/              logger (reportError: the single error-reporting hook), utils (cn), format (money, dates, Intl in UTC)
styles/           tokens.css (the shadcn theme: CSS variables + @theme inline), index.css
test/             Vitest setup, the fetch stub (apiStub), fixtures and render helpers
```

- A page composes feature components. Code used by more than one feature goes into the shared folders, which never import from `features/` or `pages/`.
- `api/baseApi.ts`: features inject their endpoints; response schemas are checked outside production, and a mismatch becomes a normal error.
- `components/ui` is **shadcn/ui on Base UI** ([D-062](decisions.md#d-062-the-ui-kit-is-shadcnui-on-base-ui)): the CLI (`npx shadcn add <name>`, configured by `components.json`) copies each component's source here, and it is ours to adapt. Generated: `button`, `input`, `label`, `field`, `input-group`, `select`, `combobox`, `popover`, `calendar` (react-day-picker), `sheet`, `pagination`, `card`, `badge`, `skeleton`, `empty`, `sonner`, plus `separator` and `textarea` (used by `field` and `input-group`). Our own: `form-field` (label, hint and error wired to the control), `empty-state`, `error-state`, `query-state`, `error-boundary`. Design tokens only ([D-056](decisions.md#d-056-colours-come-only-from-design-tokens)), mobile-first; icons from lucide-react; links styled as buttons are router `Link`s with `buttonVariants`.

**Routes:**

| Route                       | Page / layout                      | Who (from feature 11) |
| --------------------------- | ---------------------------------- | --------------------- |
| `/`                         | `LandingPage`: every portal        | everyone              |
| `/:tenantSlug`              | `PortalHomePage` in `PortalLayout` | everyone              |
| `/:tenantSlug/listings/:id` | `ListingDetailPage`                | everyone              |
| `/:tenantSlug/host/...`     | `HostLayout` inside the portal     | host of that tenant   |
| `/admin/...`                | `AdminLayout`                      | superadmin            |
| `*`                         | —                                  | NotFound              |

`admin` is a reserved tenant slug, and React Router ranks the static segment first, so `/admin` never reaches a portal.

**Errors:**

- A root boundary shows a full-page fallback. Each layout's pages sit in a pathless content route whose boundary replaces only the page ([D-054](decisions.md#d-054-a-layouts-error-boundary-sits-on-a-pathless-content-route)). The `ErrorBoundary` class protects single widgets.
- Request errors are shown by `QueryState` (loading → `Skeleton`, error → `ErrorState` with the request id and Retry, empty → `EmptyState`).
- `rtkErrorMiddleware` shows a Sonner toast for 403, 5xx and network errors ([D-063](decisions.md#d-063-toasts-are-sonner-outside-redux)); the `Toaster` sits in `RootLayout`.
- Every error is reported once through `reportError` ([D-055](decisions.md#d-055-every-client-error-is-reported-once)).

**Portal (feature 10):**

- `PortalLayout` loads the tenant (`GET /tenants/:tenantSlug`) and sets its primary colour as `--primary` and `--ring` on the document while the portal is shown (`useBrandColor`), so every token utility follows the tenant — including the popups the kit renders into `<body>`. The header, in the tenant's colour, shows the name and logo and an "All portals" link back to `/`; the footer shows the contact e-mail. An unknown tenant, or an address that is not a slug (not sent to the API), shows "Portal not found". The landing page has its own navbar.
- Filters, sort and page live in the URL ([D-017](decisions.md#d-017-listing-filters-live-in-the-url)). `useListingFilters` parses them with `listingQuerySchema`, drops invalid values and writes changes back, always to page 1. `useGetListingsQuery({ tenantSlug, query })` caches by exactly those arguments, so back and forward are instant.
- The search and price forms start from the URL and are remounted when it changes, so a removed filter also leaves the controls.
- The search bar — a searchable city combobox, one date range picker (`DateRangePicker`: Popover + Calendar in UTC) and a guests select — collapses to a summary on phones; the price filter (euros, with a € prefix) sits in a sidebar on desktop and in a sheet on phones ([D-061](decisions.md#d-061-the-filter-drawer-is-the-ui-kits-sheet)); active filters are removable chips; sort is a select.
- Result cards link to the detail with the searched dates. The detail shows the facts, the price (and the stay's total with dates), "Available for your dates ✓/✗" and the availability calendar on the kit's Calendar ([D-060](decisions.md#d-060-the-availability-calendar-shows-a-year-ahead-one-request-per-view)).
- `ScrollRestoration` starts every new page at the top.

**Tests:** page tests go through the real router and store with a stubbed `fetch` behind the test API URL `http://api.test/api/v1` ([D-059](decisions.md#d-059-web-tests-stub-fetch-behind-an-absolute-test-api-url)).

**Dev server:** `vite.config.ts` reads `WEB_PORT` and `API_PROXY_TARGET` (validated only when the dev server runs) and forwards `/api` to the API, so the browser calls the API on its own origin.

## Configuration

Every environment-specific value comes from `.env`, validated at startup in one module per app ([D-022](decisions.md#d-022-configuration-comes-only-from-validated-env)). `.env.example` files are added by the features that introduce the variables ([D-027](decisions.md#d-027-envexample-files-are-created-with-the-feature-that-needs-them)).

- **API:** `ConfigModule` validates the env with the zod schema in `apps/api/src/core/config/env.schema.ts` and serves the parsed values through `ConfigService`. It loads `apps/api/.env`, or `apps/api/.env.test` when `NODE_ENV=test` (both Vitest configs set it); real environment variables win over the file. In test mode `DATABASE_URL` must name a database ending in `_test`. The Prisma CLI reads the same `apps/api/.env` through `prisma.config.ts` ([D-037](decisions.md#d-037-generating-the-prisma-client-needs-no-database)); at startup the API waits for the database ([D-038](decisions.md#d-038-the-api-waits-for-the-database-at-startup)). An invalid or missing variable stops the start: the error names every failing variable, is logged as `fatal`, and the process exits with code 1.
- **Web:** `config/env.ts` validates `VITE_API_BASE_URL` (a path such as `/api/v1` behind the proxy, or a full URL) when the app loads. `vite.config.ts` validates the dev-server variables `WEB_PORT` and `API_PROXY_TARGET`; they have no `VITE_` prefix, so they never reach the bundle, and a production build does not need them.
- **Docker Compose:** the root `.env` (from the root `.env.example`) holds the Postgres credentials, the test database name and the host port.
