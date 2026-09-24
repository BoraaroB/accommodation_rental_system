# Accommodation Rental System

A multi-tenant portal for renting out places to stay. Every tenant gets its own public portal at `/{tenant-slug}` where clients search and view listings; hosts manage their tenant's listings and calendars, and a superadmin creates and configures tenants.

The stack is NestJS, React, PostgreSQL and Docker. The original task is in [docs/challenge/](docs/challenge/full_stack_challenge.md).

> **Status:** in development, built feature by feature — see [docs/progress.md](docs/progress.md). Instructions for running the API, the web app and Docker, and the demo credentials, are added with the features that introduce them.

## Requirements

- Node.js 24 (≥ 24.15) — `nvm use` picks the version from [.nvmrc](.nvmrc)
- npm (bundled with Node.js)

## Getting started

```bash
nvm use
npm install
npm test
```

## Commands

Run from the repository root. `test`, `lint`, `typecheck` and `build` run in every workspace that defines the script; formatting covers the whole repository.

| Command                                   | What it does                            |
| ----------------------------------------- | --------------------------------------- |
| `npm test`                                | Unit tests (Vitest)                     |
| `npm run lint`                            | Lint (oxlint)                           |
| `npm run typecheck`                       | Type check (`tsc --noEmit`)             |
| `npm run build`                           | Build                                   |
| `npm run format` / `npm run format:check` | Format with Prettier / check formatting |
| `npm test -w packages/shared`             | Run a script in a single workspace      |

## Repository structure

```
apps/api          NestJS API (added in feature 2)
apps/web          React web app (added in feature 9)
packages/shared   @ars/shared — data contracts and shared utilities
data/             listings.csv and bookings.csv, loaded into the database by the seed
docs/             plan, architecture, decisions, progress and feature logs
```

## Documentation

- [Implementation plan](docs/implementation-plan.md)
- [Architecture](docs/architecture.md)
- [Decisions and assumptions](docs/decisions.md)
- [Progress](docs/progress.md)
