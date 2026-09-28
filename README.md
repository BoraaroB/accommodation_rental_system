# Accommodation Rental System

A multi-tenant portal for renting out places to stay. Every tenant gets its own public portal at `/{tenant-slug}` where clients search and view listings; hosts manage their tenant's listings and calendars, and a superadmin creates and configures tenants.

The stack is NestJS, React, PostgreSQL and Docker. The original task is in [docs/challenge/](docs/challenge/full_stack_challenge.md).

> **Status:** every feature of the [plan](docs/implementation-plan.md) is built, one branch and one pull request each ([progress](docs/progress.md)). What was left out and what would come next is at the end: [What's left and what would come next](#whats-left-and-what-would-come-next).

## Requirements

- Node.js 24 (≥ 24.15) — `nvm use` picks the version from [.nvmrc](.nvmrc)
- npm (bundled with Node.js)
- Docker Engine 25 or later with Docker Compose v2 (the database, or the whole stack)

## Run with Docker

The whole stack — PostgreSQL, the API and the web app — needs only Docker:

```bash
cp .env.example .env
docker compose up --build
```

Then open http://localhost:8080 (`WEB_PORT`) and sign in with a [demo account](#demo-accounts); the example's `SEED_DEMO_PASSWORD` is `change-me-demo`. The API also answers on http://localhost:3000/api/health (`API_PORT`).

The services start in order: `db`, then `migrate` (applies the migrations, loads `data/*.csv` and exits), then `api` once `migrate` has succeeded, then `web` once the API is healthy — nginx serving the built app and forwarding `/api` to the API ([D-071](docs/decisions.md#d-071-docker-compose-runs-the-stack-with-migrations-as-a-one-off-job)). Every port is published on `127.0.0.1` only. If a port is taken, change it in `.env`: with `WEB_PORT` also `CORS_ORIGIN`, with `API_PORT` also `API_UPSTREAM`.

The `JWT_SECRET` in `.env.example` is for running locally only; anywhere else set a random one, e.g. `openssl rand -base64 48` ([D-072](docs/decisions.md#d-072-the-root-envexample-holds-a-local-only-jwt-secret)). `migrate` runs on every `up` and the seed inserts only missing rows, so a seeded tenant deleted in the admin panel comes back with its data, a removed seeded host gets the membership back, and a seeded tenant whose slug was changed gets an empty twin with the old slug; `docker compose down -v` deletes the database and starts again from the CSV. `docker compose down` stops the stack and keeps the data. A database seeded before bookings stored their totals ([D-074](docs/decisions.md#d-074-a-booking-stores-its-total)) cannot be migrated and has to be recreated with `docker compose down -v`.

## Getting started

```bash
nvm use
npm install        # also builds packages/shared and generates the Prisma client
npm test
```

### Database

```bash
cp .env.example .env                      # Docker Compose settings, including the Postgres credentials and port
docker compose up -d db                   # PostgreSQL 18 with the databases `booking` and `booking_test`
cp apps/api/.env.example apps/api/.env    # API settings; DATABASE_URL matches the root example
npm run db:migrate                        # create the tables (Prisma migrations)
npm run db:seed                           # load data/*.csv: 3 tenants, 1,000 listings, 12,757 bookings
```

`booking_test` is created by [docker/postgres/initdb](docker/postgres/initdb/) on the first start, when the data volume is empty. Compose checks every variable of the root `.env`, also when it starts only `db`, so a root `.env` copied from an older example needs the new variables.

The seed can be run again at any time: it only inserts rows that are missing and never overwrites or deletes data. Listings go to a tenant by country:

| Tenant (`/{tenant-slug}`) | Countries          | Listings |
| ------------------------- | ------------------ | -------- |
| `adriatic`                | RS, HR, SI         | 363      |
| `central-europe`          | DE, AT, CZ, HU, CH | 428      |
| `west-europe`             | ES, PT, NL         | 209      |

### Demo accounts

Every seeded account signs in with the password set in `SEED_DEMO_PASSWORD` (`apps/api/.env`, or the root `.env` in Docker).

| Role       | E-mail                                                                                                   |
| ---------- | -------------------------------------------------------------------------------------------------------- |
| Superadmin | `admin@example.com`                                                                                      |
| Host       | `host1.<tenant-slug>@example.com`, `host2.<tenant-slug>@example.com` (e.g. `host1.adriatic@example.com`) |
| Client     | `client@example.com`                                                                                     |

### API

```bash
npm run start:dev -w apps/api     # http://localhost:3000/api/health
```

Every variable in `apps/api/.env.example` is required; the API refuses to start and names the missing or invalid variable. Set `JWT_SECRET` in `apps/api/.env` (and `.env.test`) to at least 32 random characters, e.g. `openssl rand -base64 48`; the short placeholder is rejected. At startup the API waits up to 10 seconds for the database, then stops. All routes are under `/api/v1`; only `/api/health` is unversioned.

Sign in with a demo account: `POST /api/v1/auth/login` with `{ "email", "password" }` returns `{ "accessToken" }`, sent as `Authorization: Bearer <token>`. `GET /api/v1/auth/me` returns the user and the tenants they host. `POST /api/v1/auth/register` creates a client. The token holds only the user's id and e-mail; what the user may do in a tenant is worked out on every request ([D-007](docs/decisions.md#d-007-roles-are-not-in-the-token)).

The public portal needs no sign-in: `GET /api/v1/tenants` lists the portals, and `GET /api/v1/tenants/adriatic/listings?city=Zagreb&guests=2&from=YYYY-MM-DD&to=YYYY-MM-DD&sort=price_asc` searches one of them. The routes are listed in [architecture.md](docs/architecture.md#api-modules).

The host panel needs a host's token for that tenant (or the superadmin's): `GET /api/v1/tenants/adriatic/host/listings?q=split` searches the listings, `PATCH /api/v1/tenants/adriatic/host/listings/:id` edits one, `POST /api/v1/tenants/adriatic/host/listings/:id/blocked-days` with `{ "from", "to" }` blocks the days of `[from, to)` and `GET /api/v1/tenants/adriatic/host/bookings?status=confirmed` lists the bookings.

The admin panel needs the superadmin's token: `POST /api/v1/admin/tenants` with `{ "slug", "name" }` (and optionally `logoUrl`, `primaryColor`, `contactEmail`) creates a tenant whose portal works at once, `PATCH /api/v1/admin/tenants/:tenantId` changes the fields it is sent, and `POST /api/v1/admin/tenants/:tenantId/hosts` with `{ "email", "name", "password" }` adds a host — an existing account keeps its password (`accountCreated: false`).

The e2e tests read `apps/api/.env.test` instead of `.env`:

```bash
cp apps/api/.env.example apps/api/.env.test   # then set the database in DATABASE_URL to booking_test
npm run test:e2e -w apps/api
```

The e2e setup applies the migrations to that database and refuses to run against a database whose name does not end in `_test`. `LOG_LEVEL=fatal` in `.env.test` keeps the test output quiet.

### Web app

```bash
cp apps/web/.env.example apps/web/.env
npm run dev -w apps/web           # http://localhost:5173, with the API running
```

Open `/` for the list of portals, then a portal such as `/adriatic`: search by city, dates and guests, filter by price, sort, and open a listing to see its availability calendar. Filters live in the URL, so a filtered page can be shared or bookmarked.

One sign-in page serves every portal and both panels: `/login` (and `/register`, which creates a client account). "Sign in" in a portal's header returns to that page afterwards; otherwise a superadmin goes to `/admin`, a host to their portal's host panel (`/adriatic/host`) and a client to `/`. The host panel is open to the tenant's hosts and the superadmin, the admin panel to the superadmin; a signed-out visitor is sent to sign in and back ([D-065](docs/decisions.md#d-065-one-global-sign-in-page)).

In the host panel (sign in as `host1.adriatic@example.com`), Listings searches the tenant's listings by title or city and opens one in the editor: change its title, type, price, guests or bedrooms, and block or unblock days in its calendar (select a day, or a first and a last day). Bookings lists the tenant's bookings, filtered by listing, status and dates.

In the admin panel (sign in as `admin@example.com`), Tenants lists every tenant: create one with "New tenant" (name and slug; logo URL, primary colour and contact e-mail are optional), open one to change its configuration and add or remove its hosts, or delete one by typing its slug to confirm. A host added with an e-mail that already has an account keeps that account's name and password.

The dev server forwards `/api` to `API_PROXY_TARGET` (the API started above), so the browser calls the API on the web app's own origin. Every variable in `apps/web/.env.example` is required: the app checks `VITE_API_BASE_URL` when it loads, and the dev server checks `WEB_PORT` and `API_PROXY_TARGET` when it starts.

## Commands

Run from the repository root. `test`, `lint`, `typecheck` and `build` run in every workspace that defines the script, `packages/shared` first; `test` and `typecheck` rebuild `packages/shared` before they start. Formatting covers the whole repository.

| Command                                   | What it does                            |
| ----------------------------------------- | --------------------------------------- |
| `npm test`                                | Unit tests (Vitest)                     |
| `npm run lint`                            | Lint (oxlint)                           |
| `npm run typecheck`                       | Type check (`tsc --noEmit`)             |
| `npm run build`                           | Build                                   |
| `npm run format` / `npm run format:check` | Format with Prettier / check formatting |
| `npm test -w packages/shared`             | Run a script in a single workspace      |
| `npm run start:dev -w apps/api`           | Start the API in watch mode             |
| `npm run dev -w apps/web`                 | Start the web app's dev server          |
| `npm run test:e2e -w apps/api`            | API end-to-end tests                    |
| `npm run db:migrate`                      | Apply and create Prisma migrations      |
| `npm run db:seed`                         | Load the CSV data and demo accounts     |

## Repository structure

```
apps/api          NestJS API
apps/web          React web app
packages/shared   @ars/shared — data contracts and shared utilities
data/             listings.csv and bookings.csv, loaded into the database by the seed
docker/           Docker support files (database init scripts, the nginx template)
docs/             plan, architecture, decisions, progress and feature logs
docker-compose.yml  the whole stack: database, migration job, API and web app
```

## What's left and what would come next

### Left out on purpose

- **Booking, payment, maps and deployment** — "Not needed" in the challenge. Bookings come only from `bookings.csv` and the host only views them; they are not linked to user accounts ([D-032](docs/decisions.md#d-032-bookings-are-not-linked-to-users)).
- **Simple auth**, as the challenge asks: one access token, no refresh tokens, revocation, SSO or 2FA ([D-042](docs/decisions.md#d-042-access-tokens-registration-and-sign-in)).
- **One currency:** EUR is the only value of the currency type, so the admin panel does not offer it ([D-052](docs/decisions.md#d-052-tenant-configuration-is-edited-as-a-merge-patch)).
- **Booking statuses as stored:** a past stay still marked `confirmed` is not rewritten; the host table adds a past / in progress / upcoming badge instead ([D-013](docs/decisions.md#d-013-stale-booking-statuses-are-kept-as-is)).

### Not done from the plan

Everything in the plan's "Must" and "Should" is built. Of its "Could" items, the exclusion constraint against overlapping active bookings is in the database ([D-036](docs/decisions.md#d-036-the-database-enforces-the-contracts-value-rules)); a browser smoke test (Playwright) and row-level security are not.

### Known limitations

- `docker compose up` runs the seed every time, and the seed inserts the rows that are missing: a seeded tenant deleted in the admin panel comes back with its data, a removed seeded host gets the membership back, and a seeded tenant whose slug was changed gets an empty twin with the old slug ([D-071](docs/decisions.md#d-071-docker-compose-runs-the-stack-with-migrations-as-a-one-off-job)).
- A host the superadmin creates signs in with the password the superadmin typed; there is no invitation and no forced change ([D-053](docs/decisions.md#d-053-adding-a-host-reuses-an-existing-account-without-changing-it)).
- Signing in or out applies to the browser tab it happens in; other open tabs follow after a reload.
- Text on a tenant's primary colour is always light, so a very light brand colour is hard to read.
- Deleting a tenant is final: it cascades to its listings, bookings, blocked days and host memberships; user accounts stay ([D-029](docs/decisions.md#d-029-deleting-a-tenant-cascades-users-stay)).

### What would come next

Recorded by the features, not built: each is listed in the linked feature log (the Playwright test in the plan), and most have a `Possible improvement (not in the plan)` comment where they would go in the code.

- **Security:** security headers (`helmet`) in the API; rate limiting and account lockout for sign-in and registration; refresh tokens and revocation; an invitation or a forced password change for new hosts; an audit log of admin actions and `created_at` on users and blocked days; row-level security as a second line of tenant isolation ([D-006](docs/decisions.md#d-006-tenant-isolation-in-the-application-layer)); rate limiting on the public routes; in Docker, nginx without root, a Content-Security-Policy, TLS and base images pinned by digest (features [2](docs/features/02-api-bootstrap.md#possible-improvements-not-in-the-plan), [3](docs/features/03-db-schema.md#possible-improvements-not-in-the-plan), [5](docs/features/05-api-auth.md#possible-improvements-not-in-the-plan), [6](docs/features/06-api-portal.md#possible-improvements-not-in-the-plan), [8](docs/features/08-api-admin.md#possible-improvements-not-in-the-plan), [14](docs/features/14-docker.md#possible-improvements-not-in-the-plan)).
- **Scale:** cache the slug → tenant lookup that every tenant route runs; `Cache-Control` / ETag on the public lookups; keyset pagination with matching indexes and a `pg_trgm` index for the host search; pagination of the portal list and the admin lists; lazy-loaded routes, so the first visit downloads less; in nginx, long-lived cache headers for `/assets/`, a 404 for a missing asset, and gzip (features [5](docs/features/05-api-auth.md#possible-improvements-not-in-the-plan), [6](docs/features/06-api-portal.md#possible-improvements-not-in-the-plan), [7](docs/features/07-api-host.md#possible-improvements-not-in-the-plan), [8](docs/features/08-api-admin.md#possible-improvements-not-in-the-plan), [10](docs/features/10-web-portal.md#possible-improvements-not-in-the-plan), [14](docs/features/14-docker.md#possible-improvements-not-in-the-plan)).
- **Robustness:** a database readiness check next to `/api/health` and 503 when the database is unreachable; limits on the span of the availability range and on the length of titles, tenant names and logo URLs; a startup check that every handler with `@RequirePermissions` is behind `PermissionsGuard`; response schema mismatches sent to `reportError`; a seed that runs only on an empty database; a JSON 404 for paths outside `/api` (features [2](docs/features/02-api-bootstrap.md#possible-improvements-not-in-the-plan), [3](docs/features/03-db-schema.md#possible-improvements-not-in-the-plan), [5](docs/features/05-api-auth.md#possible-improvements-not-in-the-plan), [6](docs/features/06-api-portal.md#possible-improvements-not-in-the-plan), [7](docs/features/07-api-host.md#possible-improvements-not-in-the-plan), [8](docs/features/08-api-admin.md#possible-improvements-not-in-the-plan), [9](docs/features/09-web-bootstrap.md#possible-improvements-not-in-the-plan), [14](docs/features/14-docker.md#possible-improvements-not-in-the-plan)).
- **Product and UI:** a sort for the host bookings table; sign-in shared across tabs; the portal's branding on the sign-in page when a portal sent the visitor there; text colour chosen by the brand colour's contrast; a dark theme; a soft delete with a period in which a tenant can be restored; hiding a shown password again when its form is sent (features [10](docs/features/10-web-portal.md#possible-improvements-not-in-the-plan), [11](docs/features/11-web-auth.md#possible-improvements-not-in-the-plan), [12](docs/features/12-web-host.md#possible-improvements-not-in-the-plan), [13](docs/features/13-web-admin.md#possible-improvements-not-in-the-plan), [14a](docs/features/14a-password-toggle.md#possible-improvements-not-in-the-plan)).
- **Smaller fixes:** the portal's search forms follow the URL without remounting, so the focus stays; the calendar's day components are defined once, so a render cannot lose a click; a blocked range's answer is written into the cache instead of refetched; the admin pages react to a tenant deleted elsewhere, and a superadmin who hosts a tenant sees its new slug in the account menu without a reload (features [12](docs/features/12-web-host.md#possible-improvements-not-in-the-plan), [13](docs/features/13-web-admin.md#possible-improvements-not-in-the-plan)).
- **Tests:** a Playwright smoke test of the portal, host and admin scenarios (a "Could" of the [plan](docs/implementation-plan.md#feature-order-one-feature--one-branch--one-pr)); the unit tests run under a fixed non-UTC time zone ([feature 1](docs/features/01-repo-setup.md#deliberately-left-out)).

## Documentation

- [Implementation plan](docs/implementation-plan.md)
- [Architecture](docs/architecture.md)
- [Decisions and assumptions](docs/decisions.md)
- [Progress](docs/progress.md)
