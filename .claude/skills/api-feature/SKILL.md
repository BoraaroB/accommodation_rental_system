---
name: api-feature
description: Add or change a NestJS module in apps/api following the project template — controller → service → repository, shared zod schemas, permissions, tenant scoping, unit and e2e tests. Use when adding or changing API endpoints.
argument-hint: '[module] [short description]'
---

Build the API change for: $ARGUMENTS

1. **Scope.** List every endpoint: method, path under `/api/v1`, who may call it, the permission. Cross-check "API" in `docs/implementation-plan.md`; ask before deviating.
2. **Verify** every NestJS / Prisma API you will use with `/verify-docs`, unless it was already verified in this session.
3. **Shared schemas** in `packages/shared`: input schema(s) and response DTO schema(s), exported from `src/index.ts`; rebuild shared.
4. **Repository:** the only Prisma access. Every Listing / Booking / BlockedDay method takes `tenantId`; single rows via `findFirst({ where: { id, tenantId } })`.
5. **Service:** business rules; throws domain exceptions with a `code` (extending built-in Nest exceptions, `cause` passed on); logs business events with `new Logger(X.name)` — never secrets.
6. **Controller:** thin. Tenant routes under `t/:tenantSlug/...` with `TenantGuard` and `@CurrentTenant()`. `@RequirePermissions(...)` on every non-public handler, `@Public()` on public ones. Validation with `@Body({ schema })` / `@Query({ schema })`.
7. **Mapper:** DB → DTO in `*.mapper.ts` (`Date` → `IsoDate`, `Decimal` → `number | null`, no `tenantId`), plus a type test that the result is exactly the DTO type.
8. **Tests:** unit tests for pure functions and service rules; e2e for the happy path, 400 validation, 401 anonymous, 403 wrong role / host of another tenant, 404 another tenant's resource, and every domain 409.
9. Run `/check`, then update `docs/progress.md`, the feature log and `docs/decisions.md` if a design choice was made.
