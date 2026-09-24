# Decisions and assumptions

Every design choice and assumption, numbered so it can be referenced from code reviews and the interview. Each entry has a status:

- **Accepted** — decided; the "Implemented in" line says which feature puts it into code.
- **Implemented** — already in the code.

The challenge text is in [challenge/full_stack_challenge.md](challenge/full_stack_challenge.md); the full plan is in [implementation-plan.md](implementation-plan.md).

---

## D-001: Monorepo with npm workspaces

- **Status:** Implemented (feature 1)
- **Context:** The API and the web app share the data contracts (`contracts.ts`), validation schemas and date/money utilities.
- **Decision:** One repository with npm workspaces: `apps/api`, `apps/web`, `packages/shared` (`@ars/shared`). The shared package is compiled with `tsc` to `dist/` and consumed through its `exports` map as an ES module.
- **Consequences:** One `npm install`, one lockfile, one place for shared schemas, so the FE and BE cannot drift apart. Each workspace keeps its own tooling configuration and test run (`npm test -w <workspace>`); the root scripts run every workspace with `--workspaces --if-present`. No extra monorepo tool is needed at this size.

## D-002: React SPA on Vite, not Next.js

- **Status:** Accepted — implemented in feature 9
- **Context:** The stack requires React. The backend is already NestJS.
- **Decision:** A client-side React SPA built with Vite.
- **Consequences:**
  - A Next.js server would duplicate the API layer that NestJS already provides.
  - Redux's guidance for the Next.js App Router requires a store per request, forbids Redux in React Server Components and recommends RTK Query for client-side data fetching only — Next's costs without its main benefit.
  - SEO and SSR are not required: the challenge asks for a usable UI and no deployment.

## D-003: Global client identity

- **Status:** Accepted — implemented in feature 5
- **Context:** The challenge leaves "what happens to a client's account across portals" to us and says it will ask.
- **Decision:** A user registers once and can sign in on any tenant portal with the same account. The e-mail is unique platform-wide and stored in lowercase.
- **Consequences:** No duplicate accounts per portal. Clients do not book, so no client data leaks between tenants. Host rights are per tenant through memberships ([D-007](#d-007-roles-are-not-in-the-token)), so the same identity can be a host in one tenant and a client in another.

## D-004: Three tenants split by region

- **Status:** Implemented (feature 4)
- **Context:** The data has no tenants; how to split 1,000 listings is our choice. "One tenant in the data is enough", but more show isolation better.
- **Decision:** Three tenants assigned by listing country: `adriatic` (RS/HR/SI, 363 listings), `central-europe` (DE/AT/CZ/HU/CH, 428), `west-europe` (ES/PT/NL, 209).
- **Consequences:** The split is deterministic, so tests may assert exact counts. Isolation can be demonstrated between real portals.

## D-005: A host manages all listings of their tenant

- **Status:** Accepted — implemented in feature 7
- **Context:** `contracts.ts`: a listing has no owner. The challenge: "a host manages the listings and calendar of their tenant".
- **Decision:** Listings belong to a tenant only (`tenantId`); hosts are assigned to tenants, not to individual listings. Every host of a tenant can edit every listing of that tenant.
- **Consequences:** A simple, literal reading of the requirement. Per-listing ownership could be added later with a join table without changing the tenant model.

## D-006: Tenant isolation in the application layer

- **Status:** Accepted — implemented in features 5–8
- **Context:** "One tenant's data must never be visible on another tenant's portal"; where to enforce it is our choice.
- **Decision:** All tenant routes are under `/api/v1/t/:tenantSlug/...`; `TenantGuard` resolves the slug (unknown → 404). Repository methods for listings, bookings and blocked days always take `tenantId`; single rows are loaded with `findFirst({ where: { id, tenantId } })`, never by id alone. Postgres row-level security is deliberately out of scope.
- **Consequences:** Isolation is explicit, reviewable and proven by e2e tests (tenant A's listing through tenant B's URL → 404; a host of A on B's host routes → 403). Row-level security would add a second line of defence, but it needs the tenant passed to every database session, which is extra infrastructure for the time available; it stays a "Could".

## D-007: Roles are not in the token

- **Status:** Accepted — implemented in feature 5
- **Context:** "What interests us is how you separate who you are from what you may do."
- **Decision:** The JWT carries only identity (`sub`, `email`). For every request, `AccessService` computes the effective role for the tenant in the URL — superadmin (platform flag), host (membership in that tenant) or client — and `ROLE_PERMISSIONS` maps it to permissions. Handlers declare `@RequirePermissions(...)`; `PermissionsGuard` enforces them.
- **Consequences:** Identity and authorization are separate concerns. Membership changes take effect immediately, without re-issuing tokens. The FE reads roles from `GET /auth/me` for UI gating only; the server remains the authority.

## D-008: Registration creates clients; the superadmin creates hosts

- **Status:** Accepted — implemented in features 5 and 8
- **Context:** "Registration is for clients — host accounts are created by the superadmin."
- **Decision:** `POST /auth/register` always creates a plain client. Hosts are created (or an existing user is added as a host) only through the admin panel.
- **Consequences:** No self-service privilege escalation.

## D-009: Availability is derived at read time

- **Status:** Accepted — implemented in feature 6
- **Context:** `contracts.ts` leaves open whether availability is derived from bookings or stored separately.
- **Decision:** Availability is computed on read from bookings and blocked days. The date filter takes `from` (arrival, inclusive) and `to` (departure, exclusive). A listing is free for `[from, to)` when no non-cancelled booking has `checkIn < to AND checkOut > from` and no blocked day lies in `[from, to)` — a Prisma relation filter `none`, no raw SQL.
- **Consequences:** One source of truth, nothing to synchronise; with an index on `(listing_id, check_in)` 12.7 thousand bookings are trivial. At a larger scale, options are a per-day availability table or a `daterange` column with a GiST index.

## D-010: Blocked days, one row per day

- **Status:** Accepted — implemented in feature 7
- **Context:** Blocked days do not exist in the data; the no-overlap guarantee covers bookings only.
- **Decision:** `BlockedDay (listingId, day)` with a composite primary key, one row per day. Blocking a day taken by an active (non-cancelled) booking returns 409 `DAY_ALREADY_BOOKED`. A day under a cancelled booking may be blocked. Blocking the same day twice is idempotent.
- **Consequences:** Simple queries (`day >= from AND day < to`) and idempotency for free through the primary key.

## D-011: Money is integer cents end to end

- **Status:** Implemented for the conversion helper (feature 1); the rest follows from features 3–13
- **Context:** `contracts.ts`: money is an integer in minor units; there are no floats on purpose.
- **Decision:** Cents in the database (`Int`), the API, the URL filter parameters (`minPriceCents`, `maxPriceCents`) and all calculations. Euros exist only in form inputs and are converted once by `eurosToCents` in `@ars/shared`, which rejects amounts with more than two decimals (instead of rounding them silently — `1.005 * 100` is `100.49999…` in binary floating point), negative or non-finite amounts, and amounts too large for a safe integer.
- **Consequences:** No floating-point money errors; one schema for the URL and the API. Stay totals are computed as `nights × pricePerNightCents`.

## D-012: Dates are ISO strings in UTC, with one today()

- **Status:** Implemented for the utilities (feature 1); used from feature 4 on
- **Context:** `contracts.ts` defines `IsoDate` as `YYYY-MM-DD` with no time and no offset; the data spans 2026-07-28 to 2027-04-24, partly in the past.
- **Decision:** Dates travel as `IsoDate` strings and are stored as `date`. Date math lives in `@ars/shared` as pure functions over UTC dates (`today`, `addDays`, …). `today(now = new Date())` takes the clock as a parameter. The public calendar and the filter do not offer days before today (`from ≥ today()`); hosts cannot block past days.
- **Consequences:** No time-zone bugs from local `Date` arithmetic; FE and BE agree on "today". Tests use dates relative to today (`addDays(today(), n)`), so they never go stale.

## D-013: Stale booking statuses are kept as-is

- **Status:** Accepted — implemented in features 7 and 12
- **Context:** With today at 2026-09-24, 532 bookings are `confirmed` although their checkout has passed.
- **Decision:** Statuses are not rewritten. Availability treats `confirmed` and `completed` alike (both occupy days). The host table shows the stored status plus a time badge derived from the dates and `today()`: past, in progress or upcoming.
- **Consequences:** The data stays exactly as delivered; the UI still tells the host what is happening now.

## D-014: Listing edits cannot break booking invariants

- **Status:** Accepted — implemented in feature 7
- **Context:** `contracts.ts`: `guests` is 1 to the listing's `maxGuests`; `bedrooms` is 0 for a studio.
- **Decision:** Lowering `maxGuests` below the guest count of an active booking returns 409 `MAX_GUESTS_BELOW_BOOKING`. The edit schema requires `bedrooms === 0` for a studio and `maxGuests` between 1 and 12 (400 otherwise).
- **Consequences:** Host edits cannot put existing data into a state the contract rules out.

## D-015: CSV is loaded once by a TypeScript seed

- **Status:** Implemented (feature 4); how it runs and stays idempotent: [D-040](#d-040-the-seed-is-a-standalone-script-that-only-inserts-missing-rows)
- **Context:** "How you load the data into the database is your choice." `contracts.ts`: "The mapping is part of the work."
- **Decision:** A deterministic, idempotent TypeScript seed (`npm run db:seed`) parses the CSV with `csv-parse`, maps and validates every row with zod (snake_case strings → typed camelCase), and inserts with batched `createMany`. The application never reads the CSV at runtime.
- **Consequences:** The mapping is visible and unit-tested; an invalid row stops the seed with a clear message. Postgres `COPY` would be faster but would hide the mapping in SQL.

## D-016: contracts.ts is the API response shape

- **Status:** Accepted — implemented in feature 6
- **Context:** By its own comment `contracts.ts` is neither a DB entity nor an API contract.
- **Decision:** `ListingDto` and `BookingDto` are used as the API response shapes. `contracts.ts` stays unchanged in `packages/shared`. Zod schemas mirror them, and a type-level test keeps the two aligned. The DB → API mapper converts `Date` to `IsoDate` and `Decimal` to `number | null` and never exposes `tenantId`.
- **Consequences:** The FE consumes the delivered types directly.

## D-017: Listing filters live in the URL

- **Status:** Accepted — implemented in feature 10
- **Context:** The portal filters by city, guests, price range and date range.
- **Decision:** The URL search parameters are the only source of truth for filters; they are not duplicated in Redux or component state. The same `listingQuerySchema` validates them on the FE and the BE. Invalid parameters drop only themselves. "Apply" resets the page to 1.
- **Consequences:** Shareable links, working refresh and back button, and natural RTK Query caching, because the query arguments are exactly the URL.

## D-018: URI versioning under /api/v1

- **Status:** Implemented (feature 2)
- **Decision:** Global prefix `api` + NestJS URI versioning with default version `1`. A future v2 adds handlers with `@Version('2')` or `@Controller({ version: '2' })` without touching v1. `/api/health` is version-neutral. The prefix and version are constants in code, not environment variables.
- **Consequences:** Breaking API changes can ship side by side with v1.

## D-019: One error format for the whole API

- **Status:** Implemented (features 2 and 3)
- **Decision:** Every error response has the shape `apiErrorSchema` (`statusCode`, `error`, `code`, `message`, `path`, `timestamp`, `requestId`), defined in `packages/shared`. Domain errors extend the built-in Nest exceptions and add a machine `code`. A catch-all filter (registered first) and a Prisma filter build bodies through one helper; unknown errors become 500 "Internal server error" without a stack trace.
- **Consequences:** The FE parses every error with one schema and can map known codes to form fields.

## D-020: Logging with the built-in ConsoleLogger

- **Status:** Implemented (feature 2)
- **Decision:** NestJS `ConsoleLogger` to stdout (JSON in Docker, pretty in development), a request id per request (from `x-request-id` or generated), a request log line on completion, business-event logs in services. Passwords, tokens and the `authorization` header are never logged.
- **Consequences:** No extra dependency; Docker collects stdout. Pino or Winston only if transports or redaction become necessary.

## D-021: One set of zod schemas for FE and BE

- **Status:** Accepted — implemented in features 2–13
- **Decision:** Input and response DTO schemas live in `packages/shared` and are used by the NestJS validation pipe, by react-hook-form resolvers and by RTK Query `argSchema` / `responseSchema`. RTK response validation runs in development and tests and is skipped in production (`skipSchemaValidation: import.meta.env.PROD`) for performance; `catchSchemaFailure` turns a mismatch into a normal error state.
- **Consequences:** FE and BE validation cannot disagree; contract drift shows up during development.

## D-022: Configuration comes only from validated env

- **Status:** Implemented for the API (feature 2); the web app follows in feature 9 and Docker in feature 14
- **Decision:** No URLs, hosts, ports, origins or secrets in code. Each app reads its environment in one module, validates it with zod at startup and fails fast with a clear error. `.env.example` files are committed without secrets; `.env*` is ignored by git.
- **Consequences:** The same build runs locally and in Docker with different `.env` files.

## D-023: Null rating is shown as "New" and sorted last

- **Status:** Accepted — implemented in features 6 and 10
- **Context:** 109 listings have `rating: null` — "a real state in the data, not a gap in it".
- **Decision:** The UI shows a "New" badge and no stars; sorting by rating puts nulls last. Ratings stay on the data's 5-point scale.
- **Consequences:** Unreviewed listings are neither hidden nor ranked as zero.

## D-024: Placeholder images per property type

- **Status:** Accepted — implemented in feature 10
- **Context:** The data has no photos.
- **Decision:** Result cards show a placeholder with an icon for the `propertyType`.
- **Consequences:** A usable, honest UI without fake photos.

## D-025: Booking-style layout, not branding

- **Status:** Accepted — implemented in features 9–10
- **Context:** "Feel free to take UI inspiration from Airbnb or Booking."
- **Decision:** Booking.com's layout and UX patterns (search bar, filter sidebar/drawer, horizontal result cards, rating badge) — not its name, logo or colours. Colours come from design tokens and the tenant's primary colour; mobile-first.
- **Consequences:** A familiar, usable layout; tenant branding is a runtime CSS variable.

## D-026: TypeScript 6.0, Vitest 4.1, oxlint and Prettier

- **Status:** Implemented (feature 1)
- **Context:** Verified on 2026-09-24 against the npm registry and the official docs:
  - npm `latest` for TypeScript is 7.0.2, but `typescript-eslint` requires `typescript >=4.8.4 <6.1.0`, `@nestjs/cli@12` depends on `typescript ~6.0.2`, and the Vite `react-ts` template (create-vite 9.2.1) uses `~6.0.2`.
  - The NestJS 12 ESM application template (`@nestjs/schematics` 12.0.5) generates `vitest ^4.1.2`; the NestJS migration guide: "ESM projects use Vitest by default (CommonJS projects use Jest)". Vitest 5.0 is available but would diverge from the template.
  - Both the NestJS 12 and the Vite templates generate oxlint; the NestJS migration guide: "Newly generated projects use oxlint by default." Type-aware oxlint requires TypeScript 7.0+ and is not yet stable.
- **Decision:** TypeScript `~6.0` and Vitest `^4.1` in every workspace; oxlint with `--deny-warnings` (without type-aware rules — `tsc --noEmit` checks types); Prettier at the root with the NestJS template's options (`singleQuote`, `trailingComma: "all"`).
- **Consequences:** One compiler and one test runner version across the repo, matching what the generators produce, so generated code is not modified. Workspaces run their tests separately. Upgrading to TypeScript 7 / Vitest 5 is a separate, later change.

## D-027: .env.example files are created with the feature that needs them

- **Status:** Accepted — implemented in features 2, 9 and 14
- **Context:** Feature 1 creates no application that reads environment variables.
- **Decision:** Feature 1 only adds the ignore rules (`.env*` ignored, `.env.example` allowed). `apps/api/.env.example` is created in feature 2, `apps/web/.env.example` in feature 9, and the root (Docker) `.env.example` in features 2 and 14.
- **Consequences:** Every variable appears together with the schema that validates it; no dead configuration.

## D-028: Tenant slugs are kebab-case, with reserved words

- **Status:** Accepted — implemented in feature 8
- **Decision:** A slug must be kebab-case and unique (duplicate → 409 `SLUG_TAKEN`). `admin`, `api`, `login` and `register` are reserved, so `/admin` never collides with `/:tenantSlug`.
- **Consequences:** Portal URLs are predictable and cannot shadow application routes.

## D-029: Deleting a tenant cascades; users stay

- **Status:** Implemented in feature 3 (cascading foreign keys); the admin deletion follows in feature 8
- **Decision:** Deleting a tenant cascades to its listings, bookings, blocked days and host memberships. Users are not deleted, because identity is global ([D-003](#d-003-global-client-identity)). The admin UI asks for the slug to be typed as confirmation.
- **Consequences:** No orphaned tenant data; a person who hosted the deleted tenant keeps their account.

## D-030: RTK Query and Redux Toolkit, no Zustand

- **Status:** Accepted — implemented in feature 9
- **Decision:** Server state in RTK Query (one `createApi`, `injectEndpoints` per feature, tag invalidation); client state in two Redux Toolkit slices (auth token, UI). No second state library.
- **Consequences:** One mental model for all state; filters stay in the URL ([D-017](#d-017-listing-filters-live-in-the-url)).

## D-031: Prisma 7, pinned

- **Status:** Implemented (feature 3)
- **Context:** On 2026-09-24 npm `latest` for `prisma` points to `8.0.0-rc.15`; the stable line is 7.10.
- **Decision:** Every Prisma package is installed with `@7`; the v7 documentation (`/docs/orm/v7`) is the reference.
- **Consequences:** No release-candidate code in the project.

## D-032: Bookings are not linked to users

- **Status:** Implemented (feature 3)
- **Context:** `contracts.ts`: a booking has no guest, only a head count. The challenge: clients do not book.
- **Decision:** `Booking` has no `userId`. Host screens show "N guests"; clients have no "my bookings" page.
- **Consequences:** The model reflects the data as delivered; adding booking later would add a guest relation.

## D-033: Error codes use Nest's `errorCode` option

- **Status:** Implemented (feature 2)
- **Context:** Domain errors must carry a machine `code` ([D-019](#d-019-one-error-format-for-the-whole-api)). NestJS 12.1 added an `errorCode` option to the built-in exceptions (`new ConflictException(message, { errorCode, cause })`), exposed as `exception.errorCode`.
- **Decision:** Domain errors pass their code through `errorCode`. The catch-all filter reads it into the `code` field of `apiErrorSchema`; the field name `code` stays as planned. An exception without a code (or with one that is not `UPPER_SNAKE_CASE`) gets the status name, e.g. `NOT_FOUND`. Client errors raised by Express middleware before Nest (the body parser's 400/413/415, marked `expose: true`) keep their status and message; any other error is a 500 "Internal server error" with no details. Query strings are never echoed in `path`.
- **Consequences:** No custom exception base class is needed; every error, including a framework 404, has a stable machine code the FE can switch on. Requires `@nestjs/common` ≥ 12.1.

## D-034: Request id through a response header and AsyncLocalStorage

- **Status:** Implemented (feature 2)
- **Context:** The request id must appear in the response header, the error body and every log line ([D-020](#d-020-logging-with-the-built-in-consolelogger)), including lines written by services that never see the request.
- **Decision:**
  - `RequestIdMiddleware` runs first (`app.use`) and sets `x-request-id`: the client's value when it matches `requestIdSchema` (letters, digits, `.`, `_`, `-`, at most 128 characters), otherwise a new UUID. Rejecting other values prevents log injection.
  - `RequestLoggerMiddleware` also runs before CORS and the body parser, so every request — including a rejected body or a preflight — gets one log line (path without the query string).
  - `RequestContextMiddleware` (Nest middleware, after the body parser) runs the rest of the request inside an `AsyncLocalStorage` store with the id, following the NestJS async-local-storage recipe. A context entered before the body parser is lost in its stream callbacks — an e2e test caught this.
  - `AppLoggerService` extends `ConsoleLogger` and adds `requestId` to the structured params of every line written inside a request (a top-level field in JSON).
- **Consequences:** Services log with a plain `new Logger(X.name)` and still get the request id. The store holds only the request id, as the recipe warns against contextual "god objects".

## D-035: One Nest module per area

- **Status:** Implemented (feature 2)
- **Context:** The API must stay easy to read, navigate and extend as features 3–8 add modules. Dependencies should be visible; abstractions belong where the industry-standard NestJS architecture puts them, not everywhere.
- **Decision:**
  - Every area is a Nest module. Infrastructure lives in `src/core/<area>/` (config, request context, logging, errors); features live in `src/<feature>/`.
  - `AppModule` only imports modules. Each module file lists its providers, exports and imports, and applies its own middleware.
  - Everything with dependencies is created by the DI container. Code outside it (`main.ts`, `app.setup.ts`) takes instances with `app.get()`.
  - Boundaries get a contract: repositories (over Prisma) and infrastructure services (hashing, token signing) are a TypeScript `interface` plus a `Symbol` injection token, registered with `useClass` and injected with `@Inject(TOKEN)`; unit tests pass in-memory fakes. Data shapes are interfaces or `z.infer` types from `@ars/shared`.
  - Nest's own services (`ConfigService`, `Logger`) are used directly; controllers, modules and pure helpers get no interface; there are no generic base classes.
  - Every entity has its own module in `src/<entities>/` (`users`, `tenants`, `listings`, `bookings`, `blocked-days`), created with the Nest CLI (`nest g module|controller|service <entities>`) so all its components land in that folder. It holds `<entities>.module.ts`, `.controller.ts`, `.service.ts`, the repository contract and its Prisma implementation, and the mapper. An entity served to several audiences (public portal, host panel) has one controller per audience in the same module.
- **Consequences:**
  - From `AppModule` any behaviour is two hops away (module file → class).
  - A new feature is added as a new module, without editing existing ones.
  - Middleware that must run before the body parser (request id, request log) is the one exception to "a module applies its own middleware"; `app.setup.ts` registers it and says why.

## D-036: The database enforces the contract's value rules

- **Status:** Implemented (feature 3)
- **Context:** `contracts.ts` states value rules (1–12 guests, 0 bedrooms for a studio, integer cents, a null rating has no reviews) and guarantees that bookings never overlap. The zod schemas check input, but the seed, fixtures and future code write to the database too.
- **Decision:**
  - Native Postgres enums for property type, booking status, membership role and currency; `uuid` ids; `date` for calendar dates; `numeric(2,1)` rating; `timestamptz` only for the tenant's timestamps.
  - CHECK constraints in the initial migration: `check_out > check_in`, guests ≥ 1, max guests 1–12, bedrooms ≥ 0 and 0 for a studio, price ≥ 0, review count ≥ 0 and 0 without a rating, rating 0–5, lowercase e-mail, kebab-case slug (the format only; reserved slugs are a routing rule checked by the API).
  - `EXCLUDE USING gist (listing_id WITH =, daterange(check_in, check_out) WITH &&) WHERE (status <> 'cancelled')` with `btree_gist`: active stays on a listing never overlap; `daterange` is `[)`, so a stay may start on the previous checkout day.
  - Foreign keys: deleting a tenant cascades to listings, their bookings and blocked days, and memberships; `blocked_days.created_by_id → users` is `RESTRICT`, so calendar data is never deleted with a user.
  - Bookings and blocked days reach their tenant through the listing; they have no `tenant_id` column.
- **Consequences:** Every CSV row passes. A violation is a bug (zod checks first), so it is a 500. `prisma migrate dev` reports no drift for the hand-written SQL (checked with a second `migrate dev --create-only`, which produced an empty migration). Rules that compare tables (guests ≤ max guests) or depend on today stay in the API.

## D-037: Generating the Prisma client needs no database

- **Status:** Implemented (feature 3)
- **Context:** The plan had `prisma.config.ts` read the URL with Prisma's `env("DATABASE_URL")`, which throws when the variable is missing. `prisma generate` runs on `npm install` and before tests, type checks and builds, and needs no database.
- **Decision:** `prisma.config.ts` reads `process.env.DATABASE_URL`. `npm install` (root `prepare`) and the API's `pretest`, `pretypecheck`, `prebuild` and `pretest:e2e` scripts generate the client into the gitignored `apps/api/src/generated/prisma`.
- **Consequences:** A clean clone installs, tests and builds without a `.env`, and a Docker image can be built without a fake URL. Commands that connect (`migrate`) still fail without the URL ("The datasource.url property is required…"), and the API validates it at startup.

## D-038: The API waits for the database at startup

- **Status:** Implemented (feature 3)
- **Context:** With the pg driver adapter, `$connect()` only creates a connection pool, so a stopped database would surface as a 500 on the first request.
- **Decision:** `PrismaService` runs `SELECT 1` at startup, retrying up to 10 times, 1 s apart, and logs each failed attempt as a warning with the driver's error code (e.g. `ECONNREFUSED`), never the URL. If the database stays unreachable, the start fails with a `fatal` log and exit code 1. The connection is closed in `onApplicationShutdown`, after the HTTP server has stopped.
- **Consequences:** The API survives a database that starts a few seconds later (local development, a container restart) and fails clearly otherwise. In Docker (feature 14), Compose also starts the API only when the database is healthy.

## D-039: Prisma errors reach clients as fixed messages and the logs without row data

- **Status:** Implemented (feature 3)
- **Context:** Prisma error messages and `meta` name tables and columns; `meta` of a failed constraint holds the whole rejected row, and a validation error's message prints the query's arguments — both can contain a password hash.
- **Decision:** `PrismaExceptionFilter` maps P2002 → 409 `UNIQUE_VIOLATION`, P2003 → 409 `FOREIGN_KEY_VIOLATION`, P2025 → 404 `NOT_FOUND`, with fixed messages. Every other Prisma error is a 500 written by the catch-all filter, which logs only the stack; a validation error is logged with its call stack but without its message. Services still throw domain errors (e.g. `SLUG_TAKEN`) themselves; this filter is the safety net.
- **Consequences:** No database details reach clients and no row values reach the logs; e2e tests check both.

## D-040: The seed is a standalone script that only inserts missing rows

- **Status:** Implemented (feature 4)
- **Context:** D-015 asks for a deterministic, idempotent seed. The API's env schema requires server settings (port, CORS) the seed does not need, and the seed needs a password and a data directory the API must not require. Node 24 runs TypeScript but does not resolve the project's `.js` import specifiers to `.ts` files. Seeded accounts need password hashes before the auth feature exists.
- **Decision:**
  - `apps/api/prisma/seed/` is a plain script run by `prisma db seed` (`migrations.seed: 'tsx prisma/seed/main.ts'`), with its own zod env schema: `DATABASE_URL` (the API's `databaseUrlSchema`), `SEED_DATA_DIR`, `SEED_DEMO_PASSWORD`. The API never reads the `SEED_*` variables.
  - Every row is mapped and validated before the first write; unknown countries and `guests > maxGuests` stop the seed there.
  - All writes run in one transaction with `createMany({ skipDuplicates: true })`, so a repeated run inserts only what is missing and never overwrites or deletes (a host's edits survive). Because `ON CONFLICT DO NOTHING` also skips rows that break the exclusion constraint, the seed counts each booking batch after inserting it and aborts when a booking is missing.
  - Passwords are hashed with bcrypt (cost 12, a salt per account), added in this feature instead of feature 5.
- **Consequences:** `npm run db:seed` is safe to run at any time, including on every container start (feature 14). A changed demo password does not reach existing accounts. The Docker image needs `tsx` and the seed sources, or a compiled seed.
