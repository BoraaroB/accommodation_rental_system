# Feature 3 — Database schema

- **Branch:** `feat/db-schema`
- **Status:** done – awaiting commit

## Goal and scope

Give the API its database: the schema every later feature reads and writes, and the pieces that connect NestJS to it.

- Prisma 7 with the `@prisma/adapter-pg` driver adapter and `prisma.config.ts`.
- Six models: `Tenant`, `User`, `TenantMembership`, `Listing`, `Booking`, `BlockedDay`.
- The initial migration, with custom SQL for what Prisma cannot express (CHECK and EXCLUDE constraints).
- `PrismaService` (one Prisma client for the app) and `PrismaExceptionFilter` (Prisma errors in the `apiErrorSchema` shape).

Challenge references:

- "Stack: … PostgreSQL": the schema, constraints and indexes.
- "For users, tenants and blocked days you get nothing — no data and no types. Modelling those is part of the task."
- `contracts.ts`: "What is deliberately left open: your database schema, your indexes, your migrations."
- "One tenant's data must never be visible on another tenant's portal": every tenant-owned row reaches its tenant through a required foreign key.

Done when (from the plan): `migrate dev` succeeds on an empty database; filter tests are green.

## Decisions

Approved by the repository owner before implementation:

- **Naming:** camelCase in the Prisma schema and TypeScript, snake_case tables and columns in Postgres through `@map` / `@@map`.
- **Types:** `uuid` ids; native Postgres enums (`property_type`, `booking_status`, `membership_role`, `currency`); `numeric(2,1)` rating; `double precision` coordinates; `date` for calendar dates; `timestamptz` only for the tenant's `created_at` / `updated_at`.
- **Foreign keys:** deleting a tenant cascades to listings, their bookings and blocked days, and memberships; users stay (D-029). `blocked_days.created_by_id → users` is `RESTRICT`.
- **CHECK constraints** beyond the plan's `check_out > check_in`: guests ≥ 1; max guests 1–12; bedrooms ≥ 0 and 0 for a studio; price ≥ 0; review count ≥ 0 and 0 when the rating is null; rating 0–5; lowercase e-mail; kebab-case slug.
- **EXCLUDE** (no overlapping non-cancelled bookings per listing) moves from "Could" into this feature, provided `migrate dev` reports no drift for it.
- **Index** `tenant_memberships (tenant_id)` for the admin hosts list, in addition to the plan's indexes.
- **Test database guard:** with `NODE_ENV=test` the database name must end in `_test`; the e2e setup migrates `booking_test` with `prisma migrate deploy`.
- **Entity modules** (`users`, `tenants`, `listings`, `bookings`, `blocked-days`) are created by the feature that gives each its first provider or endpoint, not empty now.
- **Prisma error codes:** P2002 → 409 `UNIQUE_VIOLATION`, P2025 → 404 `NOT_FOUND`, P2003 → 409 `FOREIGN_KEY_VIOLATION`; any other Prisma error is a 500.
- **Shutdown:** `PrismaService` disconnects in `onApplicationShutdown`, after the HTTP server has stopped taking requests.
- **Error messages in logs:** `PrismaService` uses the minimal error format, if Prisma 7 offers it, so query arguments never reach the logs.

Decided during implementation (asked and approved):

- **`prisma.config.ts` reads `process.env.DATABASE_URL`**, not Prisma's `env()`, which throws without the variable: `prisma generate` is a build step and needs no database ([D-037](../decisions.md#d-037-generating-the-prisma-client-needs-no-database)). `.env.example` holds only placeholders that match the root example, so the copied examples connect to the Docker database without edits.
- **The API waits for the database at startup** (10 attempts, 1 s apart), because the pg adapter connects lazily ([D-038](../decisions.md#d-038-the-api-waits-for-the-database-at-startup)).

New decisions: [D-036](../decisions.md#d-036-the-database-enforces-the-contracts-value-rules) (constraints), D-037, D-038, [D-039](../decisions.md#d-039-prisma-errors-reach-clients-as-fixed-messages-and-the-logs-without-row-data) (Prisma errors). Now implemented: D-019, D-029 (cascades), D-031, D-032.

## What was done

- **Prisma 7.10** (`prisma`, `@prisma/client`, `@prisma/adapter-pg`, all `^7.10.0`) and `dotenv` for the CLI config. Confirmed locally, not from memory: the generator options `moduleFormat` / `importFileExtension`, `defineConfig`, the `PrismaPg` constructor, `errorFormat`, and the error classes exported by the generated client.
- **Schema** (`apps/api/prisma/schema.prisma`): six models, four native enums, indexes with the query each serves. The client is generated into `apps/api/src/generated/prisma` (gitignored; oxlint and Prettier skip it because of that).
- **Migration** `20260924190025_init`: generated with `migrate dev --create-only`, then 11 CHECK constraints and the EXCLUDE constraint (`btree_gist`) were appended. Applied to the empty `booking` database; a second `migrate dev --create-only` produced an empty migration, so there is no drift.
- **Scripts:** `npm install` generates the client (root `prepare`); the API's `pretest`, `pretypecheck`, `prebuild` and `pretest:e2e` regenerate it; `npm run db:migrate` (root and API) and `db:generate`.
- **Configuration:** `DATABASE_URL` in `envSchema` (a `postgres(ql)://` URL with a database name) and in `.env.example`. In test mode the database name must end in `_test`, also when a shell variable overrides `.env.test`. Messages never echo the value.
- **`DatabaseModule` / `PrismaService`** (`src/core/database/`, generated with the Nest CLI): one Prisma client with the pg adapter; startup check with `retry()` (a small helper with its own tests); `$disconnect` in `onApplicationShutdown`.
- **`PrismaExceptionFilter`** (`src/core/errors/`): registered in `ErrorsModule` after the catch-all, which is now also a plain provider (`useExisting`), so the Prisma filter hands it the translated error and the body, request id and 5xx logging stay in one place.
- **e2e setup:** Vitest `globalSetup` checks the `_test` name and runs `prisma migrate deploy` against the test database.
- **Fixed on the way:** a failed start after the app was created (e.g. no database) printed nothing, because Nest buffers logs until the app listens; `main.ts` now flushes the buffer before the fatal line (a feature 2 path).
- **Docs:** README (database setup, `.env.test`, commands), architecture (modules, data flow, configuration), decisions D-036 to D-039, plan "Changes since the plan was approved", and the database and API rules.

## Key files

| File                                                                           | Purpose                                                    |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| `apps/api/prisma/schema.prisma`                                                | Models, enums, relations, indexes                          |
| `apps/api/prisma/migrations/20260924190025_init/migration.sql`                 | Tables plus the hand-written CHECK and EXCLUDE constraints |
| `apps/api/prisma.config.ts`                                                    | Prisma CLI configuration                                   |
| `apps/api/src/core/database/*`                                                 | `DatabaseModule`, `PrismaService`, `retry()`               |
| `apps/api/src/core/errors/prisma-exception.filter.ts`, `errors.module.ts`      | Prisma errors in the `apiErrorSchema` shape; filter order  |
| `apps/api/src/core/config/env.schema.ts`, `database-url.ts`                    | `DATABASE_URL` and the `_test` guard                       |
| `apps/api/test/global-setup.ts`                                                | Migrates the e2e database                                  |
| `apps/api/test/database.e2e-spec.ts`                                           | Constraints, EXCLUDE, keys, cascade, dates                 |
| `apps/api/test/prisma-errors.e2e-spec.ts`, `prisma-error-routes.controller.ts` | Prisma errors over HTTP and clean logs                     |

## Verification

Run from the repository root with the Postgres 18 container running:

| Command                                              | Result                                                         |
| ---------------------------------------------------- | -------------------------------------------------------------- |
| `npm run lint`                                       | pass                                                           |
| `npm run typecheck`                                  | pass                                                           |
| `npm test`                                           | pass — shared 62, api 103                                      |
| `npm run build`                                      | pass                                                           |
| `npm run format:check`                               | pass                                                           |
| `npm run test:e2e -w apps/api`                       | pass — 67                                                      |
| `npm run db:migrate` on the empty `booking` database | applied `20260924190025_init`; a second run: "Already in sync" |

The e2e tests cover:

- every CHECK constraint, rejected past its limit and accepted at it;
- EXCLUDE: an overlapping `confirmed` or `completed` stay is rejected; a stay starting on the previous checkout day, a cancelled booking over an active one and an active booking over a cancelled one are accepted;
- P2002 for a duplicate slug and e-mail, P2003 for an unknown listing and for deleting a user who blocked a day (`RESTRICT`);
- deleting a tenant removes its listings, bookings, blocked days and memberships and keeps its users;
- a `date` is stored and read back without shifting (checked with SQL `::text` too);
- over HTTP: 409 `UNIQUE_VIOLATION`, 404 `NOT_FOUND`, 409 `FOREIGN_KEY_VIOLATION`, and a 500 for a CHECK violation and for a validation error, each without database details in the body and without row values (password hash, e-mail) in the logs;
- the config refuses an invalid `DATABASE_URL` and a non-`_test` database in test mode.

Checked by hand:

- `node dist/main.js` with an unreachable database: 9 warnings `Database not reachable (ECONNREFUSED), retrying (n/10)`, then `FATAL … Database not reachable after 10 attempts (ECONNREFUSED)`, exit code 1, no password in the output.
- What a CHECK violation exposes (P2039): the message names the constraint but not the row; `meta.driverAdapterError` holds the row and is never logged.

**Reviews.** The database review found the schema sound (two wording notes, both handled in the docs). The NestJS structure review and the invariant review found one medium issue — the startup connection was lazy, so a stopped database did not stop the start — which led to D-038, and these low ones, all fixed: the `_test` guard tested through `AppConfigModule`, dates relative to `today()` in test fixtures, `ReadonlyMap`, an unneeded export, a test that logs hold no row values, and the rule texts for shutdown hooks and the Prisma config. The new log test found that a Prisma validation error prints the query's arguments even with the minimal error format; the filter now logs it without its message (D-039).

## Deliberately left out

- **Entity modules** and repositories: created by features 5–8 with their first provider.
- **The e2e setup's working directory:** `global-setup.ts` runs `prisma` and reads `.env.test` relative to the working directory, like the app's own env loading; the npm scripts always run it from `apps/api`.

## Notes for later features

- **Features 6–7:** validate id parameters as UUIDs with zod before they reach Prisma; a malformed id in a `@db.Uuid` column is a Prisma error (a 500) whose message contains the input.
- **Features 6–8:** bookings and blocked days are tenant-scoped through the listing: `findFirst({ where: { id, listing: { tenantId } } })`.
- **Feature 5:** the test-only `PrismaErrorRoutesController` needs `@Public()` once the global `AuthGuard` exists.
- **Feature 8:** the slug zod schema must use the same pattern as `tenants_slug_format_check` (`^[a-z0-9]+(-[a-z0-9]+)*$`) and reject the reserved words.
- **Feature 14:** Compose starts the API only when the database is healthy (`depends_on` with `condition: service_healthy`); the image generates the Prisma client without a database URL.

## Possible improvements (not in the plan)

- A database readiness check (`SELECT 1`) next to the liveness endpoint `/api/health`.
- 503 instead of 500 when the database is unreachable (comment in `prisma-exception.filter.ts`).
- `created_at` on `users` and `blocked_days`.
- Row-level security as a second line of tenant isolation (D-006).

## Commit message

To be recorded after the commit.
