# Implementation plan

The plan the project is built from. Every design choice is recorded as a numbered decision in [decisions.md](decisions.md); live status is in [progress.md](progress.md).

## Changes since the plan was approved

Found while verifying tools against their documentation and the npm registry (2026-09-24):

| Topic                | Original plan                                                                                               | Now                                                                                                                                                                                                                            | Why                                                                                                                                                 |
| -------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript           | not pinned                                                                                                  | `~6.0` in every workspace ([D-026](decisions.md#d-026-typescript-60-vitest-41-oxlint-and-prettier))                                                                                                                            | npm `latest` is 7.0, but `typescript-eslint` requires `<6.1` and the NestJS 12 CLI ships `~6.0.2`; the Vite `react-ts` template uses `~6.0.2` too   |
| Test runner          | "Vitest"                                                                                                    | Vitest `^4.1` in every workspace ([D-026](decisions.md#d-026-typescript-60-vitest-41-oxlint-and-prettier))                                                                                                                     | The NestJS 12 ESM template generates `vitest ^4.1.2`; Vitest 5 is out but would diverge from the template                                           |
| Lint                 | not specified                                                                                               | oxlint (with `--deny-warnings`) + Prettier                                                                                                                                                                                     | Both the NestJS 12 and the Vite templates generate oxlint; type-aware oxlint needs TypeScript 7, so types are checked by `tsc`                      |
| NestJS test setup    | "ESM generates Vitest + SWC"                                                                                | The template generates Vitest **without** SWC                                                                                                                                                                                  | Checked in `@nestjs/schematics` 12.0.5; verified in feature 2: Vite 8's Oxc transform emits decorator metadata, so DI specs pass without SWC        |
| Prisma config        | `env("DATABASE_URL")`                                                                                       | `process.env.DATABASE_URL` ([D-037](decisions.md#d-037-generating-the-prisma-client-needs-no-database))                                                                                                                        | `env()` throws without the variable, so `prisma generate` (a build step) would need a database URL                                                  |
| Schema constraints   | CHECK `check_out > check_in`; EXCLUDE a "Could"                                                             | CHECK constraints for the contract's value rules and the EXCLUDE constraint, in feature 3 ([D-036](decisions.md#d-036-the-database-enforces-the-contracts-value-rules))                                                        | Approved by the repository owner in the feature 3 design; `migrate dev` reports no drift for them                                                   |
| Database at startup  | not specified                                                                                               | The API waits for the database (10 attempts, 1 s apart), then fails ([D-038](decisions.md#d-038-the-api-waits-for-the-database-at-startup))                                                                                    | The pg adapter connects lazily; asked for by the repository owner                                                                                   |
| Entity modules       | "start with feature 3"                                                                                      | Each entity module is created by the feature that gives it its first provider or endpoint                                                                                                                                      | Empty modules would be dead code                                                                                                                    |
| `.env.example` files | all in feature 1                                                                                            | created with the feature that first reads the variables ([D-027](decisions.md#d-027-envexample-files-are-created-with-the-feature-that-needs-them))                                                                            | apps do not exist in feature 1; no dead configuration                                                                                               |
| Seed runtime         | not specified; `SEED_*` read by the API config                                                              | a standalone script run by `prisma db seed` with `tsx` and its own env schema; the API does not read `SEED_*` ([D-040](decisions.md#d-040-the-seed-is-a-standalone-script-that-only-inserts-missing-rows))                     | Node does not resolve `.js` specifiers to `.ts`; the API should not require seed-only variables. Approved by the repository owner in feature 4      |
| bcrypt               | feature 5                                                                                                   | feature 4                                                                                                                                                                                                                      | The seed creates the demo accounts with password hashes                                                                                             |
| Web folders          | `shared/ui`, `shared/api`, `shared/config`, `shared/lib`; store in `app/`                                   | `components/ui`, `api`, `config`, `lib`, `store`, `pages` (and `hooks` for shared hooks); `app/` keeps the router and layouts ([D-058](decisions.md#d-058-the-web-app-is-organised-by-feature-with-conventional-folder-names)) | Asked for by the repository owner in feature 9: the conventional feature-based layout (Bulletproof React) is easier to navigate                     |
| Web UI kit           | hand-written UI kit (Button, Select, Modal, Drawer, Toast, …); native date inputs; toasts in the `ui` slice | shadcn/ui on Base UI, react-day-picker, Sonner, lucide-react ([D-062](decisions.md#d-062-the-ui-kit-is-shadcnui-on-base-ui), [D-063](decisions.md#d-063-toasts-are-sonner-outside-redux))                                      | Asked for by the repository owner after the feature 10 review in the browser: the libraries large production apps use                               |
| Sign-in pages        | `/:tenantSlug/login` and `/:tenantSlug/register` per portal, `/admin/login` for the superadmin              | one `/login` and `/register` for every portal and both panels, routing by role afterwards ([D-065](decisions.md#d-065-one-global-sign-in-page))                                                                                | Approved by the repository owner at the start of feature 11: one account works everywhere (D-003), and products with a global identity sign in once |
| Password fields      | plain `type="password"` inputs                                                                              | a button on every password field shows and hides the password (feature 14a, [D-073](decisions.md#d-073-password-fields-have-a-showhide-toggle))                                                                                | Asked for by the repository owner before feature 15: a typo in a new password can be seen before it is sent                                         |

## Project name and package names

- Project: **Accommodation Rental System**; repository folder `accommodation_rental_system`.
- npm names (lowercase, URL-safe, scoped names allowed): the root package is `accommodation-rental-system`; the workspaces are `@ars/api`, `@ars/web` and `@ars/shared` (ars = Accommodation Rental System).

## Context

The challenge ([challenge/full_stack_challenge.md](challenge/full_stack_challenge.md)) asks for a multi-tenant accommodation rental portal. The portal is public, one per tenant, at `/{tenant-slug}` (route parameter `:tenantSlug` in code), plus a host panel and an admin panel. Clients do not book; bookings come from CSV. The interview walks through the code and the decisions, and asks for tests, a clear structure and a usable UI. Every assumption is recorded so it can be explained.

Delivered material: `contracts.ts`, `listings.csv` (1,000 rows), `bookings.csv` (12,757 rows) and the PDF.

**Verified facts about the data:**

- 12 cities; every price is in EUR, from 2,000 to 33,500 cents.
- 109 listings have `rating` null and `review_count` 0; `max_guests` is 1–12.
- Statuses: 9,317 confirmed, 2,156 completed, 1,284 cancelled.
- Dates run from 2026-07-28 to 2027-04-24; stays last 1–14 nights.
- Titles contain no commas; guests never exceed `max_guests`.

**Decided up front:** RTK Query + Redux Toolkit slices (no Zustand), Prisma 7, a global client identity, three tenants split by region, a React SPA on Vite rather than Next.js ([D-002](decisions.md#d-002-react-spa-on-vite-not-nextjs)). All repository content is in English. npm workspaces. Node 24 (currently 24.18; the NestJS CLI needs ≥ 24.15).

## Stack

Versions and documented behaviour verified on 2026-09-24.

| Part          | Version                                            | What matters from the docs                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NestJS        | 12.1                                               | ESM packages. `nest new` asks ESM or CJS; ESM generates Vitest. Relative imports end with `.js`. Zod schemas are used through `StandardSchemaValidationPipe` (`@Body({ schema })`)                                                                                                                                                                                                                                  |
| Prisma        | **7.10 (pinned `@7`)**                             | npm `latest` points to 8.0 RC. v7 docs live under `/docs/orm/v7`. Generator `prisma-client` with a required `output`. `@prisma/adapter-pg` is required. `prisma.config.ts` + `dotenv`. Seeding is run manually                                                                                                                                                                                                      |
| PostgreSQL    | 18                                                 | `daterange` canonical form `[)`. `EXCLUDE USING gist` + `btree_gist`                                                                                                                                                                                                                                                                                                                                                |
| React / Vite  | 19.3 / 8.3                                         | `npm create vite@latest web -- --template react-ts`                                                                                                                                                                                                                                                                                                                                                                 |
| React Router  | 8.4                                                | Data mode: `createBrowserRouter` and `RouterProvider` from `react-router`                                                                                                                                                                                                                                                                                                                                           |
| Tailwind      | 4.3                                                | `@tailwindcss/vite` + `@import "tailwindcss"`; tokens through `@theme`; mobile-first breakpoints                                                                                                                                                                                                                                                                                                                    |
| RTK Query     | RTK 2.12                                           | One `createApi` + `injectEndpoints` per feature. The token is read in `prepareHeaders` through `getState()`                                                                                                                                                                                                                                                                                                         |
| API versions  | NestJS versioning                                  | `app.setGlobalPrefix('api')` + `app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' })` gives `/api/v1/...`. v2 is added later with `@Version('2')` or `@Controller({ version: '2' })` without touching v1. `VERSION_NEUTRAL` for health                                                                                                                                                           |
| Zod on the FE | RTK Query schema validation                        | Endpoint options `argSchema` and `responseSchema` (Standard Schema, so Zod 4 works). Without `catchSchemaFailure` a failure is fatal; with it, it becomes a normal RTK error. `skipSchemaValidation` exists                                                                                                                                                                                                         |
| Forms         | react-hook-form 7.88 + @hookform/resolvers 5.9     | The resolver supports `zod ^4`. **The same zod schemas are used on the FE and the BE**                                                                                                                                                                                                                                                                                                                              |
| Config / env  | @nestjs/config 12, Vite `loadEnv`, nginx templates | NestJS 12: `ConfigModule.forRoot({ validationSchema: zodSchema })` (Standard Schema). Vite: the client only sees `VITE_*`. The nginx image runs `envsubst` over `/etc/nginx/templates/*.template`. Compose: `${VAR:?err}`                                                                                                                                                                                           |
| CSV parsing   | csv-parse 7.0 (ESM)                                | `import { parse } from "csv-parse/sync"`, `parse(input, { columns: true, skip_empty_lines: true })`. Values stay strings; our mapper converts them                                                                                                                                                                                                                                                                  |
| Errors (BE)   | NestJS exception filters                           | Catch-all `@Catch()` filter with `HttpAdapterHost`, registered through `APP_FILTER` (for DI). The catch-all filter is declared **first** so specific filters can intercept their exceptions. Built-in exceptions accept `cause`                                                                                                                                                                                     |
| Logging (BE)  | NestJS `ConsoleLogger`                             | `new ConsoleLogger({ json: true, logLevels })` and `new Logger(X.name)` in services. Logs go to stdout and are collected by Docker. Pino/Winston only if transports or redaction become necessary                                                                                                                                                                                                                   |
| Errors (FE)   | React Router 8 + React 19                          | Route property `ErrorBoundary` + `useRouteError` / `isRouteErrorResponse`; an error goes to the nearest parent boundary. A component boundary must be a **class** (`getDerivedStateFromError`, `componentDidCatch`) and does not catch event handlers or async code. `createRoot` accepts `onUncaughtError`, `onCaughtError` and `onRecoverableError`. RTK: middleware with `isRejectedWithValue` for global errors |
| Auth          | @nestjs/jwt 12, bcrypt                             | Global `AuthGuard` + `@Public()`. The permissions guard follows NestJS "claims-based authorization"                                                                                                                                                                                                                                                                                                                 |
| Tooling       | TypeScript 6.0, Vitest 4.1, oxlint, Prettier 3     | See "Changes since the plan was approved"                                                                                                                                                                                                                                                                                                                                                                           |

## Architecture

### Monorepo

```
apps/api          NestJS 12 (ESM) + Prisma 7
apps/web          Vite 8 + React 19 + Tailwind 4 + RTK
packages/shared   contracts.ts (as-is), zod schemas for API inputs and response DTOs, IsoDate/money utilities (tsc → dist, ESM exports)
data/             listings.csv, bookings.csv
docs/             project documentation (English)
docker-compose.yml
README.md         what the project is, how to run it, credentials, commands, links to docs/
```

### Data model (Prisma)

- `Tenant`: id, slug (unique), name, logoUrl?, primaryColor?, contactEmail?, currency (`'EUR'`, display only), timestamps.
- `User`: id, email (unique, always lowercase), passwordHash, name, isSuperadmin. **Global identity:** a client registers once and signs in on any portal.
- `TenantMembership`: (userId, tenantId) PK, role `host`. A host account is a user with a membership; one user may host several tenants.
- `Listing`: every field of `ListingDto` + `tenantId`. `rating` is `Decimal(2,1)?`, `pricePerNightCents` is `Int`, dates are `@db.Date`. Indexes: (tenantId, city), (tenantId, pricePerNightCents).
- `Booking`: the fields of `BookingDto`. Index (listingId, checkIn). CHECK `check_out > check_in`, added through a custom migration (`--create-only`).
- `BlockedDay`: (listingId, day) PK, createdById.
- Deleting a tenant cascades to listings, bookings, blocked days and memberships. Users stay, because identity is global.
- _Could:_ `EXCLUDE USING gist (listing_id WITH =, daterange(check_in, check_out) WITH &&) WHERE (status <> 'cancelled')`. Before keeping it, check that `prisma migrate dev` does not report it as drift.

### Availability (the core of the challenge)

- The date filter takes `from` (arrival, inclusive) and `to` (departure, exclusive), exactly like check-in and check-out.
- A listing is free when there is no non-cancelled booking with `checkIn < to AND checkOut > from`, **and** no blocked day in `[from, to)`. This is a Prisma v7 relation filter `none`, without raw SQL.
- Day D is taken when `checkIn ≤ D < checkOut`. The departure day is therefore free, and a cancelled booking blocks nothing.
- A host cannot block a day taken by an active booking: the API returns 409 ([D-010](decisions.md#d-010-blocked-days-one-row-per-day)).
- All date utilities live in `packages/shared` as pure functions over `YYYY-MM-DD` strings (UTC, no time) and are unit-tested.

### Filtering (URL → RTK Query → API → Prisma)

**The URL is the only source of truth for filters** ([D-017](decisions.md#d-017-listing-filters-live-in-the-url)). They are neither in Redux nor in component state.

Example: `/adriatic?city=Belgrade&guests=2&minPriceCents=5000&maxPriceCents=15000&from=2026-10-01&to=2026-10-04&sort=price_asc&page=2`

| Parameter                        | Meaning                                            | Validation (the same zod schema `listingQuerySchema` on FE and BE)                                                                                                                          |
| -------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `city`                           | exact city name                                    | string; dropdown options come from `GET /tenants/:tenantSlug/cities`, only that tenant's cities                                                                                             |
| `guests`                         | number of guests                                   | int 1–12; the listing must have `maxGuests ≥ guests`                                                                                                                                        |
| `minPriceCents`, `maxPriceCents` | price per night                                    | int ≥ 0, `min ≤ max`. **In cents, as in the contract**, so the URL and the API share one schema. The user types euros and `PriceRangeInput` converts them with `eurosToCents` from `shared` |
| `from`, `to`                     | arrival (inclusive) and departure (exclusive)      | both or neither, `to > from`, `from ≥ today()`                                                                                                                                              |
| `sort`                           | `price_asc`, `price_desc`, `rating_desc`, `newest` | enum, default `newest`. `rating_desc` puts null ratings last (Prisma v7 supports nulls first/last; the exact syntax is verified in the docs before use)                                     |
| `page`                           | page                                               | int ≥ 1. `pageSize` is fixed at 24 on the server (max 48)                                                                                                                                   |

**Frontend:**

1. `useListingFilters()` reads `useSearchParams` and parses them with the schema.
   - Every field has `.catch(undefined)`, so a bad parameter (e.g. `guests=abc`) drops only itself, not the whole filter.
   - Empty values are not written to the URL.
2. One `ListingFilters` form (react-hook-form + the same schema) with "Apply" and "Reset". It sits in a sidebar on desktop and in a drawer on mobile — the same component.
3. "Apply" calls `setSearchParams(...)` and always resets `page` to 1.
4. `useGetListingsQuery(filters)`: RTK Query caches by arguments, so back/forward restores earlier results from the cache immediately.
5. Active filters are shown as chips with ×, so one filter can be removed without opening the form.
6. The link to a listing carries `from` and `to` (`/adriatic/listings/:id?from&to`); the calendar then highlights the range and shows "Available for your dates ✓/✗".

**Why the URL:** filtered links can be shared; refresh and the back button keep filters; no duplicated state; the RTK cache works naturally because the query arguments are exactly what the URL says.

**Backend:**

- `GET /api/v1/tenants/:tenantSlug/listings` with `@Query({ schema: listingQuerySchema })`; zod coerces strings to numbers (`z.coerce`).
- `buildListingWhere(tenantId, query)` is a pure, unit-tested function that builds the Prisma `where`:
  - `tenantId` always;
  - `city` equals;
  - `maxGuests: { gte: guests }`;
  - `pricePerNightCents: { gte, lte }`;
  - for dates: `bookings: { none: { status: { not: 'cancelled' }, checkIn: { lt: to }, checkOut: { gt: from } } }` and `blockedDays: { none: { day: { gte: from, lt: to } } }`.
- `findMany({ where, orderBy, skip, take })` + `count({ where })` return `{ items, page, pageSize, total }`.
- Indexes: `(tenantId, city)` and `(tenantId, pricePerNightCents)` on listings, `(listingId, checkIn)` on bookings, PK `(listingId, day)` on blocked days.

### Auth: who you are vs what you may do

- **Identity:** the JWT payload holds only `sub` and `email`. A global `AuthGuard` verifies the token and sets `request.user`; `@Public()` marks public routes.
- **Authorization:** `PermissionsGuard` reads `@RequirePermissions('listing:update')`. `AccessService` computes the effective role **for the tenant in the URL**: superadmin if platform-wide, host if the user has a membership in that tenant, otherwise client. The role maps to permissions through a single `ROLE_PERMISSIONS` map. Roles are not in the token, so membership changes apply immediately ([D-007](decisions.md#d-007-roles-are-not-in-the-token)).
- Registration always creates a plain client; the superadmin creates hosts.
- The FE gets roles from `GET /api/v1/auth/me` (`isSuperadmin`, `hostOf[]`) and uses them only for UI gating. The server stays the only authority.

### Tenant isolation

- All tenant routes are under `/api/v1/tenants/:tenantSlug/...`. `TenantGuard` resolves the slug to a tenant (unknown slug → 404) and exposes it through `@CurrentTenant()`.
- Repository methods for Listing, Booking and BlockedDay **always take `tenantId`**. A single row is loaded with `findFirst({ where: { id, tenantId } })`, never by `id` alone. e2e tests prove it.
- Row-level security is deliberately out of scope ([D-006](decisions.md#d-006-tenant-isolation-in-the-application-layer)).

### API (prefix `/api/v1`)

- **Versioning:** URI versioning in `main.ts` with `defaultVersion: '1'`, so every route is under `/api/v1/...`. When v2 arrives:
  - a new handler with `@Version('2')` or a new controller with `@Controller({ version: '2' })` is added;
  - v1 stays untouched; services and repositories are shared between versions;
  - `GET /api/health` is `VERSION_NEUTRAL` and serves the Docker healthcheck.
- All paths below are relative to `/api/v1`.
- Public: `GET /tenants` (portal list for the landing page), `GET /tenants/:tenantSlug` (configuration and branding), `GET /tenants/:tenantSlug/cities`, `GET /tenants/:tenantSlug/listings?city&guests&minPriceCents&maxPriceCents&from&to&sort&page`, `GET /tenants/:tenantSlug/listings/:id`, `GET /tenants/:tenantSlug/listings/:id/availability?from&to`.
- Auth: `POST /auth/register`, `POST /auth/login`, `GET /auth/me`.
- Host: `GET|PATCH /tenants/:tenantSlug/host/listings[/:id]`, `GET|POST|DELETE /tenants/:tenantSlug/host/listings/:id/blocked-days`, `GET /tenants/:tenantSlug/host/bookings?listingId&status&from&to&page`.
- Admin: `GET|POST|PATCH|DELETE /admin/tenants[/:tenantId]`, `GET|POST|DELETE /admin/tenants/:tenantId/hosts[/:userId]`.
- Pagination: `{ items, page, pageSize, total }`. The error format is described in "Errors and logging".
- Slugs are validated as kebab-case; reserved words (`admin`, `api`, `login`, `register`) are rejected.

### Web

#### Frontend routes (React Router, pages in the browser)

`:tenantSlug` is the challenge's `{tenant-slug}`, i.e. the value of `Tenant.slug`, for example `adriatic`. The same parameter name is used on the frontend (`/:tenantSlug`) and the backend (`/api/v1/tenants/:tenantSlug`).

- Every tenant is a separate portal, so public and host pages live under its slug.
- "Challenge item" numbers the challenge's requirements in reading order: portal 1–4, accounts 5–6, host panel 7–9, admin panel 10–12.
- The admin panel belongs to no tenant and has its own `/admin` prefix; `admin` is a reserved slug, so it never collides with `/:tenantSlug`.

| Route (example)               | Who sees it             | What it shows                                                                                                                                                                                                                               | Challenge item | API calls                                                                                      |
| ----------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------- |
| `/`                           | everyone                | Demo landing: cards for every portal with a link                                                                                                                                                                                            | —              | `GET /tenants` (paths relative to `/api/v1`)                                                   |
| `/adriatic`                   | everyone                | **Portal home** (Booking-style, see "UI guidelines"): search bar, results, filters (city, guests, price range, date range) and pagination. Filters are in the URL. Filters in a drawer on phones, in a sidebar on desktop                   | 1, 3           | `GET /tenants/:tenantSlug`, `/tenants/:tenantSlug/cities`, `/tenants/:tenantSlug/listings?...` |
| `/adriatic/listings/:id`      | everyone                | **Listing detail:** data, price, rating ("New" when null) and an **availability calendar** for the next few months; taken days are struck through                                                                                           | 2, 4           | `GET /tenants/:tenantSlug/listings/:id`, `.../availability?from&to`                            |
| `/login`                      | signed out              | The one sign-in page for every portal and both panels ([D-065](decisions.md#d-065-one-global-sign-in-page)). Afterwards: back to `?redirect=`, otherwise superadmin → `/admin`, host → their host panel (a list when several), client → `/` | 5, 6           | `POST /auth/login`, `GET /auth/me`                                                             |
| `/register`                   | signed out              | Registration; always creates a client, then signs in                                                                                                                                                                                        | 5              | `POST /auth/register`, `POST /auth/login`                                                      |
| `/adriatic/host/listings`     | host of **this** tenant | Table of all tenant listings with search; a click opens the editor                                                                                                                                                                          | 7              | `GET /tenants/:tenantSlug/host/listings`                                                       |
| `/adriatic/host/listings/:id` | host                    | **Listing editor** (title, type, price, guests, bedrooms) + **the same calendar** in blocking mode (click or range). Bookings are visible but cannot be blocked                                                                             | 7, 8           | `GET/PATCH .../host/listings/:id`, `GET/POST/DELETE .../blocked-days`                          |
| `/adriatic/host/bookings`     | host                    | Bookings table: listing, dates, nights, guests, status, total. Filters by listing, status and date                                                                                                                                          | 9              | `GET /tenants/:tenantSlug/host/bookings?...`                                                   |
| `/admin/tenants`              | superadmin              | Tenants table; delete with confirmation (type the slug)                                                                                                                                                                                     | 10             | `GET/DELETE /admin/tenants`                                                                    |
| `/admin/tenants/new`          | superadmin              | New tenant form. Name and slug required; logo URL, primary colour and contact email optional                                                                                                                                                | 10, 11         | `POST /admin/tenants`                                                                          |
| `/admin/tenants/:id`          | superadmin              | Configuration editor + **Hosts** section: list, add (email, name, password), remove                                                                                                                                                         | 11, 12         | `GET/PATCH /admin/tenants/:id`, `GET/POST/DELETE .../hosts`                                    |

- **Route protection:** `RequireSuperadmin` and `RequireHost` (on `RequireRole`), pathless parents of the admin and host routes. Signed-out users go to `/login?redirect=<route>`; signed-in users without rights get a 403 page. The server still checks every call.
- **Layouts:** `PortalLayout` (header with the tenant's logo and colour, sign-in/out, "Host panel" link for hosts), `HostLayout` (Listings and Bookings tabs, a bottom nav on mobile), a separate `AdminLayout`.
- **Frontend routes vs API routes:** the routes above are browser pages; the backend is a separate layer under `/api/v1/...`. The `/adriatic` page calls `${VITE_API_BASE_URL}/tenants/adriatic/listings`. `baseApi.ts` takes `baseUrl` from the validated env module, so no URL is hardcoded.

#### UI guidelines (inspired by Booking.com)

The challenge says: _"Feel free to take UI inspiration from Airbnb or Booking. We are not looking for visual design; we are looking for something that can actually be used."_ Booking was chosen ([D-025](decisions.md#d-025-booking-style-layout-not-branding)).

- **Layout and UX patterns are borrowed, not the brand:** no Booking logo, name or exact colours. Colour comes from tokens and the tenant's `primaryColor`.
- These are guidelines, not a strict specification; details adapt to what is usable and fits the deadline.

**Results page** (`/:tenantSlug`):

- **Search bar on top** with the main filters: city, dates, guests and a "Search" button. On mobile it collapses into a summary strip ("Belgrade · 1–4 Oct · 2 guests") that opens the form.
- **Desktop:** a "Filter by" sidebar on the left (price range, property type as _Should_), the list on the right. **Mobile:** "Filters" and "Sort" buttons above the list open a drawer.
- "N stays found" and the sort dropdown sit above the list.
- **Result card**, horizontal on desktop and vertical on mobile: image; title, city, type, guests and bedrooms; rating badge; price; "See availability" call to action.
- **Image:** the data has no photos, so a placeholder with an icon per `propertyType` is shown ([D-024](decisions.md#d-024-placeholder-images-per-property-type)).
- **Price:** always "per night". With dates selected, the **stay total** is shown too ("3 nights · €360"), computed in cents (`nights × pricePerNightCents`).
- **Rating badge:** a square badge with the number and the review count, on the data's **5-point scale** (3.2–5.0), not converted to Booking's 10. `null` shows "New" ([D-023](decisions.md#d-023-null-rating-is-shown-as-new-and-sorted-last)).

**Listing detail** (`/:tenantSlug/listings/:id`): header with title, location and rating badge; key facts (type, guests, bedrooms, price); an availability calendar (two months side by side on desktop, one on mobile); when dates come from the search, "Available for your dates ✓/✗". There is no "Book" button — booking is not part of the challenge.

**Host and admin panels:** Booking's host panel is not public, so there is nothing to copy. Simple tables and forms from the same UI kit.

#### Zod validation on the frontend (schemas from `packages/shared`, the same as on the backend)

1. **Forms:** login, register, listing editor, tenant, host and day blocking use react-hook-form + `zodResolver(sharedSchema)`. Errors show in the `Field` component; nothing is sent until the form is valid.
2. **URL filters:** `useListingFilters` parses `searchParams` with `listingQuerySchema.safeParse(...)`, the same schema the API uses in `@Query({ schema })`. Invalid parameters (e.g. `guests=abc`, `to` before `from`) are dropped and the UI falls back to defaults.
3. **API boundary:** RTK endpoints get `argSchema` (input) and `responseSchema` (DTO schemas), so an unexpected backend shape is caught immediately.
   - `catchSchemaFailure` turns a validation failure into a normal RTK error, so the UI shows `ErrorState` instead of crashing.
   - `skipSchemaValidation: import.meta.env.PROD`: validation runs in development and tests and is skipped in production for performance ([D-021](decisions.md#d-021-one-set-of-zod-schemas-for-fe-and-be)).
4. **Env:** `VITE_*` variables are validated with zod at startup.
5. **Alignment with `contracts.ts`:** a type-level test (`expectTypeOf`) checks that `z.infer<typeof listingDtoSchema>` matches `ListingDto`, so the zod schema and the contract cannot drift apart.

- `app/store.ts`: `configureStore` with `baseApi.reducer`/middleware, `authSlice` (token persisted in localStorage) and `uiSlice` (filter drawer, toasts).
- `shared/api/baseApi.ts`: one `createApi`; features (`listingsApi`, `authApi`, `hostApi`, `adminApi`) use `injectEndpoints`. Invalidation through tags. Logout on 401.
- `shared/ui`: Button, Input, Select, Field, Card, Badge, Modal, Drawer, Pagination, Skeleton, EmptyState, ErrorState, DataTable, Toast. Every component has a variant map and uses tokens only.
- `features/listings`: SearchBar, ListingCard, ListingList, ListingFilters, RatingBadge, PriceSummary, **AvailabilityCalendar**. The calendar is one component with `getDayStatus(day)` and an optional `onSelectRange`, used by both the public view and host blocking.
- `styles/tokens.css`: `@theme` with semantic tokens (`--color-primary`, `surface`, `text`, `muted`, `border`, `danger`, `success`, radius, font). Mobile-first: base styles are for phones, `md:` and `lg:` extend them. Tenant branding overrides `--color-primary` at runtime on the portal layout root; this works because utility classes reference the CSS variable (except with `@theme inline`).

### Data: CSV → database → API

- **The CSV is the only data source, but the application never reads it at runtime** ([D-015](decisions.md#d-015-csv-is-loaded-once-by-a-typescript-seed)). The seed loads it into Postgres once; afterwards the API works only with the database.
  - Challenge: _"How you load the data into the database is your choice."_
  - `contracts.ts`: _"The CSV columns are snake_case, these types are camelCase. The mapping is part of the work."_
- By its own comment, `contracts.ts` is **neither a DB entity nor an API contract** — it describes the shape of the data. We use it as the **API response shape** (`ListingDto`, `BookingDto`), so the FE uses those types directly ([D-016](decisions.md#d-016-contractsts-is-the-api-response-shape)).
- There are three mappings, each in exactly one place:
  1. **CSV row → domain** (`apps/api/prisma/seed/mappers.ts`, unit-tested):
     - `csv-parse/sync` with `columns: true` yields objects with snake_case keys and **string values**;
     - `parseListingRow` and `parseBookingRow` convert types and validate each row with a zod schema from `shared`;
     - an invalid row stops the seed with a clear message.
  2. **Domain → database** (Prisma schema): camelCase fields in TypeScript, snake_case columns in Postgres through `@map`/`@@map` — declarative, no hand-written code. The seed adds `tenantId` through a country → tenant map, because the CSV has none.
  3. **Database → API** (`listing.mapper.ts`: `toListingDto`, `toBookingDto`):
     - `Date` (`@db.Date`) becomes an IsoDate string and `Decimal` becomes `number | null`;
     - `tenantId` is not exposed;
     - a type test checks the result is exactly `ListingDto`.

| CSV column                               | In the CSV      | In `ListingDto`                        | Conversion                             |
| ---------------------------------------- | --------------- | -------------------------------------- | -------------------------------------- |
| `id`, `title`, `city`, `country`         | string          | same name                              | none                                   |
| `latitude`, `longitude`                  | `"38.750054"`   | `number`                               | `Number()` + check it is a number      |
| `property_type`                          | `"apartment"`   | `propertyType`                         | enum check                             |
| `max_guests`, `bedrooms`, `review_count` | `"3"`           | `maxGuests`, `bedrooms`, `reviewCount` | integer (`Number.isInteger`)           |
| `price_per_night_cents`                  | `"12000"`       | `pricePerNightCents`                   | integer, **never a float**             |
| `currency`                               | `"EUR"`         | `currency`                             | literal `'EUR'`                        |
| `rating`                                 | `"4.2"` or `""` | `rating: number \| null`               | `""` → `null` (109 rows)               |
| `created_at`                             | `"2025-08-22"`  | `createdAt: IsoDate`                   | stays a string; `date` in the database |

Bookings map `listing_id → listingId`, `check_in → checkIn`, `check_out → checkOut`; `guests` becomes an integer and `status` is checked as an enum.

A TypeScript seed is used instead of Postgres `COPY` because `contracts.ts` explicitly makes the mapping part of the task. A tested mapper is visible in review, and 13.7 thousand rows load through batched `createMany` in seconds.

### Alignment with `contracts.ts`, item by item

Data checked with a script on 2026-09-24:

- every `listing_id` exists;
- no overlaps, even counting cancelled bookings;
- 100 listings have no booking at all;
- no booking starts on the previous booking's checkout day;
- **532 bookings are `confirmed` with checkout ≤ today**, and 200 `confirmed` bookings are in progress today.

| `contracts.ts` says                                                             | What the plan does                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Guarantee:** every `listing_id` exists                                        | FK `booking.listing_id → listing.id` with `ON DELETE CASCADE`. The seed inserts listings before bookings. No extra defence — the FK would stop the seed anyway if the guarantee broke                                                                                                                                                  |
| **Guarantee:** bookings never overlap, whatever the status                      | No defence in code. `EXCLUDE ... WHERE status <> 'cancelled'` stays a "Could" as protection for the future. The condition is weaker than the guarantee, so the data passes. Cancelled is excluded because it blocks nothing, so a new booking may overlap it                                                                           |
| **Guarantee:** bookings run from 2026-07-28 to 2027-04-24                       | "Today" is 2026-09-24, so part of the data is in the past. The public calendar and the filter offer no days before today (FE `min`, BE zod `from ≥ today()`). After 2027-04-24 everything is free, which is correct. Tests use dates relative to today, so they do not go stale                                                        |
| **Guarantee:** a fixed seed, the same rows for everyone                         | Our seed is deterministic: tenant by country, fixed hosts and credentials. Tests may assert exact counts (1000 / 12,757 / 363 / 428 / 209)                                                                                                                                                                                             |
| **Not in the data:** a listing has no owner                                     | A listing gets only `tenantId`. **A host manages all listings of their tenant** — the challenge says _"a host manages the listings and calendar of their tenant"_. Listings are split into tenants by region; hosts are assigned to tenants, not to listings ([D-005](decisions.md#d-005-a-host-manages-all-listings-of-their-tenant)) |
| **Not in the data:** a booking has no guest, only a head count                  | `Booking` has no `userId`. The host UI shows "N guests". Clients have no "my bookings" page because clients do not book (challenge: _Not needed: booking_)                                                                                                                                                                             |
| **Not in the data:** blocked days do not exist; no-overlap covers bookings only | `BlockedDay (listingId, day)` PK, one row per day. A day taken by an active booking → 409 `DAY_ALREADY_BOOKED`; a day under a **cancelled** booking may be blocked; blocking the same day again is idempotent (`skipDuplicates`)                                                                                                       |
| **Open:** schema, indexes, migrations                                           | Described in "Data model": Prisma schema, indexes and custom SQL. Every index exists for a concrete query: tenant, city and price filters, and `NOT EXISTS` by `(listing_id, check_in)`                                                                                                                                                |
| **Open:** API shape (routes, pagination, filtering, errors)                     | Described in "API" and "Errors and logging": `/api/v1`, `{ items, page, pageSize, total }`, query filters validated with zod, `apiErrorSchema`                                                                                                                                                                                         |
| **Open:** availability derived at read time or stored separately                | **Derived at read time** from bookings and blocked days, with no separate table ([D-009](decisions.md#d-009-availability-is-derived-at-read-time)). One source of truth, nothing to synchronise, and 12.7 thousand indexed rows are trivial. Scaling options (a per-day table or `daterange` + GiST) are discussed in the decision     |

**Other `contracts.ts` comments the plan covers:**

- **Statuses are stale relative to today.** They are not rewritten; the data is what it is. Availability treats `confirmed` and `completed` alike because both occupy the day. The host table shows the stored status plus a time badge derived from the dates and `today()` (past / in progress / upcoming) ([D-013](decisions.md#d-013-stale-booking-statuses-are-kept-as-is)).
- **`rating: null` is a real state.** The UI shows "New" and no stars; sorting by rating puts `null` last.
- **`bedrooms` is 0 for a studio.** The listing edit schema enforces it with `refine`: `propertyType === 'studio'` implies `bedrooms === 0`. `maxGuests` must be 1–12.
- **`guests` is 1 to the listing's `maxGuests`.** Lowering `maxGuests` below the guest count of an active booking returns 409 `MAX_GUESTS_BELOW_BOOKING`, so the invariant cannot break ([D-014](decisions.md#d-014-listing-edits-cannot-break-booking-invariants)).
- **Money is an integer in cents.** Forms take euros; the conversion to cents is one typed function in `shared`, covered by tests.
- **Currency is a display concern.** The tenant field `currency` has type `Currency` (only `'EUR'`), since there are no exchange rates.

#### Today's date (no separate service)

- One function `today(): IsoDate` in `packages/shared` (UTC date), used by the API and the web app ([D-012](decisions.md#d-012-dates-are-iso-strings-in-utc-with-one-today)).
- Used for: rejecting `from` in the past, preventing hosts from blocking past days, the past / in progress / upcoming badge, greying out past days in the calendar.
- **Tests use dates relative to today**, e.g. `addDays(today(), 10)`. e2e tests create their own fixture bookings and do not depend on CSV dates, so they pass whatever the day.
- Tests that use the full CSV assert only date-independent facts: row counts, mapping and the tenant split.

### Seed

`npm run db:seed` (Prisma 7 does not seed automatically):

1. The CSV directory comes from the env (`SEED_DATA_DIR`). The CSV is read and mapped with the mappers above.
2. Three tenants ([D-004](decisions.md#d-004-three-tenants-split-by-region)):
   - `adriatic` (RS/HR/SI): 363 listings
   - `central-europe` (DE/AT/CZ/HU/CH): 428
   - `west-europe` (ES/PT/NL): 209
3. Two hosts per tenant, one superadmin and one demo client. The demo password comes from the env (`SEED_DEMO_PASSWORD`).
4. Batched `createMany`.

The seed is idempotent. Credentials go into the README.

### Configuration: everything from `.env`, no hardcoded URLs

**Rule:** no URLs, hosts, ports, origins or secrets in code ([D-022](decisions.md#d-022-configuration-comes-only-from-validated-env)).

- Everything is read from the env and validated with zod at startup; if something is missing the app stops immediately with a clear error.
- `.env.example` is committed (no secrets); `.env*` is in `.gitignore`. Each `.env.example` is created by the feature that first needs it ([D-027](decisions.md#d-027-envexample-files-are-created-with-the-feature-that-needs-them)).
- The env is read in one place per app; the rest of the code receives ready values.

| Where                                          | Variables                                                                                                                                                                                                | How they are read                                                                                                                                                                                                                                                   |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **API** (`apps/api/.env`, `.env.test` for e2e) | `NODE_ENV`, `PORT`, `DATABASE_URL`, `CORS_ORIGIN`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `LOG_LEVEL`, `LOG_FORMAT` (`pretty`/`json`); seed only: `SEED_DATA_DIR`, `SEED_DEMO_PASSWORD` (its own schema, D-040) | `ConfigModule.forRoot({ isGlobal: true, envFilePath, validationSchema: envSchema })` (NestJS 12 accepts Standard Schema, i.e. zod). Values through `ConfigService.getOrThrow`. `main.ts` reads `PORT` and `CORS_ORIGIN`; `JwtModule.registerAsync` reads the secret |
| **Prisma CLI**                                 | `DATABASE_URL`                                                                                                                                                                                           | `prisma.config.ts` with `import "dotenv/config"` + `process.env.DATABASE_URL` (Prisma 7; [D-037](decisions.md#d-037-generating-the-prisma-client-needs-no-database))                                                                                                |
| **Web, client code** (`apps/web/.env`)         | `VITE_API_BASE_URL` (e.g. `/api/v1` behind a proxy, or a full URL)                                                                                                                                       | Only `VITE_*` variables reach `import.meta.env`. Validated with zod in `shared/config/env.ts`, the only module that reads the env; `baseApi` takes `baseUrl` from it                                                                                                |
| **Web, `vite.config.ts`**                      | `API_PROXY_TARGET`, `WEB_PORT`                                                                                                                                                                           | `loadEnv(mode, process.cwd(), '')` for the dev `server.proxy`. No `VITE_` prefix, so they never reach the bundle                                                                                                                                                    |
| **Docker** (root `.env`)                       | `POSTGRES_USER/PASSWORD/DB`, `API_PORT`, `WEB_PORT`, `API_UPSTREAM`, `JWT_SECRET`, …                                                                                                                     | Compose interpolation `${VAR:?missing}` fails when a value is missing. `VITE_API_BASE_URL` is a build arg for the web image                                                                                                                                         |
| **nginx** (web container)                      | `API_UPSTREAM`                                                                                                                                                                                           | The official nginx image runs `envsubst` over `/etc/nginx/templates/*.template` → `conf.d`. The template contains `proxy_pass ${API_UPSTREAM};`                                                                                                                     |

### Errors and logging

**Server: one error format for the whole API** ([D-019](decisions.md#d-019-one-error-format-for-the-whole-api)). The zod schema `apiErrorSchema` lives in `packages/shared`, so the FE parses errors with the same contract:

```json
{
  "statusCode": 409,
  "error": "Conflict",
  "code": "DAY_ALREADY_BOOKED",
  "message": "2026-10-02 is booked",
  "path": "/api/v1/tenants/adriatic/host/...",
  "timestamp": "…",
  "requestId": "…"
}
```

- **Domain errors** extend the built-in Nest exceptions and add a machine `code`, e.g. `DayAlreadyBookedError extends ConflictException` or `SlugTakenError`. Services throw exceptions and never return error objects. The underlying error goes into `cause`.
- **Filters**, registered through `APP_FILTER` in the documented order (catch-all first):
  1. `AllExceptionsFilter` (`@Catch()` + `HttpAdapterHost`):
     - an `HttpException` keeps its status and message — including 400s from the zod pipe with `message[]`;
     - everything else becomes a 500 with "Internal server error". **Stack traces and details never reach the client.**
  2. `PrismaExceptionFilter`: P2002 → 409, P2025 → 404, P2003 → 409. The exact import of the Prisma 7 error class from the generated client is verified in the docs at the start of feature 3.
  - Both filters build the body through one `buildErrorBody()` helper.
- `main.ts`: a failed bootstrap (including an invalid env) logs `logger.fatal` and exits with `process.exit(1)`.

**Server: basic logging** (built-in `ConsoleLogger`, no new dependencies, to stdout) ([D-020](decisions.md#d-020-logging-with-the-built-in-consolelogger)):

- `LOG_FORMAT=json` in Docker, pretty in development; `LOG_LEVEL` sets `logLevels`.
- **`RequestIdMiddleware`:** takes `x-request-id` from the request or generates `crypto.randomUUID()`; returns it in the response header, puts it in the error body and in every log line.
- **`RequestLoggerMiddleware`:** on `finish` logs `method path status durationMs requestId userId?` — 5xx as `error`, 4xx as `warn`, the rest as `log`.
- `AllExceptionsFilter` logs 5xx with the stack and the request id.
- Services (`new Logger(X.name)`) log business events: seed row counts per table, tenant created or deleted, host added, days blocked, failed sign-in (email only).
- **Never logged:** `password`, the `authorization` header, JWTs.

**Frontend: error boundaries on three levels + explicit API errors**

1. **Root route `ErrorBoundary`** (the docs say every app should have one): a full-page fallback with "Try again" and "Home". Handles `isRouteErrorResponse` (404 etc.), `Error` instances and unknown values. A `path: '*'` route shows a NotFound page.
2. **Layout boundaries** (`PortalLayout`, `HostLayout`, `AdminLayout`): an error takes down only the content; header and navigation stay.
3. **Widget `<ErrorBoundary fallback>`**: a small class with `getDerivedStateFromError` + `componentDidCatch` → `reportError`. React requires a class; this adds no dependency. It wraps risky widgets (`AvailabilityCalendar`, `DataTable`) so one failure does not take down the page.

- **What boundaries do not catch:** event handlers and async code. RTK errors are handled explicitly:
  - **`<QueryState>`** (reusable) shows Skeleton, `ErrorState` (message, request id, "Retry" → `refetch`), EmptyState or the content. Every page uses it.
  - **`rtkErrorMiddleware`** (`isRejectedWithValue`): 401 → logout + redirect to sign-in; 403 → "You don't have permission" toast; 5xx and network errors → toast with the request id.
  - **Forms:** 400 `message[]` is mapped to fields with `setError`; a known `code` (e.g. `SLUG_TAKEN`) becomes an error on the matching field.
  - **`getErrorMessage(error)`** in `shared/api/errors.ts` is the only place that narrows `FetchBaseQueryError | SerializedError` and parses `error.data` with `apiErrorSchema`.
- **Client logging:** `createRoot(root, { onUncaughtError, onCaughtError, onRecoverableError })` calls `reportError()` from `shared/lib/logger.ts` — with `componentStack` in development, `console.error` in production. The single hook point for Sentry later.

**Not env:** the `api` prefix and the `v1` version are part of the API contract, not of the environment. A new version requires code, so both are constants in one file (`api.constants.ts`). The frontend does not duplicate them; it receives the full `VITE_API_BASE_URL`.

## Engineering invariants

- Money is always integer cents.
- Dates are IsoDate strings; stays are half-open `[)`.
- A cancelled booking blocks nothing.
- Every query is tenant-scoped.
- Roles are not in the token.
- Every route is under `/api/v1` (health excepted).
- The tenant parameter is always named `tenantSlug`, on the FE and the BE.
- Every input is validated with a zod schema from `packages/shared`, on the FE and the BE.
- No hardcoded URLs, ports or secrets; a new variable goes into `.env.example` immediately.
- Errors are thrown as Nest/domain exceptions with a `code`; clients receive only the `apiErrorSchema` format, never a stack.
- Passwords, tokens and the `authorization` header are never logged.
- On the FE, API errors go through `QueryState` / `getErrorMessage`; render errors are caught by boundaries.

## Documentation and progress tracking

All documentation is in English, in `docs/`:

```
docs/
  README.md                 index
  challenge/                the original task (PDF + full_stack_challenge.md) — the only source of requirements
  implementation-plan.md    this plan
  architecture.md           monorepo, modules, CSV → DB → API → UI, auth, tenant isolation, errors and logging
  decisions.md              numbered decisions and assumptions (D-001, D-002, …): context, decision, consequences
  progress.md               the living progress tracker
  features/NN-<name>.md     one log per feature
```

- `progress.md`: last updated, current feature and step, next step, what is blocked / waiting, open questions; a table of all 15 features (number, feature, branch, status, PR, done date) with the statuses `not started`, `in progress`, `done – awaiting commit`, `committed`, `PR merged`; the step checklist of the current feature.
- `features/NN-<name>.md`: goal and scope with references to the challenge, what was done, key files, decisions, how it was verified (commands and results), what was deliberately left out, the commit message used.
- Update protocol: at the start of a feature the status becomes `in progress` with a checklist; after each finished step the checklist and current/next step are updated; at the end the status becomes `done – awaiting commit` with the feature log and decisions complete; after the commit and PR, `committed`; after the merge, `PR merged` with the commit message and PR number recorded in the feature log. Only then does the next feature start.

## Feature order (one feature = one branch = one PR)

**Cycle of every feature:**

1. Restate the scope and verify the library APIs to be used in their official documentation; `progress.md` → `in progress` + checklist; open `features/NN-*.md`.
2. Implement together with tests; update `progress.md` after every step.
3. Lint, typecheck, tests and a review of the diff against the invariants.
4. Finish the feature log and `decisions.md`; status `done – awaiting commit`.
5. Report, commit message, PR title and description.
6. After the commit and PR, status `committed`; after the PR is merged into `main`, status `PR merged`. **A feature never starts before the previous one is merged.**

| #   | Feature (branch)         | Scope                                                                                                                                                                                                                                                                                                                                                          | Done when                                                                                                                                              |
| --- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `chore/repo-setup`       | npm workspaces, `.nvmrc` (24), `.gitignore` (`.env*` except `!.env.example`), Prettier, `data/` (CSVs), `docs/challenge/` (PDF + `full_stack_challenge.md`), `packages/shared` skeleton (`contracts.ts`, `today`/`addDays`, `eurosToCents`), `docs/` skeleton, root `README.md`                                                                                | `npm test -w packages/shared` is green; `progress.md` shows feature 1 as `done – awaiting commit`; the repository is initialised with the first commit |
| 2   | `feat/api-bootstrap`     | `npx @nestjs/cli@12 new` (ESM, npm), validated `ConfigModule` (zod), `ConsoleLogger`, `RequestId` and `RequestLogger` middleware, `AllExceptionsFilter` + `apiErrorSchema`, `/api/v1` versioning, `/api/health`, `apps/api/.env.example`, `docker-compose.yml` with `postgres:18` + a `booking_test` database, root `.env.example` with the Postgres variables | health returns 200; an unversioned route returns 404 in the `apiErrorSchema` format; the API does not start without the required env; tests are green  |
| 3   | `feat/db-schema`         | Prisma 7 + `@prisma/adapter-pg`, `prisma.config.ts`, models, migrations + custom SQL (CHECK), `PrismaService`, `PrismaExceptionFilter`                                                                                                                                                                                                                         | `migrate dev` succeeds on an empty database; filter tests are green                                                                                    |
| 4   | `feat/db-seed`           | `csv-parse`, mappers + zod, tenants, hosts and users, `createMany`                                                                                                                                                                                                                                                                                             | the database has 3 / 1000 / 12,757 rows; mapper tests are green                                                                                        |
| 5   | `feat/api-auth`          | register, login and `me`, bcrypt, JWT, `AuthGuard` + `@Public`, `TenantGuard` + `@CurrentTenant`, `PermissionsGuard` + `ROLE_PERMISSIONS`                                                                                                                                                                                                                      | permission unit tests and 401/403 e2e tests are green                                                                                                  |
| 6   | `feat/api-portal`        | public tenant, cities, listing list (filters, pagination, sort), detail, availability                                                                                                                                                                                                                                                                          | e2e: availability edge cases and tenant isolation                                                                                                      |
| 7   | `feat/api-host`          | listing edits, blocked days, bookings                                                                                                                                                                                                                                                                                                                          | e2e: 409 codes, host A vs tenant B, idempotent blocking                                                                                                |
| 8   | `feat/api-admin`         | tenant CRUD, hosts                                                                                                                                                                                                                                                                                                                                             | e2e: a new tenant's portal works, `SLUG_TAKEN`, reserved slug                                                                                          |
| 9   | `feat/web-bootstrap`     | Vite + Tailwind 4, tokens, env module, `apps/web/.env.example`, store + baseApi + error middleware, router + error boundaries, base UI kit (`Button`, `Input`, `Field`, `Card`, `Badge`, `QueryState`, `ErrorState`, `Toast`, `ErrorBoundary`), layouts                                                                                                        | the app starts and NotFound works; tests are green                                                                                                     |
| 10  | `feat/web-portal`        | SearchBar, list and card, filters in the URL, pagination, sort, detail + `AvailabilityCalendar`, tenant branding                                                                                                                                                                                                                                               | manual scenario at 375 px and on desktop; Testing Library tests are green                                                                              |
| 10a | `refactor/tenant-routes` | tenant routes moved from `/t/:tenantSlug` to `/tenants/:tenantSlug` (D-064), a change of plan                                                                                                                                                                                                                                                                  | all checks and e2e tests are green                                                                                                                     |
| 11  | `feat/web-auth`          | login and register, auth slice, `RequireRole`, 401 handling                                                                                                                                                                                                                                                                                                    | redirect and logout tests                                                                                                                              |
| 12  | `feat/web-host`          | listings table, edit form, day blocking, bookings table                                                                                                                                                                                                                                                                                                        | manual host scenario; tests are green                                                                                                                  |
| 13  | `feat/web-admin`         | tenant table, form and deletion, hosts panel                                                                                                                                                                                                                                                                                                                   | manual admin scenario; tests are green                                                                                                                 |
| 14  | `chore/docker`           | api Dockerfile (`node:24-slim`; `migrate deploy` → seed → start) and web (nginx `default.conf.template`, `VITE_API_BASE_URL` as a build arg), full compose with a root `.env` and `.env.example`                                                                                                                                                               | `cp .env.example .env && docker compose up --build` works on a clean clone                                                                             |
| 14a | `feat/password-toggle`   | a show/hide button on every password field (D-073), a change of plan                                                                                                                                                                                                                                                                                           | web tests, lint and typecheck are green                                                                                                                |
| 15  | `docs/final-pass`        | final documentation check: README (setup, credentials, commands), `architecture.md` and `decisions.md` match the code, "what's left / what I'd do next"                                                                                                                                                                                                        | final review; `progress.md` shows all 15 as `committed`                                                                                                |

**Indicative pace** (the order is fixed, the days are not): day 1 features 1–4, day 2 5–8, day 3 9–13, day 4 14–15 plus buffer.

**Cut line** if running late:

- Must: challenge items 1–12 + isolation + tests.
- Should: branding, sort, booking filters.
- Could: exclusion constraint, Playwright smoke test, row-level security.

## Verification

- `docker compose up -d db && npm run db:migrate && npm run db:seed`; a query returns 3 / 1000 / 12,757 rows.
- `npm run test -w apps/api` (unit), `npm run test:e2e -w apps/api` (against `booking_test`), `npm run test -w apps/web`, `npm run test -w packages/shared`, `npm run lint && npm run typecheck`.
- Key e2e cases:
  - for a fixture booking D+10 → D+13 (D = `today()`), D+13 → D+15 is free and D+12 → D+14 is taken — the CSV has no back-to-back bookings, so a fixture covers it;
  - a cancelled booking blocks nothing, and a day under a cancelled booking may be blocked;
  - a blocked day blocks; blocking the same day again is idempotent;
  - `maxGuests` below an active booking's guests → 409; a studio with `bedrooms > 0` → 400;
  - `from` = `addDays(today(), -1)` → 400;
  - tenant A's listing requested through `/tenants/B/...` → 404;
  - host A on `/tenants/B/host/*` → 403;
  - a client on host routes → 403, anonymous → 401;
  - a new tenant created in the admin panel has a working portal immediately;
  - every e2e call goes to `/api/v1/...`; the unversioned `/api/listings` → 404, `/api/health` → 200.
- Errors and logging (BE):
  - an unknown route → 404 in the `apiErrorSchema` format with an `x-request-id` header;
  - a duplicate slug → 409 `SLUG_TAKEN`;
  - blocking a taken day → 409 `DAY_ALREADY_BOOKED`;
  - filter unit test: a generic `Error` becomes a 500 without a stack in the body, and `logger.error` is called with the request id;
  - `PrismaExceptionFilter` maps P2002, P2025 and P2003.
- Errors (FE):
  - `ErrorBoundary` shows the fallback when a child throws and calls `reportError`;
  - the root boundary shows NotFound for 404;
  - `getErrorMessage` parses `ApiError`;
  - on 401 the middleware dispatches logout;
  - the form shows `SLUG_TAKEN` on the slug field.
- Manual: stop the API container with the web app open — `ErrorState` with "Retry" appears, no white screen.
- Seed and mapper tests: a real `listings.csv` row with an empty `rating` gives `rating: null`; the price is an integer; an unknown `property_type` throws; `toListingDto` returns an IsoDate string, not a `Date`.
- Env tests: the API does not start without `JWT_SECRET` or `DATABASE_URL` (a clear zod error); `grep -rE "https?://|localhost:[0-9]" apps/*/src packages/*/src` finds nothing.
- Web zod tests: a form sends no request while the input is invalid; `useListingFilters` drops `guests=abc`; a `responseSchema` mismatch produces `ErrorState`.
- Manual in the browser, at 375 px and on desktop:
  - portal → filters → detail → calendar;
  - host sign-in → change a price → block a day → the day is taken in the public calendar;
  - admin sign-in → new tenant → add a host → host sign-in.
- Finally: `docker compose up --build` on a clean clone.
