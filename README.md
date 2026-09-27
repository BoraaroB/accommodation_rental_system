# Accommodation Rental System

A multi-tenant portal for renting out places to stay. Every tenant gets its own public portal at `/{tenant-slug}` where clients search and view listings; hosts manage their tenant's listings and calendars, and a superadmin creates and configures tenants.

The stack is NestJS, React, PostgreSQL and Docker. The original task is in [docs/challenge/](docs/challenge/full_stack_challenge.md).

> **Status:** in development, built feature by feature — see [docs/progress.md](docs/progress.md). Instructions for running the API, the web app and Docker, and the demo credentials, are added with the features that introduce them.

## Requirements

- Node.js 24 (≥ 24.15) — `nvm use` picks the version from [.nvmrc](.nvmrc)
- npm (bundled with Node.js)
- Docker with Compose (for the database)

## Getting started

```bash
nvm use
npm install        # also builds packages/shared and generates the Prisma client
npm test
```

### Database

```bash
cp .env.example .env                      # Postgres credentials and host port for Docker Compose
docker compose up -d db                   # PostgreSQL 18 with the databases `booking` and `booking_test`
cp apps/api/.env.example apps/api/.env    # API settings; DATABASE_URL matches the root example
npm run db:migrate                        # create the tables (Prisma migrations)
npm run db:seed                           # load data/*.csv: 3 tenants, 1,000 listings, 12,757 bookings
```

`booking_test` is created by [docker/postgres/initdb](docker/postgres/initdb/) on the first start, when the data volume is empty.

The seed can be run again at any time: it only inserts rows that are missing and never overwrites or deletes data. Listings go to a tenant by country:

| Tenant (`/{tenant-slug}`) | Countries          | Listings |
| ------------------------- | ------------------ | -------- |
| `adriatic`                | RS, HR, SI         | 363      |
| `central-europe`          | DE, AT, CZ, HU, CH | 428      |
| `west-europe`             | ES, PT, NL         | 209      |

### Demo accounts

Every seeded account signs in with the password set in `SEED_DEMO_PASSWORD` (`apps/api/.env`).

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

The public portal needs no sign-in: `GET /api/v1/tenants` lists the portals, and `GET /api/v1/t/adriatic/listings?city=Zagreb&guests=2&from=YYYY-MM-DD&to=YYYY-MM-DD&sort=price_asc` searches one of them. The routes are listed in [architecture.md](docs/architecture.md#api-modules).

The host panel needs a host's token for that tenant (or the superadmin's): `GET /api/v1/t/adriatic/host/listings?q=split` searches the listings, `PATCH /api/v1/t/adriatic/host/listings/:id` edits one, `POST /api/v1/t/adriatic/host/listings/:id/blocked-days` with `{ "from", "to" }` blocks the days of `[from, to)` and `GET /api/v1/t/adriatic/host/bookings?status=confirmed` lists the bookings.

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
docker/           Docker support files (database init scripts)
docs/             plan, architecture, decisions, progress and feature logs
docker-compose.yml  local infrastructure (the database; the full stack in feature 14)
```

## Documentation

- [Implementation plan](docs/implementation-plan.md)
- [Architecture](docs/architecture.md)
- [Decisions and assumptions](docs/decisions.md)
- [Progress](docs/progress.md)
