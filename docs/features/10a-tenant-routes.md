# Feature 10a — Tenant route prefix

- **Branch:** `refactor/tenant-routes`
- **Status:** PR merged — #21, 2026-09-27

## Goal and scope

A change of plan requested by the repository owner between features 10 and 11: the tenant routes move from `/api/v1/t/:tenantSlug/...` to `/api/v1/tenants/:tenantSlug/...`, so the API uses one prefix for the portals (`GET /tenants` was already the list). Behaviour, guards, parameters, responses and errors do not change.

## Decisions

- **D-064** (new): tenant routes are under `/tenants/:tenantSlug`; D-006 links to it. The admin panel stays on `/admin/tenants/:tenantId` (D-051); the web routes (`/:tenantSlug/...`) are unchanged.
- No `v2` (D-018): no client outside this repository uses the API yet.
- The logs of features 5–10 are left as they were; they describe the routes of their time.

## What was done

- API: the controller prefixes of `ListingsController`, `HostListingsController`, `BlockedDaysController` and `BookingsController` are `tenants/:tenantSlug/...`. `TenantsController` takes the `tenants` prefix, with `@Get()` for the list and `@Get(':tenantSlug')` for one portal.
- Web: the portal endpoints in `features/tenants/api.ts` and `features/listings/api.ts`.
- Tests: the paths in the API unit and e2e tests (including the test-only `access-check` route) and in the web tests.
- Docs: `implementation-plan.md`, `architecture.md`, `decisions.md`, `README.md`, the comments in `packages/shared/src/listing-query.ts`, and the API rules for new code.

## Key files

- `apps/api/src/tenants/tenants.controller.ts`
- `apps/api/src/listings/listings.controller.ts`, `host-listings.controller.ts`
- `apps/api/src/blocked-days/blocked-days.controller.ts`, `apps/api/src/bookings/bookings.controller.ts`
- `apps/web/src/features/tenants/api.ts`, `apps/web/src/features/listings/api.ts`

## Verification

| Command                         | Result                              |
| ------------------------------- | ----------------------------------- |
| `npm run lint`, `typecheck`     | green                               |
| `npm test`                      | shared 223, API 227, web 104        |
| `npm run test:e2e -w apps/api`  | 257, every route under its new path |
| `npm run build`, `format:check` | green                               |

## Deliberately left out

- No redirect or alias from the old `/t/...` paths: nothing outside this repository calls them.

## Commit message

One commit on `refactor/tenant-routes`, merged into `main` by merge commit `b28bf9b` (PR #21).

`fb1d638`:

```
refactor(api): move tenant routes under /tenants/:tenantSlug

- Portal and host routes move from /api/v1/t/:tenantSlug to /tenants/:tenantSlug
- TenantsController takes the tenants prefix: the list and one portal
- Web portal endpoints, API unit/e2e and web tests use the new paths
- D-064; plan, architecture, README and API rules updated
```
