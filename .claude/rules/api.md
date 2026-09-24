---
paths:
  - 'apps/api/**'
---

# API rules (NestJS 12, ESM)

- ESM project: relative imports end with `.js` (`import { AppService } from './app.service.js'`).
- Layering per module: controller → service → repository. Controllers stay thin; services hold business rules and throw exceptions (never return error objects); repositories are the only place that touches Prisma.
- Routes: global prefix `api` + URI versioning with default version `1` → `/api/v1/...`. A new version is added with `@Version('2')` or `@Controller({ version: '2' })`; v1 is never modified. `/api/health` is `VERSION_NEUTRAL`.
- Tenant routes live under `t/:tenantSlug/...`, go through `TenantGuard` (unknown slug → 404) and read the tenant with `@CurrentTenant()`.
- Auth: global `AuthGuard`; public handlers are marked `@Public()`; every other handler declares `@RequirePermissions(...)`. Permissions come from `ROLE_PERMISSIONS` via `AccessService`, never from the token.
- Validation: zod schemas from `@ars/shared` through `@Body({ schema })` / `@Query({ schema })` (Standard Schema). Verify the exact API in the NestJS docs before first use.
- Errors: domain errors extend the built-in Nest exceptions and add a machine `code` (e.g. `DayAlreadyBookedError extends ConflictException`, code `DAY_ALREADY_BOOKED`); pass the underlying error as `cause`. Response bodies are built by `buildErrorBody()` in the `apiErrorSchema` shape.
- Mapping DB → API happens in `*.mapper.ts` (`toListingDto`, `toBookingDto`): `Date` → `IsoDate`, `Decimal` → `number | null`, `tenantId` is never exposed.
- Config: only through `ConfigService.getOrThrow`; the env schema is validated at startup and a missing variable stops the app.
- Logging: `new Logger(ClassName.name)` for business events (seed counts, tenant created/deleted, host added, days blocked, failed login by email only). Never log passwords, tokens or the `authorization` header.
