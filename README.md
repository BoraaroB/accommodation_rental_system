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
npm install        # also builds packages/shared, which the apps import from dist/
npm test
```

### Database

```bash
cp .env.example .env       # Postgres credentials and host port for Docker Compose
docker compose up -d db    # PostgreSQL 18 with the databases `booking` and `booking_test`
```

`booking_test` is created by [docker/postgres/initdb](docker/postgres/initdb/) on the first start, when the data volume is empty.

### API

```bash
cp apps/api/.env.example apps/api/.env
npm run start:dev -w apps/api     # http://localhost:3000/api/health
```

Every variable in `apps/api/.env.example` is required; the API refuses to start and names the missing or invalid variable. All routes are under `/api/v1`; only `/api/health` is unversioned.

The e2e tests read `apps/api/.env.test` instead of `.env`:

```bash
cp apps/api/.env.example apps/api/.env.test   # LOG_LEVEL=fatal keeps the test output quiet
npm run test:e2e -w apps/api
```

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
| `npm run test:e2e -w apps/api`            | API end-to-end tests                    |

## Repository structure

```
apps/api          NestJS API
apps/web          React web app (added in feature 9)
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
