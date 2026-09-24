---
paths:
  - 'apps/api/**'
---

# API rules (NestJS 12, ESM)

## Structure: modular, readable, easy to extend

- **One Nest module per area.** Infrastructure lives in `src/core/<area>/` (config, logging, request-context, errors, database); features in `src/<feature>/` (e.g. `src/listings/`). Everything an area needs — providers, middleware, filters, specs — sits in its folder.
- **Every entity has its own module** in `src/<entities>/` (plural, kebab-case): `users/`, `tenants/`, `listings/`, `bookings/`, `blocked-days/` — each with `<entities>.module.ts`, `<entities>.controller.ts`, `<entities>.service.ts`, plus `<entities>.repository.ts` (interface + token), `prisma-<entities>.repository.ts` (implementation) and `<entities>.mapper.ts` when it has data. Non-entity features (`auth/`, `health/`) use the same layout. When one entity is served to different audiences with different permissions, its module holds one controller per audience in the same folder (`listings.controller.ts` for the public portal, `host-listings.controller.ts` for the host panel). Input and response DTOs are the zod schemas in `@ars/shared`, so there is no `dto/` folder. Specs sit next to the file they test. A module gets a service or controller only when a use case needs one (e.g. `users/` has only its repository while auth and access read it directly); no empty pass-through classes.
- **Components are generated in their folder with the Nest CLI**, run from `apps/api`: `npx nest g module <entities>`, `npx nest g controller <entities>`, `npx nest g service <entities>`. They land in `src/<entities>/` with `.js` imports, and the CLI registers the module in `AppModule` — move that import under "Features".
- **`AppModule` only imports modules.** It declares no providers, controllers or middleware itself, so it reads as the table of contents of the API.
- **Each module file is its map:** a one-line header comment saying what the module is for, then `imports` / `controllers` / `providers` / `exports`. A module imports every module whose exports it uses — no hidden globals (Nest's `ConfigModule` with `isGlobal` is the only one).
- **A module applies its own middleware** in `configure(consumer)`. The only exception is middleware that must run before Nest's body parser; `app.setup.ts` registers it with `app.use(app.get(X).use)`, with a comment saying why.
- **Dependency injection everywhere.** Anything with dependencies is a provider created by the container and receives them through its constructor. No `new` for injectables in app code (tests may). Code outside the container (`main.ts`, `app.setup.ts`) gets instances with `app.get(X)`.
- **Interfaces where they belong (industry-standard NestJS):**
  - **Boundaries get a contract.** Data access (one repository per aggregate, implemented with Prisma) and infrastructure services (password hashing, token signing, anything external) are defined as a TypeScript `interface` plus an injection token, and registered with `{ provide: LISTINGS_REPOSITORY, useClass: PrismaListingsRepository }`. Services inject the contract with `@Inject(LISTINGS_REPOSITORY)`, so the dependency is explicit and unit tests pass an in-memory fake. The token is a `Symbol` exported next to the interface (`listings.repository.ts`); the implementation lives in its own file (`prisma-listings.repository.ts`). Infrastructure contracts follow the same pattern: `password-hasher.ts` (interface + `PASSWORD_HASHER`) and `bcrypt-password-hasher.ts` (implementation). Request shapes set by guards live in their own file (`auth-user.ts`, `tenant-request.ts`), not in the guard.
  - **Shapes are types:** DTOs come from the zod schemas in `@ars/shared` (`z.infer`); internal data shapes are `interface`s.
  - **Framework contracts are implemented explicitly:** `NestMiddleware`, `ExceptionFilter`, `CanActivate`, `NestInterceptor`, `PipeTransform`, `NestModule`, `LoggerService`, lifecycle hooks.
  - **No abstraction for its own sake:** Nest's own services (`ConfigService`, `Logger`) are used directly, not wrapped; controllers, modules and pure helpers get no interface; no generic base classes (`BaseRepository<T>`, `BaseService<T>`).
- **Extend by adding, not editing:** a new feature is a new module imported by `AppModule`; new error handling is a new filter, new checks a new guard — existing classes stay untouched.
- **One responsibility per file.** The file suffix names the Nest role (`.module.ts`, `.controller.ts`, `.service.ts`, `.repository.ts`, `.middleware.ts`, `.guard.ts`, `.filter.ts`, `.mapper.ts`, `.schema.ts`, `.decorator.ts`, and `.errors.ts` for a module's domain exceptions); the class name ends with the role (`ListingsService`, `RequestIdMiddleware`). Plain helpers (pure functions) go in a file named after what they do.
- **Express types only at the HTTP edge** (middleware, filters). Services and repositories never see `Request` / `Response`.
- `main.ts` only bootstraps. `app.setup.ts` holds app-level setup shared with the e2e tests (prefix, versioning, CORS, logger, early middleware).

## Conventions

- ESM project: relative imports end with `.js` (`import { AppService } from './app.service.js'`).
- Layering per module: controller → service → repository. Controllers stay thin; services hold business rules and throw exceptions (never return error objects); repositories are the only place that touches Prisma.
- Routes: global prefix `api` + URI versioning with default version `1` → `/api/v1/...`. A new version is added with `@Version('2')` or `@Controller({ version: '2' })`; v1 is never modified. `/api/health` is `VERSION_NEUTRAL`.
- Tenant routes live under `t/:tenantSlug/...`, go through `TenantGuard` (unknown slug → 404) and read the tenant with `@CurrentTenant()`. Public tenant controllers (the portal): `@Public()` + `@UseGuards(TenantGuard)`, and the module imports only `TenantsModule` — `PermissionsGuard` on a `@Public()` route is an error.
- Auth: global `AuthGuard`; public handlers are marked `@Public()`; every handler that needs authorization declares `@RequirePermissions(...)` behind `PermissionsGuard` (tenant controllers: `@UseGuards(TenantGuard, PermissionsGuard)`, and the module imports `TenantsModule` and `AccessModule`). A handler behind `PermissionsGuard` without permissions is denied. Only "who you are" endpoints (`GET /auth/me`) need a signed-in user without a permission. Permissions come from `ROLE_PERMISSIONS` via `AccessService`, never from the token.
- Validation: zod schemas from `@ars/shared` through `@Body({ schema })` / `@Query({ schema })` (Standard Schema). Verify the exact API in the NestJS docs before first use.
- Errors: domain errors extend the built-in Nest exceptions and add a machine `code` (e.g. `DayAlreadyBookedError extends ConflictException`, code `DAY_ALREADY_BOOKED`); pass the underlying error as `cause`. Response bodies are built by `buildErrorBody()` in the `apiErrorSchema` shape.
- Mapping DB → API happens in `*.mapper.ts` (`toListingDto`, `toBookingDto`): `Date` → `IsoDate`, `Decimal` → `number | null`, `tenantId` is never exposed.
- Config: only through `ConfigService.getOrThrow`; the env schema is validated at startup and a missing variable stops the app.
- Logging: `new Logger(ClassName.name)` for business events (seed counts, tenant created/deleted, host added, days blocked, failed login by email only). Never log passwords, tokens or the `authorization` header.

## Production readiness

Every change keeps the API production ready:

- Configuration validated at startup; a bad env logs `fatal` and exits 1. No defaults for environment-specific values.
- JSON logs in production (`LOG_FORMAT=json`), request id on every line, no secrets in logs.
- Errors only in the `apiErrorSchema` shape; no stack traces or internal details to clients; 4xx from the body parser keep their status.
- Graceful shutdown: `app.enableShutdownHooks()`, and providers holding connections close them in `onApplicationShutdown`, which Nest runs after the HTTP server has closed (`onModuleDestroy` / `beforeApplicationShutdown` run while requests may still be in flight).
- No framework fingerprint (`x-powered-by` off); CORS limited to the configured origins; body size limited by the parser default.
- `GET /api/health` for the container health check.
- Every behaviour has unit tests and, for HTTP behaviour, e2e tests.
- Anything beyond the plan (e.g. `helmet`, rate limiting) is not added: mark it with `// Possible improvement (not in the plan): …` where it would go and list it in the feature log.
