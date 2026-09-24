# Feature 2 — API bootstrap

- **Branch:** `feat/api-bootstrap`
- **Status:** PR merged — #3, 2026-09-24

## Goal and scope

Stand up the NestJS API that features 3–8 build on. It has no domain endpoints yet, only the parts every request goes through:

- a NestJS 12 ESM application in `apps/api`, wired into the npm workspaces;
- configuration validated with zod at startup; the API refuses to start with a missing or invalid variable;
- logging with the built-in `ConsoleLogger`, a request id per request, one log line per request;
- one error format for every error response (`apiErrorSchema` in `@ars/shared`);
- `/api/v1` URI versioning and an unversioned `/api/health`;
- a PostgreSQL 18 container with a second database, `booking_test`, for the e2e tests of later features.

Challenge references:

- "Stack: NestJS, React, PostgreSQL, Docker": the API and the database container.
- "Tests are required": unit and e2e tests for everything added here.
- "We will go through your code and your decisions": the error format, the request id and the configuration rules are recorded as decisions.

Done when (from the plan): health returns 200; an unversioned route returns 404 in the `apiErrorSchema` format; the API does not start without the required env; tests are green.

## What was done

- **Scaffold.** Generated with `npx @nestjs/cli@12.0.6 new api --skip-git --skip-install --package-manager npm --no-observe`, taking the default ESM option (Vitest). The generated files were then adapted:
  - Kept: `nest-cli.json`, `tsconfig.build.json`, the `tsconfig.json` compiler options, and the build/start/test scripts.
  - Removed: the hello-world controller and service, the README, `.prettierrc` (the root one applies), `.oxlintrc.json` (its only active rule was type-aware), and the `@nestjs/mau` deploy tooling.
  - Removed as well: `vite-tsconfig-paths`, since there are no path aliases and Vite 8 supports them natively.
  - Lint runs `oxlint --deny-warnings` without `--type-aware` ([D-026](../decisions.md#d-026-typescript-60-vitest-41-oxlint-and-prettier)).
  - The tsconfig adds the strictness flags `@ars/shared` uses.
  - Tests import from `vitest` explicitly instead of using globals.
- **Workspace.** `@ars/api` depends on `@ars/shared` and `zod`. The root `prepare` script builds `@ars/shared` on `npm install`, and `pretest` / `pretypecheck` rebuild it, so a clean clone works and the apps never see a stale `dist/`. npm runs workspace scripts in the order of the `workspaces` array, so `packages/*` builds before `apps/*`.
- **`@ars/shared`.** `apiErrorSchema` (with `ApiError`), `errorCodeSchema` (`UPPER_SNAKE_CASE`) and `requestIdSchema`, with tests.
- **Structure** ([D-035](../decisions.md#d-035-one-nest-module-per-area)). One Nest module per area:
  - `src/core/config` (`AppConfigModule`), `src/core/request-context` (`RequestContextModule`), `src/core/logging` (`LoggingModule`), `src/core/errors` (`ErrorsModule`), and `src/health` (`HealthModule`).
  - `AppModule` only imports them. Every provider is created by DI; `app.setup.ts` takes the two early middleware from the container with `app.get()`.
  - The first cut had everything in `AppModule` and built middleware with `new`; it was restructured before the commit.
- **Configuration** (`src/core/config/`). `envSchema` validates `NODE_ENV`, `PORT`, `CORS_ORIGIN` (a comma-separated list of origins), `LOG_LEVEL` and `LOG_FORMAT`.
  - `ConfigModule.forRoot({ isGlobal, envFilePath, validationSchema })` uses it.
  - `ConfigService.getOrThrow` returns the parsed values, e.g. `PORT` as a number and `CORS_ORIGIN` as an array.
  - `.env.test` is loaded when `NODE_ENV=test`; both Vitest configs force that value.
- **Bootstrap.** `main.ts` creates the app with `abortOnError: false` and `bufferLogs: true`, and enables shutdown hooks, so `SIGTERM` (e.g. `docker stop`) closes providers cleanly. `x-powered-by` is turned off. A failed start is logged as `fatal`, naming every invalid variable, and exits with code 1.
  - `configureApp()` (`src/app.setup.ts`) is shared by `main.ts` and the e2e tests. It sets the logger, the two early middleware, the `api` prefix, URI versioning with default version `1`, and CORS.
  - The prefix and version are constants in `src/api.constants.ts`.
- **Logging** ([D-034](../decisions.md#d-034-request-id-through-a-response-header-and-asynclocalstorage)):
  - `RequestIdMiddleware` sets `x-request-id`.
  - `RequestLoggerMiddleware` writes one line per request, from the `close` event: method, path without the query string, status and duration. 5xx is an error, 4xx and aborted requests a warning.
  - `RequestContextMiddleware` runs the rest of the request in `RequestContextService` (`AsyncLocalStorage`).
  - `AppLoggerService` (extends `ConsoleLogger`) adds `requestId` to every line written during a request. `LOG_FORMAT=json` gives JSON lines with the params flattened; `LOG_LEVEL` is the least severe level written.
- **Errors** ([D-033](../decisions.md#d-033-error-codes-use-nests-errorcode-option)). `AllExceptionsFilter` is registered through `APP_FILTER`, first, so later filters take precedence. `describeException()` and `buildErrorBody()` in `src/core/errors/error-body.ts` produce every error body.
  - A 5xx is logged with its stack and the request id; the client gets "Internal server error".
  - A response that has already started is only ended.
- **Health.** `GET /api/health` (`VERSION_NEUTRAL`) returns `{ "status": "ok" }`.
- **Docker.** `docker-compose.yml` runs the `postgres:18` service `db`:
  - credentials from the root `.env`, with `${VAR:?}` failing on a missing value;
  - the port published on `127.0.0.1` only;
  - the volume mounted at `/var/lib/postgresql`, the Postgres 18 image layout;
  - a `pg_isready` health check.
  - `docker/postgres/initdb/create-test-database.sh` creates `POSTGRES_TEST_DB` on the first start. `.gitattributes` keeps `*.sh` files with LF line endings.
- **Env examples.** `apps/api/.env.example` and the root `.env.example` (Postgres) — [D-027](../decisions.md#d-027-envexample-files-are-created-with-the-feature-that-needs-them).
- **Docs.** README (database, API, e2e setup), architecture (API modules, request pipeline, configuration), decisions D-033 to D-035, and statuses of D-018 to D-020 and D-022. The plan's note on SWC is resolved.

## Key files

| File                                                                        | Purpose                                                                      |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `apps/api/package.json`, `tsconfig*.json`, `nest-cli.json`                  | Workspace `@ars/api`, compiler and build settings                            |
| `apps/api/vitest.config.ts`, `vitest.config.e2e.ts`                         | Unit (`src/**/*.spec.ts`) and e2e (`test/**/*.e2e-spec.ts`)                  |
| `apps/api/src/main.ts`, `app.setup.ts`, `app.module.ts`, `api.constants.ts` | Bootstrap, shared app setup, root module, prefix/version                     |
| `apps/api/src/core/config/*`                                                | `AppConfigModule`, env schema, env-file selection                            |
| `apps/api/src/core/logging/*`                                               | `LoggingModule`: `AppLoggerService`, log levels, request logger              |
| `apps/api/src/core/request-context/*`                                       | `RequestContextModule`: request id, `AsyncLocalStorage` context, path helper |
| `apps/api/src/core/errors/*`                                                | `ErrorsModule`: catch-all filter, error description and body                 |
| `apps/api/src/health/*`                                                     | `HealthModule`: `GET /api/health`                                            |
| `apps/api/test/*`                                                           | e2e tests and `TestRoutesController` (test-only routes)                      |
| `apps/api/.env.example`, `.env.example`                                     | API and Docker Compose variables                                             |
| `docker-compose.yml`, `docker/postgres/initdb/create-test-database.sh`      | Postgres 18 with `booking` and `booking_test`                                |
| `packages/shared/src/api-error.ts`                                          | `apiErrorSchema`, `errorCodeSchema`, `requestIdSchema`                       |

## Decisions

- [D-018](../decisions.md#d-018-uri-versioning-under-apiv1) URI versioning under `/api/v1` — implemented.
- [D-019](../decisions.md#d-019-one-error-format-for-the-whole-api) One error format — catch-all filter implemented; the Prisma filter follows in feature 3.
- [D-020](../decisions.md#d-020-logging-with-the-built-in-consolelogger) Logging with `ConsoleLogger` — implemented.
- [D-022](../decisions.md#d-022-configuration-comes-only-from-validated-env) Validated env — implemented for the API.
- [D-033](../decisions.md#d-033-error-codes-use-nests-errorcode-option) Error codes use Nest's `errorCode` option (new).
- [D-034](../decisions.md#d-034-request-id-through-a-response-header-and-asynclocalstorage) Request id through a response header and `AsyncLocalStorage` (new).
- [D-035](../decisions.md#d-035-one-nest-module-per-area) One Nest module per area (new).
- Open questions from `progress.md`, resolved:
  - **Workspace order:** npm runs workspaces in the order of the `workspaces` array (npm 11 workspaces docs).
  - **Decorator metadata without SWC:** Vite 8's Oxc transform emits it; `RequestContextMiddleware.spec.ts` resolves a provider through Nest DI.
  - **Building `@ars/shared` first:** the root `prepare`, `pretest` and `pretypecheck` scripts.

## Verification

Run from the repository root on Node 24.18.0 / npm 11.16.0, with Docker 29.4:

| Command                        | Result                                              |
| ------------------------------ | --------------------------------------------------- |
| `npm install`                  | pass; `prepare` built `@ars/shared`                 |
| `npm run lint`                 | pass — 0 diagnostics                                |
| `npm run typecheck`            | pass                                                |
| `npm test`                     | pass — shared 62 tests, api 72 tests                |
| `npm run build`                | pass                                                |
| `npm run format:check`         | pass                                                |
| `npm run test:e2e -w apps/api` | pass — 22 tests                                     |
| `docker compose up -d db`      | healthy; PostgreSQL 18.6; `booking`, `booking_test` |

The e2e tests cover:

- `/api/health` returns 200.
- `/api/v1/...` is routed.
- `/api/test-routes`, `/api/v2/test-routes`, `/api/v1/health` and `/api/listings` return 404 in the `apiErrorSchema` format.
- A domain `errorCode` is passed through.
- A 500 hides its details.
- Malformed JSON gives 400, and an oversized body gives 413.
- The request id is the same in the header and the body; a client id is kept or replaced.
- A line logged in a handler carries the request id.
- No `x-powered-by` header.
- The query string is not echoed in `path`.
- CORS allows only the configured origins.
- Invalid `PORT`, `LOG_FORMAT` and `CORS_ORIGIN` stop `AppConfigModule`. The test imports that module alone: `ConfigModule.forRoot` validates when its file is imported, and Vitest's module runner would report the rejection as unhandled if more modules were loaded after it. Native Node ESM evaluates the whole graph at once, and the manual check below confirms the real start fails cleanly.

Also checked by hand against `node apps/api/dist/main.js`:

- **Empty environment:** the start fails with every invalid variable named, logged as `FATAL`, exit code 1.
- **JSON logs:** the lines carry `requestId` at the top level.
- **Hardcoded URLs:** `grep -rnE "https?://|localhost:[0-9]" apps/api/src packages/shared/src` finds only test data in spec files.

**Review.** The review found two medium issues, both fixed:

- a shell `NODE_ENV` could make the e2e tests load `.env`;
- body-parser errors became 500s.

These low findings were also fixed:

- request id and log line for requests rejected before Nest's middleware;
- no query strings in logs and error paths;
- logging of aborted requests;
- the headers-sent guard;
- validation of `errorCode`;
- `getOrThrow`;
- an e2e test that handler logs carry the request id.

While fixing the first low finding, the e2e test showed that an `AsyncLocalStorage` context entered before the body parser is lost; this led to the three-middleware split in D-034.

**Structure review.** A review of the restructured code against the module-per-area rules found the structure sound. It raised three points, all fixed:

- Global exception filters are applied last-registered first, and `APP_FILTER` providers register in module scan order. Every global filter is therefore registered in `ErrorsModule`, in one ordered list, and the Prisma filter goes there in feature 3.
- `RequestIdMiddleware`, `RequestLoggerMiddleware` and `AppLoggerService` were exported without another module using them; the exports were removed, since `app.get()` finds them anyway.
- The `envFilePathFor` tests moved into their own spec file.

**Production readiness and entity modules.** After the review the repository owner set two standing requirements: the code must be production ready, and every entity gets its own module in its own folder, generated with the Nest CLI. Both are now in the API rules and in [D-035](../decisions.md#d-035-one-nest-module-per-area). For this feature this meant:

- shutdown hooks are enabled;
- the `x-powered-by` header is removed;
- a manual `SIGTERM` check: the process runs Nest's shutdown hooks and ends with the signal (exit status 143).

The entity modules (`users`, `tenants`, `listings`, `bookings`, `blocked-days`) are each created by the feature that gives them their first provider or endpoint (decided in feature 3).

## Deliberately left out

- **`DATABASE_URL`, `JWT_*` and `SEED_*`** are added with features 3, 5 and 4, together with their schemas ([D-027](../decisions.md#d-027-envexample-files-are-created-with-the-feature-that-needs-them)).
- **The fatal-and-exit path of `main.ts`** has no automated test; it was checked by hand (see Verification).
- **Guarding the e2e database name** (it must end in `_test`) belongs to feature 3, when e2e tests first touch the database.

## Possible improvements (not in the plan)

Recorded instead of implemented, so the plan stays as approved. Each has a comment where it would go.

- **Security headers** with `helmet` (`app.setup.ts`). Only `x-powered-by` is removed now.
- **JSON 404 for paths outside `/api`** (`app.setup.ts`). Paths such as `/` and `/favicon.ico` get Express's default HTML 404, because Nest mounts its not-found handler under the global prefix. They still get a request id and a log line, and in Docker only `/api` is proxied to the API (feature 14).
- **Rate limiting** of sign-in attempts. It belongs to feature 5, which will mark the spot in the auth controller.

## Commit message

Two commits on `feat/api-bootstrap`, merged into `main` by merge commit `35dda14` (PR #3).

`fd49603`:

```
feat(api): bootstrap NestJS API with config, logging and error format

- Add apps/api (NestJS 12, ESM, Vitest) as one module per area under src/core
- Validate env with zod at startup; invalid config logs fatal and exits 1
- Serve routes under /api/v1 with URI versioning; unversioned /api/health
- Add request id per request (header, error body, every log line) and apiErrorSchema errors
- Add docker-compose Postgres 18 with a booking_test database
```

`7e3180c`:

```
chore(repo): add API and database structure conventions

- Define module-per-entity layout generated with the Nest CLI and visible DI
- Require interfaces at boundaries (repositories, external services) only
- Add a production-readiness checklist and structure/schema review guides
- Document improvements outside the plan instead of implementing them
```
