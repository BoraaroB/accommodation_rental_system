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

- **Status:** Implemented (feature 5)
- **Context:** The challenge leaves "what happens to a client's account across portals" to us and says it will ask.
- **Decision:** A user registers once and can sign in on any tenant portal with the same account. The e-mail is unique platform-wide and stored in lowercase.
- **Consequences:** No duplicate accounts per portal. Clients do not book, so no client data leaks between tenants. Host rights are per tenant through memberships ([D-007](#d-007-roles-are-not-in-the-token)), so the same identity can be a host in one tenant and a client in another.

## D-004: Three tenants split by region

- **Status:** Implemented (feature 4)
- **Context:** The data has no tenants; how to split 1,000 listings is our choice. "One tenant in the data is enough", but more show isolation better.
- **Decision:** Three tenants assigned by listing country: `adriatic` (RS/HR/SI, 363 listings), `central-europe` (DE/AT/CZ/HU/CH, 428), `west-europe` (ES/PT/NL, 209).
- **Consequences:** The split is deterministic, so tests may assert exact counts. Isolation can be demonstrated between real portals.

## D-005: A host manages all listings of their tenant

- **Status:** Implemented (feature 7)
- **Context:** `contracts.ts`: a listing has no owner. The challenge: "a host manages the listings and calendar of their tenant".
- **Decision:** Listings belong to a tenant only (`tenantId`); hosts are assigned to tenants, not to individual listings. Every host of a tenant can edit every listing of that tenant.
- **Consequences:** A simple, literal reading of the requirement. Per-listing ownership could be added later with a join table without changing the tenant model.

## D-006: Tenant isolation in the application layer

- **Status:** Implemented for `TenantGuard` (feature 5) and the listings repository (feature 6); bookings and blocked days follow in feature 7
- **Context:** "One tenant's data must never be visible on another tenant's portal"; where to enforce it is our choice.
- **Decision:** All tenant routes are under `/api/v1/t/:tenantSlug/...`; `TenantGuard` resolves the slug (unknown → 404). Repository methods for listings, bookings and blocked days always take `tenantId`; single rows are loaded with `findFirst({ where: { id, tenantId } })`, never by id alone. Postgres row-level security is deliberately out of scope.
- **Consequences:** Isolation is explicit, reviewable and proven by e2e tests (tenant A's listing through tenant B's URL → 404; a host of A on B's host routes → 403). Row-level security would add a second line of defence, but it needs the tenant passed to every database session, which is extra infrastructure for the time available; it stays a "Could".

## D-007: Roles are not in the token

- **Status:** Implemented (feature 5)
- **Context:** "What interests us is how you separate who you are from what you may do."
- **Decision:** The JWT carries only identity (`sub`, `email`). For every request, `AccessService` computes the effective role for the tenant in the URL — superadmin (platform flag), host (membership in that tenant) or client — and `ROLE_PERMISSIONS` maps it to permissions. Handlers declare `@RequirePermissions(...)`; `PermissionsGuard` enforces them.
- **Consequences:** Identity and authorization are separate concerns. Membership changes take effect immediately, without re-issuing tokens. The FE reads roles from `GET /auth/me` for UI gating only; the server remains the authority.

## D-008: Registration creates clients; the superadmin creates hosts

- **Status:** Implemented (registration in feature 5, hosts in feature 8)
- **Context:** "Registration is for clients — host accounts are created by the superadmin."
- **Decision:** `POST /auth/register` always creates a plain client. Hosts are created (or an existing user is added as a host) only through the admin panel ([D-053](#d-053-adding-a-host-reuses-an-existing-account-without-changing-it)).
- **Consequences:** No self-service privilege escalation.

## D-009: Availability is derived at read time

- **Status:** Implemented (feature 6)
- **Context:** `contracts.ts` leaves open whether availability is derived from bookings or stored separately.
- **Decision:** Availability is computed on read from bookings and blocked days. The date filter takes `from` (arrival, inclusive) and `to` (departure, exclusive). A listing is free for `[from, to)` when no non-cancelled booking has `checkIn < to AND checkOut > from` and no blocked day lies in `[from, to)` — a Prisma relation filter `none`, no raw SQL.
- **Consequences:** One source of truth, nothing to synchronise; with an index on `(listing_id, check_in)` 12.7 thousand bookings are trivial. At a larger scale, options are a per-day availability table or a `daterange` column with a GiST index.

## D-010: Blocked days, one row per day

- **Status:** Implemented (feature 7)
- **Context:** Blocked days do not exist in the data; the no-overlap guarantee covers bookings only.
- **Decision:** `BlockedDay (listingId, day)` with a composite primary key, one row per day. Blocking a day taken by an active (non-cancelled) booking returns 409 `DAY_ALREADY_BOOKED`. A day under a cancelled booking may be blocked. Blocking the same day twice is idempotent.
- **Consequences:** Simple queries (`day >= from AND day < to`) and idempotency for free through the primary key.
- **Implementation (feature 7):** the host blocks and unblocks a range `[from, to)` (`POST` body, `DELETE` query); a click in the calendar is a one-day range. Blocking is all or nothing: the first booked day is named in the 409 and no row is written. Both start today at the earliest, and one blocking request covers at most 366 days ([D-049](#d-049-a-blocking-request-covers-at-most-366-days)). Each row records who blocked it.

## D-011: Money is integer cents end to end

- **Status:** Implemented for the conversion helper (feature 1), the API (features 3–8) and the portal (feature 10); the host panel follows in feature 12
- **Context:** `contracts.ts`: money is an integer in minor units; there are no floats on purpose.
- **Decision:** Cents in the database (`Int`), the API, the URL filter parameters (`minPriceCents`, `maxPriceCents`) and all calculations. Euros exist only in form inputs and are converted once by `eurosToCents` in `@ars/shared`, which rejects amounts with more than two decimals (instead of rounding them silently — `1.005 * 100` is `100.49999…` in binary floating point), negative or non-finite amounts, and amounts too large for a safe integer.
- **Consequences:** No floating-point money errors; one schema for the URL and the API. Stay totals are computed as `nights × pricePerNightCents` by `stayTotalCents` in `@ars/shared` (feature 7). The web app shows cents through `centsToEuros` (feature 10), used only for display and to fill a euro input.

## D-012: Dates are ISO strings in UTC, with one today()

- **Status:** Implemented for the utilities (feature 1); used from feature 4 on
- **Context:** `contracts.ts` defines `IsoDate` as `YYYY-MM-DD` with no time and no offset; the data spans 2026-07-28 to 2027-04-24, partly in the past.
- **Decision:** Dates travel as `IsoDate` strings and are stored as `date`. Date math lives in `@ars/shared` as pure functions over UTC dates (`today`, `addDays`, …). `today(now = new Date())` takes the clock as a parameter. The public calendar and the filter do not offer days before today (`from ≥ today()`); hosts cannot block past days.
- **Consequences:** No time-zone bugs from local `Date` arithmetic; FE and BE agree on "today". Tests use dates relative to today (`addDays(today(), n)`), so they never go stale.
- **Year 0000 (feature 7):** an `IsoDate` starts at `0001-01-01`; Postgres has no year 0, and host queries that allow past dates would otherwise fail in the database.

## D-013: Stale booking statuses are kept as-is

- **Status:** Implemented in the API (feature 7: statuses are returned as stored); the time badge follows in feature 12
- **Context:** With today at 2026-09-24, 532 bookings are `confirmed` although their checkout has passed.
- **Decision:** Statuses are not rewritten. Availability treats `confirmed` and `completed` alike (both occupy days). The host table shows the stored status plus a time badge derived from the dates and `today()`: past, in progress or upcoming.
- **Consequences:** The data stays exactly as delivered; the UI still tells the host what is happening now.

## D-014: Listing edits cannot break booking invariants

- **Status:** Implemented (feature 7)
- **Context:** `contracts.ts`: `guests` is 1 to the listing's `maxGuests`; `bedrooms` is 0 for a studio.
- **Decision:** Lowering `maxGuests` below the guest count of an active booking returns 409 `MAX_GUESTS_BELOW_BOOKING`. The edit schema requires `bedrooms === 0` for a studio and `maxGuests` between 1 and 12 (400 otherwise).
- **Consequences:** Host edits cannot put existing data into a state the contract rules out.
- **Implementation (feature 7):** "active" means not cancelled, past stays included, as everywhere else. The edit body carries all five editable fields (title, type, price, guests, bedrooms), so the studio rule can see the type and the bedrooms together; integer fields stop at the column's range.

## D-015: CSV is loaded once by a TypeScript seed

- **Status:** Implemented (feature 4); how it runs and stays idempotent: [D-040](#d-040-the-seed-is-a-standalone-script-that-only-inserts-missing-rows)
- **Context:** "How you load the data into the database is your choice." `contracts.ts`: "The mapping is part of the work."
- **Decision:** A deterministic, idempotent TypeScript seed (`npm run db:seed`) parses the CSV with `csv-parse`, maps and validates every row with zod (snake_case strings → typed camelCase), and inserts with batched `createMany`. The application never reads the CSV at runtime.
- **Consequences:** The mapping is visible and unit-tested; an invalid row stops the seed with a clear message. Postgres `COPY` would be faster but would hide the mapping in SQL.

## D-016: contracts.ts is the API response shape

- **Status:** Implemented for `ListingDto` (feature 6); `BookingDto` follows in feature 7
- **Context:** By its own comment `contracts.ts` is neither a DB entity nor an API contract.
- **Decision:** `ListingDto` and `BookingDto` are used as the API response shapes. `contracts.ts` stays unchanged in `packages/shared`. Zod schemas mirror them, and a type-level test keeps the two aligned. The DB → API mapper converts `Date` to `IsoDate` and `Decimal` to `number | null` and never exposes `tenantId`.
- **Consequences:** The FE consumes the delivered types directly.

## D-017: Listing filters live in the URL

- **Status:** Implemented (feature 10)
- **Context:** The portal filters by city, guests, price range and date range.
- **Decision:** The URL search parameters are the only source of truth for filters; they are not duplicated in Redux or component state. The same `listingQuerySchema` validates them on the FE and the BE. Invalid parameters drop only themselves. "Apply" resets the page to 1.
- **Consequences:** Shareable links, working refresh and back button, and natural RTK Query caching, because the query arguments are exactly the URL.
- **Implementation (feature 10):** `parseListingFilters` checks each parameter on its own through `listingQuerySchema.shape`, then the whole schema; a failing range drops both dates, a maximum below the minimum drops the maximum. `toSearchParams` leaves out empty and default values (`sort=newest`, `page=1`). Two forms write the URL: the search bar (city, dates, guests) and the price filter (euros, converted with `eurosToCents`); both validate with `zodResolver(listingQuerySchema)`. `pageSize` is not a URL parameter.

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

- **Status:** Implemented for the API (features 2–8) and the portal (feature 10); features 11–13 follow
- **Decision:** Input and response DTO schemas live in `packages/shared` and are used by the NestJS validation pipe, by react-hook-form resolvers and by RTK Query `argSchema` / `responseSchema`. RTK response validation runs in development and tests and is skipped in production (`skipSchemaValidation: import.meta.env.PROD`) for performance; `catchSchemaFailure` turns a mismatch into a normal error state.
- **Consequences:** FE and BE validation cannot disagree; contract drift shows up during development.
- **Exception (feature 10):** the listing list endpoint has no `argSchema`. RTK Query types `argSchema` as a schema whose input and output are the endpoint's argument, and `listingQuerySchema` coerces strings, so its input type differs from its output. The argument is already the output of `listingQuerySchema` (`useListingFilters`), so a second check would add nothing.

## D-022: Configuration comes only from validated env

- **Status:** Implemented for the API (feature 2) and the web app (feature 9); Docker follows in feature 14
- **Decision:** No URLs, hosts, ports, origins or secrets in code. Each app reads its environment in one module, validates it with zod at startup and fails fast with a clear error. `.env.example` files are committed without secrets; `.env*` is ignored by git.
- **Consequences:** The same build runs locally and in Docker with different `.env` files.

## D-023: Null rating is shown as "New" and sorted last

- **Status:** Implemented (features 6 and 10)
- **Context:** 109 listings have `rating: null` — "a real state in the data, not a gap in it".
- **Decision:** The UI shows a "New" badge and no stars; sorting by rating puts nulls last. Ratings stay on the data's 5-point scale.
- **Consequences:** Unreviewed listings are neither hidden nor ranked as zero.

## D-024: Placeholder images per property type

- **Status:** Implemented (feature 10)
- **Context:** The data has no photos.
- **Decision:** Result cards show a placeholder with an icon for the `propertyType`: a lucide-react icon (the UI kit's icon set, [D-062](#d-062-the-ui-kit-is-shadcnui-on-base-ui)) on a gradient of the primary colour.
- **Consequences:** A usable, honest UI without fake photos.

## D-025: Booking-style layout, not branding

- **Status:** Implemented (features 9 and 10)
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

- **Status:** Implemented for the API (feature 2) and the web app (feature 9); the root file grows in feature 14
- **Context:** Feature 1 creates no application that reads environment variables.
- **Decision:** Feature 1 only adds the ignore rules (`.env*` ignored, `.env.example` allowed). `apps/api/.env.example` is created in feature 2, `apps/web/.env.example` in feature 9, and the root (Docker) `.env.example` in features 2 and 14.
- **Consequences:** Every variable appears together with the schema that validates it; no dead configuration.

## D-028: Tenant slugs are kebab-case, with reserved words

- **Status:** Implemented (the lookup in feature 6; creation, editing, uniqueness, reserved words and the length limit in feature 8)
- **Decision:** A slug must be kebab-case, at most 63 characters, and unique (duplicate → 409 `SLUG_TAKEN`). `admin`, `api`, `login` and `register` are reserved, so `/admin` never collides with `/:tenantSlug`. The shared `tenantSlugSchema` holds all of these rules, so a reserved or too long slug is a 400 when it is written; `TenantsService.getBySlug` answers any value the schema rejects with 404 `TENANT_NOT_FOUND` without querying the database. The slug can be changed; the old portal URL is a 404 from then on.
- **Consequences:** Portal URLs are predictable and cannot shadow application routes. A malformed slug (for example one with a NUL byte, which Postgres text rejects) is a 404, not a 500.
- **Length (feature 8):** 63 is the length of a DNS label, so a slug could also become a subdomain. Decided by the repository owner after the review showed that a slug of about 4,000 characters exceeded the row size of the unique index and made creation a 500. Two creations racing for one slug get 201 and 409 `UNIQUE_VIOLATION` (the Prisma filter), as registration does for e-mails.

## D-029: Deleting a tenant cascades; users stay

- **Status:** Implemented (cascading foreign keys in feature 3, `DELETE /admin/tenants/:tenantId` in feature 8)
- **Decision:** Deleting a tenant cascades to its listings, bookings, blocked days and host memberships. Users are not deleted, because identity is global ([D-003](#d-003-global-client-identity)). The admin UI asks for the slug to be typed as confirmation.
- **Consequences:** No orphaned tenant data; a person who hosted the deleted tenant keeps their account.

## D-030: RTK Query and Redux Toolkit, no Zustand

- **Status:** Implemented (feature 9) — the store with `baseApi` and the UI slice; the auth slice follows in feature 11
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

## D-041: Permission checks are bound per controller and fail closed

- **Status:** Implemented (feature 5)
- **Context:** D-007 separates identity from authorization. Tenant routes need three checks in a fixed order — a signed-in user, a known tenant, the permission in that tenant — and a forgotten check must not open a route.
- **Decision:**
  - `AuthGuard` is the only global guard (`APP_GUARD`); `@Public()` opts a handler or controller out.
  - Tenant controllers declare `@UseGuards(TenantGuard, PermissionsGuard)`; platform controllers (the admin panel) `@UseGuards(PermissionsGuard)`; public tenant controllers `@Public()` + `@UseGuards(TenantGuard)`. Nest runs global guards first, then controller guards left to right, so the order is Auth → Tenant → Permissions: an anonymous caller gets 401 before an unknown slug gets 404, and 404 comes before 403.
  - A handler behind `PermissionsGuard` without `@RequirePermissions` is denied (403), even to a superadmin.
  - Permissions: `listing:read|update`, `blocked-day:read|write`, `booking:read` (host panel); `tenant:read|write`, `host:read|write` (admin panel). `ROLE_PERMISSIONS`: a client has none (the portal is public), a host has the host-panel set, a superadmin has every permission on every tenant.
  - Error codes: 401 `AUTHENTICATION_REQUIRED` (no Bearer token) or `INVALID_TOKEN` (bad, expired, or the user no longer exists); 404 `TENANT_NOT_FOUND`; 403 `INSUFFICIENT_PERMISSIONS`.
- **Consequences:** The checks a route needs are visible on its controller. The one gap is a controller that uses `@RequirePermissions` but forgets `PermissionsGuard`; every guarded controller therefore gets e2e cases for 401 and 403 (features 7 and 8). The guards were tested in feature 5 through test-only routes; since feature 8 the platform case is covered by the admin panel's e2e, and only the tenant test route remains.

## D-042: Access tokens, registration and sign-in

- **Status:** Implemented (feature 5)
- **Context:** "Keep auth simple — we are not asking for SSO, 2FA or refresh-token rotation."
- **Decision:**
  - One access token: a JWT signed with HS256 (verification accepts HS256 only), claims `sub` and `email`, lifetime `JWT_EXPIRES_IN` in seconds. `JWT_SECRET` must have at least 32 characters; the placeholder in `.env.example` is shorter on purpose, so a copied example does not start. No refresh tokens or revocation: a token is valid until it expires, but roles and a deleted user are checked on every request.
  - Passwords: bcrypt (cost 12) behind a `PasswordHasher` contract; the seed uses the same `BcryptPasswordHasher`. A password has 8 characters to 72 bytes, the most bcrypt hashes.
  - E-mails are trimmed and lowercased by the shared `emailSchema` on the way in (D-003).
  - `POST /auth/register` returns `201` with the new client's profile and no token; the client then signs in with `POST /auth/login`. An e-mail in use is 409 `EMAIL_TAKEN`.
  - `POST /auth/login` answers an unknown e-mail and a wrong password with the same 401 `INVALID_CREDENTIALS`; the failed attempt is logged with the e-mail only.
  - `GET /auth/me` needs a signed-in user but no permission ("who you are").
- **Consequences:** Registration tells whether an e-mail has an account; this is accepted for a portal where accounts carry no private data, so login does not add timing protection. Rate limiting and account lockout are possible improvements outside the plan.

## D-043: One global validation pipe for zod schemas

- **Status:** Implemented (feature 5)
- **Context:** In NestJS 12, `@Body({ schema })` / `@Query({ schema })` only attach a Standard Schema to the parameter; `StandardSchemaValidationPipe` validates against it.
- **Decision:** `ValidationModule` (`src/core/validation/`) registers `StandardSchemaValidationPipe` as `APP_PIPE` with its defaults: handlers receive the parsed value (trimmed, lowercased, coerced), and a failure is a 400 `BAD_REQUEST` with one `path: message` entry per issue. Parameters without a schema and custom decorators are not validated.
- **Consequences:** Every endpoint validates by naming a shared schema; nothing is validated by hand in controllers. Unknown body fields are dropped by `z.object`, so `isSuperadmin` in a registration body has no effect.

## D-044: A portal shows only its own tenant's listings

- **Status:** Implemented (feature 6)
- **Context:** Challenge item 1 asks for "a list of all listings"; the challenge also says one tenant's data must never be visible on another tenant's portal.
- **Decision:** "All listings" means all listings of the portal's tenant. Every portal endpoint lives under `/api/v1/t/:tenantSlug/...`, and the city list, the listing list, the detail and availability are scoped to that tenant. There is no endpoint that lists listings across tenants.
- **Consequences:** Follows from D-004 and D-006. A listing of tenant A requested through tenant B's portal is a 404 `LISTING_NOT_FOUND`, the same answer as for an id that does not exist.

## D-045: Listing pages: 24 by default, at most 48, ties broken by id

- **Status:** Implemented (feature 6)
- **Context:** The plan fixes the page shape `{ items, page, pageSize, total }` and a page size of 24 (at most 48). Sorting by price, rating or date leaves ties (the 25 fixture listings of the e2e test tie on every key).
- **Decision:**
  - `page` (≥ 1) and `pageSize` (1–48, default 24) come from the shared `paginationQuerySchema`. Asked for by the repository owner: a client may send a page size, the server caps it.
  - Every sort ends with `id asc`, so a listing never moves between pages or shows up twice.
  - A page past the end is a 200 with no items and the real `total`.
  - `findMany` and `count` run in parallel with `Promise.all`. A batch transaction would not make them consistent under READ COMMITTED, so it would only add a round trip.
  - Price filters are capped at 2,147,483,647 cents, the largest value of the 32-bit price column, so an out-of-range price is a 400 instead of a database error. `page` has no upper bound; a page past the end is simply empty. An empty number (`?guests=`) counts as not sent instead of being coerced to 0. Decided by the repository owner after the review showed the 500.
  - The short, bounded lookup lists (`GET /tenants`, `GET /t/:tenantSlug/cities`) are plain arrays.
- **Consequences:** Stable, cacheable pages. Offset pagination slows down on deep pages; keyset pagination is the option at a larger scale.

## D-046: Public availability lists the taken days of a range

- **Status:** Implemented (feature 6)
- **Context:** Challenge item 4: "On a single listing — when that listing is available to book." The calendar needs to know which days to strike through.
- **Decision:**
  - `GET /t/:tenantSlug/listings/:id/availability?from&to` returns `{ from, to, unavailableDays }`: the days of `[from, to)` taken by a non-cancelled booking or a blocked day, sorted. It does not say which of the two takes a day.
  - The range follows the list's date filter: both dates required, `to` after `from`, `from` not before today (D-012).
  - The filter and the calendar share one predicate (`activeStaysOverlapping`, `blockedDaysWithin`), so they cannot disagree. `unavailableDays` expands and clips the stays in a pure, unit-tested function.
- **Consequences:** The work grows with the occupied days in the range, not with its length. Visitors cannot tell a host's blocked days from bookings.

## D-047: The portal's configuration comes with the tenant lookup

- **Status:** Implemented (feature 6)
- **Context:** Every portal page needs the tenant's name and branding, and `TenantGuard` already loads the tenant for every tenant route.
- **Decision:** `TenantGuard` selects the public configuration (logo URL, primary colour, contact e-mail, currency) with the slug lookup, so `GET /t/:tenantSlug` needs no second query. The response (`PublicTenant`) and `GET /tenants` leave out the tenant's `id`.
- **Consequences:** Four more columns on a lookup that runs anyway. Internal ids stay out of the portal, which addresses tenants by slug only; the admin panel uses the id ([D-051](#d-051-the-admin-panel-addresses-tenants-by-id)).

## D-048: Host bookings carry the listing's title and a total at its current price

- **Status:** Implemented (feature 7)
- **Context:** Challenge item 9: "Viewing bookings." The host table shows listing, dates, nights, guests, status and total. `BookingDto` has none of the listing's data, and bookings carry no price.
- **Decision:**
  - `GET /t/:tenantSlug/host/bookings` returns `Page<HostBooking>`: `BookingDto` plus `listingTitle` and `totalCents`. `BookingDto` stays the base shape (D-016).
  - The total is the nights times the listing's **current** price per night (`stayTotalCents`).
  - Filters: `listingId`, `status`, and `from`/`to` keeping the stays that take a day of `[from, to)` — the calendar's rule, whatever the status. Past dates are allowed. Sorted by check-in, then id.
  - A `listingId` of another tenant gives an empty page, like any filter that matches nothing.
- **Consequences:** One query serves the table and the host calendar's bookings. A price change also changes the totals of past bookings; storing the price per booking would need the data to have it.

## D-049: A blocking request covers at most 366 days

- **Status:** Implemented (feature 7) — not in the plan, decided by the repository owner
- **Context:** Blocking writes one row per day (D-010). Without a limit, one request such as `to=9999-12-31` would build and insert millions of rows.
- **Decision:** `blockDaysSchema` rejects a range longer than `MAX_BLOCKED_RANGE_DAYS` (366) with 400. Unblocking and reading need no limit: they are one range query each.
- **Consequences:** A host blocks a year at a time at most; the calendar selects far shorter ranges anyway.

## D-050: The host listing search matches the title or the city

- **Status:** Implemented (feature 7)
- **Context:** The host panel's listing table has "search" in the plan, without saying what it searches.
- **Decision:** `q` matches a substring of the title or the city, regardless of case (Prisma `contains` with `mode: 'insensitive'`). Prisma 7 does not escape `contains`, so `%`, `_` and `\` are escaped before the query and match as plain text. A blank `q` counts as not sent. The table is newest first, like the portal.
- **Consequences:** A sequential scan over one tenant's listings, trivial at hundreds of rows.

## D-051: The admin panel addresses tenants by id

- **Status:** Implemented (feature 8)
- **Context:** The plan's admin routes are `/admin/tenants/:id`. The slug is editable, and the tenant route parameter must never be named `id`; a parameter named `tenantSlug` would make `PermissionsGuard` expect `TenantGuard` to have run.
- **Decision:** Admin routes take `:tenantId` (a uuid; anything else is a 400), and `AdminTenant` is `PublicTenant` plus the `id`. Admin routes are platform routes: `@UseGuards(PermissionsGuard)` without `TenantGuard`, so the role is computed without a tenant — superadmin or client — and a host membership never grants admin access. An unknown id is 404 `TENANT_NOT_FOUND`. The admin lists (`GET /admin/tenants`, `GET .../hosts`) are plain arrays, like the other short lookup lists ([D-045](#d-045-listing-pages-24-by-default-at-most-48-ties-broken-by-id)).
- **Consequences:** An admin URL survives a slug change. The portal keeps addressing tenants by slug only ([D-047](#d-047-the-portals-configuration-comes-with-the-tenant-lookup)).

## D-052: Tenant configuration is edited as a merge patch

- **Status:** Implemented (feature 8)
- **Context:** The challenge: "Name and slug are required; anything beyond that is up to you — logo, currency, primary colour, contact email." The plan names `PATCH` without saying whether an edit sends every field.
- **Decision:**
  - `POST /admin/tenants` takes `tenantCreateSchema`: `slug` and `name` required; `logoUrl`, `primaryColor` and `contactEmail` may be left out or `null`.
  - `PATCH /admin/tenants/:tenantId` takes `tenantUpdateSchema`, the same fields all optional, with JSON Merge Patch meaning: a field that is not sent stays as it is, `null` clears an optional field, and an edit without a known field is a 400. Prisma's `update` gives `undefined` and `null` exactly this meaning. Chosen by the repository owner as the HTTP standard for `PATCH`; unlike the listing edit ([D-014](#d-014-listing-edits-cannot-break-booking-invariants)), the tenant has no rule across fields that needs the whole object.
  - Formats, because the web app renders these values: the logo is an http(s) URL on a domain (`z.httpUrl()`, so `javascript:` and `data:` are rejected), the colour is `#rrggbb` (lowercased), the contact e-mail goes through `emailSchema`. The name is plain text (trimmed, not blank, no control characters). `currency` is not an input: EUR is the only currency, so the database default fills it.
- **Consequences:** The web form may still send every field; that is a valid patch. A tenant with a new slug moves its portal ([D-028](#d-028-tenant-slugs-are-kebab-case-with-reserved-words)). Text without control characters (`plainTextSchema`) is now one shared rule for listing titles and cities, tenant names and user names; a NUL byte in a registration name was a 500 before feature 8 and is now a 400.

## D-053: Adding a host reuses an existing account without changing it

- **Status:** Implemented (feature 8)
- **Context:** "Adding host accounts to a tenant. A tenant may have several hosts." Identity is global ([D-003](#d-003-global-client-identity)): the e-mail the superadmin types may already belong to a client, or to the host of another tenant.
- **Decision:**
  - `POST /admin/tenants/:tenantId/hosts` always takes `{ email, name, password }` (the registration rules). A new e-mail creates the account and its membership in one nested write, so neither exists without the other. An existing account only gets the membership: its name and password never change, since they belong to that person. The response carries `accountCreated`, so the admin knows when the password was not applied.
  - An account that already hosts the tenant is 409 `ALREADY_HOST`; removing a user who does not host the tenant is 404 `HOST_NOT_FOUND`. Removing a host deletes only the membership; the account stays and is a client of that tenant from the next request on ([D-007](#d-007-roles-are-not-in-the-token)).
  - `HostsModule` owns the memberships; it reads accounts through the users repository and hashes with the hasher `AuthModule` exports. The nested write makes `PrismaHostsRepository` a second writer of users, next to `PrismaUsersRepository.create`.
  - Logs name the user and tenant ids, never the e-mail or the password.
- **Consequences:** One person can host several tenants and stay a client elsewhere with one account. The superadmin knows a new host's first password; an invitation or a forced password change is a possible improvement.

## D-054: A layout's error boundary sits on a pathless content route

- **Status:** Implemented (feature 9)
- **Context:** The plan wants an error inside a portal, host or admin page to take down only the content, with the header and navigation still usable. In React Router a route's `ErrorBoundary` renders in place of that route's own element, so a boundary on the layout route would replace the layout as well.
- **Decision:** Each layout route has one pathless child route, created by `contentBoundary(children)` in `app/router.ts`, whose `ErrorBoundary` is `RouteErrorState`; the layout's pages go inside it. The root route has `RootErrorBoundary`, a full-page fallback that uses a reload and a plain link, so it works even when the app's state is broken. Widgets use the `ErrorBoundary` class.
- **Consequences:** Three levels of boundaries, as planned; a page added later is protected by placing it in `contentBoundary([...])`. The host panel nests inside the portal's boundary and has its own, so a failing host page keeps both headers.

## D-055: Every client error is reported once

- **Status:** Implemented (feature 9)
- **Context:** React 19 calls the root's `onCaughtError` for every error a boundary catches, and the plan also has the widget `ErrorBoundary` report in `componentDidCatch`. Both would report the same error twice.
- **Decision:** `reportError()` in `lib/logger.ts` is the single reporting function. The root hooks `onUncaughtError`, `onRecoverableError` and `onCaughtError` call it; `onCaughtError` skips errors whose boundary is the widget `ErrorBoundary`, which has reported them already. Route errors are reported through `onCaughtError`.
- **Consequences:** A monitoring service added to `reportError()` sees each error once. React Router still writes its own console line for a route render error; that is console output only, not a report.

## D-056: Colours come only from design tokens

- **Status:** Implemented (feature 9); the tokens became the shadcn/ui theme in feature 10
- **Context:** "UI uses design tokens only (no raw hex colours)"; a tenant's primary colour must override the brand colour at runtime.
- **Decision:** `styles/tokens.css` defines the tokens in Tailwind's `@theme` (primary, on-primary, surface, surface-raised, text, muted, border, danger, success, two radii, the font) and removes Tailwind's default palette with `--color-*: initial`, so a raw colour utility such as `bg-blue-500` does not exist. Shades come from opacity modifiers (`bg-primary/90`), which Tailwind computes from the CSS variable. `@theme inline` is not used, so overriding `--color-primary` on a layout root recolours everything under it.
- **Consequences:** Components cannot drift from the palette; tenant branding (feature 10) is one CSS variable.
- **Changed in feature 10** ([D-062](#d-062-the-ui-kit-is-shadcnui-on-base-ui)): the tokens follow the shadcn/ui theme — each colour is a variable on `:root` (`--background`, `--foreground`, `--card`, `--popover`, `--primary`, `--primary-foreground`, `--secondary`, `--muted`, `--muted-foreground`, `--accent`, `--destructive`, `--success`, `--border`, `--input`, `--ring`, `--radius`), in OKLCH, exposed to Tailwind by `@theme inline` (so `bg-primary` compiles to `var(--primary)`). The default palette is still removed, the one palette class the generated kit used (`bg-black/10`) became `bg-foreground/10`, and a tenant portal overrides `--primary` and `--ring` on the document (`useBrandColor`), so popups rendered into `<body>` follow it too. The kit's `dark:` classes apply only under a `.dark` ancestor, so the system's dark mode cannot half-apply them; there is no dark theme yet.

## D-057: Web tests run in jsdom with Testing Library

- **Status:** Implemented (feature 9)
- **Context:** Vitest `^4.1` is the test runner in every workspace (D-026); the web app needs a DOM.
- **Decision:** `apps/web/vitest.config.ts` uses the React plugin, `environment: 'jsdom'` and a setup file that loads `@testing-library/jest-dom/vitest` and calls Testing Library's `cleanup` after each test (Vitest globals are off, so it cannot register itself). `test.env` sets `VITE_API_BASE_URL`, because Vitest serves `import.meta.env` from it, so tests need no `.env` file. The Vitest config does not reuse `vite.config.ts`, whose dev-server env is required only by the dev server. Tests render with a fresh store (`renderWithStore`) and routes with `createMemoryRouter`; failing requests are simulated through a thunk rejected with value, not a mocked `fetch`.
- **Consequences:** Component, router and store tests run in about a second without a browser or a server.
- **Changed in feature 10:** pages that load data are tested through a stubbed `fetch` ([D-059](#d-059-web-tests-stub-fetch-behind-an-absolute-test-api-url)).

## D-058: The web app is organised by feature, with conventional folder names

- **Status:** Implemented (feature 9) — asked for by the repository owner
- **Context:** The plan grouped shared web code under `shared/` (`shared/ui`, `shared/api`, `shared/config`, `shared/lib`) and put the store and routing files side by side in `app/`. The repository owner found this hard to navigate and asked for the common industry layout for large projects with many developers.
- **Decision:** The layout follows Bulletproof React, the most widely cited feature-based React structure, with a separate `pages/` folder:
  - `app/` — the router (`router.ts`) and the layouts;
  - `pages/` — route components (e.g. `NotFoundPage`, `pages/errors/` for the route error boundaries; feature pages from feature 10);
  - `features/<name>/` — one folder per domain (`listings`, `auth`, `host`, `admin`) with `api.ts` (injected endpoints), `components/` and `hooks/`;
  - shared code in conventional folders: `components/` (`components/ui` is the UI kit), `hooks/` (hooks shared by several features; created with the first one), `store/` (store, slices, middleware and the typed `useAppDispatch` / `useAppSelector`, next to the store as in the Redux Toolkit docs), `api/` (`baseApi`, `errors`), `config/` (`env`), `lib/` (`logger`, `utils`, `format`; `cx` until feature 10), plus `styles/` and `test/`.
  - Dependencies point one way: `app` → `pages` → `features` → shared folders; shared folders never import from `features/` or `pages/`.
- **Consequences:** Familiar names; one feature still lives in one folder. The plan's paths map as `shared/ui` → `components/ui`, `shared/api` → `api`, `shared/config` → `config`, `shared/lib` → `lib`, `app/store.ts` → `store/store.ts`.

## D-059: Web tests stub `fetch` behind an absolute test API URL

- **Status:** Implemented (feature 10)
- **Context:** Portal pages load data through RTK Query. Testing them should cover the whole chain (URL filters → request → response schema → UI) without a server or a new dependency. Node's `Request`, which `fetchBaseQuery` builds, rejects a relative URL such as `/api/v1/...`; this was checked in the test environment.
- **Decision:** The Vitest config sets `VITE_API_BASE_URL` to `http://api.test/api/v1` (`.test` is a reserved top-level domain). `test/setup.ts` replaces `fetch` before every test; `stubApi({ 'GET /t/adriatic': body })` answers by method and path relative to the base URL, and a request no route answers fails the test when it ends. Tests read the query a page sent with `lastQuery(path)`.
- **Consequences:** Page tests prove what the page asks the API for, including the URL's filters, and nothing can reach a network. jsdom lacks `window.scrollTo` (called by `ScrollRestoration`) and `matchMedia`, so the setup stubs the first and `useMediaQuery` treats the second as "not desktop" (one calendar month). The Base UI controls need no stand-ins: tests open selects, the city combobox, the date picker and the filter sheet by role and label.

## D-060: The availability calendar shows a year ahead, one request per view

- **Status:** Implemented (feature 10)
- **Context:** Challenge item 4: "On a single listing — when that listing is available to book." The plan asks for "a calendar for the next few months", two months side by side on desktop and one on phones, with taken days struck through. The public availability endpoint answers for any range from today on (D-046).
- **Decision:** `AvailabilityCalendar` (in the shared `components/`, because the host panel reuses it for blocking in feature 12) is presentational: it gets the first month, the navigation limits and `getDayStatus(day)`. It is the UI kit's Calendar (react-day-picker) without a selection mode: `modifiers` mark unavailable, past and loading days and the searched stay, `labelGridcell` gives each day its date and status for screen readers, and `timeZone="UTC"` keeps the grid on the same calendar days as the `IsoDate`s (D-012; checked with tests run in other time zones). The listing page moves it month by month from the current month to 11 months ahead and fetches two months, from today on, in one request — the two shown on desktop; on phones, which show one, the next month is already loaded. Days are past, available, unavailable or loading; the searched stay is highlighted. "Available for your dates" comes from a separate request for exactly `[from, to)`.
- **Consequences:** Short requests and cached months when the visitor goes back; a stay searched further ahead than a year opens at the last month the calendar allows.

## D-061: The filter drawer is the UI kit's Sheet

- **Status:** Implemented (feature 10)
- **Context:** On phones the price filter opens in a drawer, which must trap focus, close on Esc and keep the page behind it inert.
- **Decision:** The drawer is the shadcn/ui `Sheet` ([D-062](#d-062-the-ui-kit-is-shadcnui-on-base-ui)), a Base UI `Dialog` sliding in from the right. Its open state lives in the `ui` slice, as the plan says: the "Filters" button opens it, and `onOpenChange` (Esc, the close button, a click on the backdrop, Apply) closes it. Its content mounts only while it is open, so the form starts from the URL every time. A first version used a native `<dialog>`; it was replaced with the UI kit.
- **Consequences:** Base UI handles focus, Esc and the inert background; no focus-trap code of our own.

## D-062: The UI kit is shadcn/ui on Base UI

- **Status:** Implemented (feature 10) — asked for by the repository owner; a change of plan
- **Context:** The plan had a hand-written UI kit (feature 9) and native form controls. After seeing the portal in the browser, the repository owner found the native `<select>`, the date inputs, the hand-made calendar and the toasts too plain and asked for the libraries large production apps use.
- **Decision:**
  - **shadcn/ui** (CLI 4.21, `components.json`, style `base-nova`) on **Base UI** primitives (`@base-ui/react` 1.8), shadcn's default since July 2026 ([changelog](https://ui.shadcn.com/docs/changelog), checked 2026-09-26; `shadcn init --help` offers `--base base|radix|aria`). The CLI copies each component's source into `components/ui`, so the code is ours to change; components are added with `npx shadcn add <name>` and then adapted.
  - The kit: `button`, `input`, `label`, `field`, `input-group`, `select`, `combobox`, `popover`, `calendar` (react-day-picker 10), `sheet`, `pagination`, `card`, `badge`, `skeleton`, `empty`, `sonner`, and `separator` and `textarea`, which `field` and `input-group` use, plus our own `form-field` (label, hint and error wired to the control), `empty-state`, `error-state`, `query-state` and `error-boundary`. Icons come from lucide-react; the font is Geist, self-hosted through `@fontsource-variable/geist`.
  - Adapted after generation: links are router `Link`s styled with `buttonVariants` (Base UI's Button must not render links), including `PaginationLink`; the Sonner toaster has one light theme (no `next-themes`); unused `date-fns` and `next-themes` were removed. `@/` resolves to `src/` for the generated files; our own code keeps relative imports.
  - Tenant branding reaches popups: they render into `document.body`, outside the portal's markup, so `useBrandColor` sets `--primary` and `--ring` on the document while a portal is shown (and removes them when it is left); the landing page's cards keep an inline `brandStyle`.
  - The portal is rebuilt on it: a searchable city combobox, one date range picker (Popover + Calendar, `mode="range"`, two months on desktop, one on phones, past days disabled, `timeZone="UTC"`), selects for guests and sort, the filter sheet, and the availability calendar ([D-060](#d-060-the-availability-calendar-shows-a-year-ahead-one-request-per-view)).
  - oxlint's `only-export-components` is off for `components/ui` only: the kit exports variant helpers (`buttonVariants`) next to components.
- **Consequences:** An accessible, familiar look with little code of our own, and the same kit for the auth, host and admin pages. The JS bundle grows (about 910 kB before gzip, 290 kB gzipped); loading pages lazily is noted as a possible improvement. File names in `components/ui` are kebab-case, as the CLI writes them.

## D-063: Toasts are Sonner, outside Redux

- **Status:** Implemented (feature 10) — replaces the toast state the plan put in the `ui` slice
- **Context:** The plan kept toasts in the `ui` slice and rendered them with a hand-written `Toast`. The repository owner asked for the toast library large apps use.
- **Decision:** Sonner (2.0) through the shadcn `sonner` component: `<Toaster position="bottom-right" visibleToasts={3} closeButton />` in `RootLayout`. `rtkErrorMiddleware` calls `toast.error(message, { description: 'Request id: …' })` for 403, 5xx and network errors, as before. The `ui` slice keeps only the filter sheet's state.
- **Consequences:** Stacking, timers, swipe-to-dismiss and a live region come from the library; the middleware test checks the `toast.error` calls instead of the slice.
