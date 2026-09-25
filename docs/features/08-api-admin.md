# Feature 8 — API admin panel

- **Branch:** `feat/api-admin`
- **Status:** PR merged — #15, 2026-09-25

## Goal and scope

The admin panel's API. Every route is signed-in only and platform-wide (no `:tenantSlug`), behind `PermissionsGuard`; only the superadmin gets in:

- `GET|POST /api/v1/admin/tenants`: every tenant; creating one.
- `GET|PATCH|DELETE /api/v1/admin/tenants/:tenantId`: one tenant; editing its configuration; deleting it.
- `GET|POST /api/v1/admin/tenants/:tenantId/hosts`: the tenant's hosts; adding one.
- `DELETE /api/v1/admin/tenants/:tenantId/hosts/:userId`: removing a host.

Challenge references:

- "a superadmin creates tenants, configures them and adds host accounts to them"
- "10. Creating, editing and deleting tenants."
- "11. Tenant configuration. Name and slug are required; anything beyond that is up to you — logo, currency, primary colour, contact email."
- "12. Adding host accounts to a tenant. A tenant may have several hosts."
- "The superadmin creates tenants through the admin panel. One tenant in the data is enough, but adding a new one has to work."

Done when (from the plan): e2e shows that a new tenant's portal works, `SLUG_TAKEN`, and the reserved slugs.

## Decisions

Approved by the repository owner in the design:

- **Modules:** `tenants/` gets `admin-tenants.controller.ts` (one controller per audience, D-035); a new `hosts/` module owns the memberships and uses `TenantsService`, the users repository and the password hasher, which `AuthModule` now exports.
- **Route parameter:** `:tenantId`, not `:id` (the tenant parameter is never named `id`) and not `:tenantSlug` (that would make it a tenant route for `TenantGuard`). The URLs are the plan's.
- **`PATCH` is a partial update** (JSON Merge Patch semantics): a field that is not sent is unchanged, `null` clears an optional field, an empty body is a 400. Chosen by the repository owner as the HTTP standard; the tenant has no rule across fields, unlike the listing edit.
- **Slugs:** kebab-case, unique (409 `SLUG_TAKEN`), and `admin`, `api`, `login`, `register` are reserved in the shared `tenantSlugSchema` itself (D-028). The slug can be changed; the old portal URL then answers 404.
- **Adding a host:** the body is always `{ email, name, password }`. A new e-mail creates the account and its membership in one write; an existing account only gets the membership — its name and password are never changed — and the response says so with `accountCreated`. A user who already hosts the tenant is 409 `ALREADY_HOST`.
- **Admin ids:** only the admin tenant response carries the tenant's `id`; the portal still addresses tenants by slug (D-047).
- **Lists:** plain arrays, like the other short lookup lists (D-045).
- **Test routes:** the platform routes of the feature 5 access test are removed; the admin e2e covers 401 and 403 on platform routes.

Recorded as [D-051](../decisions.md#d-051-the-admin-panel-addresses-tenants-by-id), [D-052](../decisions.md#d-052-tenant-configuration-is-edited-as-a-merge-patch) and [D-053](../decisions.md#d-053-adding-a-host-reuses-an-existing-account-without-changing-it); D-008, D-028 and D-029 are now implemented, and D-041 and D-047 got a note.

Changed during implementation:

- The host columns are selected inside `prisma-hosts.repository.ts`, like the tenant columns; the rows need no conversion, so there is no `hosts.mapper.ts`.

Found in the structure review and fixed:

- The `UsersModule` header now names every reader of users and the second writer (`PrismaHostsRepository`); `createWithAccount` points to `PrismaUsersRepository.create`, so a new required user column goes into both.
- The race notes of `TenantsService.update` match those of `create`.
- `host.spec.ts` no longer repeats zod's own checks.
- Not changed: `TenantRecord` stays in `tenant-request.ts` (a point from before this feature; moving it touches about 14 imports).

Found in the review and fixed:

- A NUL byte in a user name (host input and, since feature 5, the public registration) or in a logo URL reached Postgres and was a 500. One shared `plainTextSchema` (trimmed, not blank, no control characters) now covers listing titles and cities, tenant names, user names and the logo URL (D-052).
- A kebab-case slug of about 4,000 characters exceeded the row size of the unique index: a 500 on create and edit. **A slug has at most 63 characters** — decided by the repository owner (D-028).
- Adding an existing account to a tenant deleted meanwhile was a 409 `FOREIGN_KEY_VIOLATION`, a new account a 404; both writes now `connect` the tenant, so both are a 404.
- The service unit tests repeated e2e cases; only the two branches of adding a host remain as unit tests, and the e2e no longer repeats the schema tables.

## What was done

- `@ars/shared`:
  - `tenant.ts`: `RESERVED_TENANT_SLUGS` and a 63-character limit in `tenantSlugSchema`; `tenantIdSchema`, `adminTenantSchema`, `tenantCreateSchema`, `tenantUpdateSchema` (merge patch, at least one field).
  - `host.ts` (new): `hostInputSchema`, `tenantHostSchema`, `addedHostSchema`.
  - `auth.ts`: `passwordSchema`, `userNameSchema` and `userIdSchema` exported for the host input; `text.ts` (new): `plainTextSchema`, which replaces `listingTextSchema`.
- `tenants/`: `AdminTenantsController` (Nest CLI); `TenantsService.getById`, `listForAdmin`, `getForAdmin`, `create`, `update`, `remove` (409 `SLUG_TAKEN`, logs created, updated and deleted tenants); repository `findById`, `create`, `update` (fields written by name), `remove` (`deleteMany`, the foreign keys cascade); `toAdminTenant`; the module imports `AccessModule`.
- `hosts/` (new, Nest CLI): controller, service (409 `ALREADY_HOST`, 404 `HOST_NOT_FOUND`, logs ids only), repository contract and Prisma implementation (memberships; a new account and its membership in one nested write).
- `auth/`: `AuthModule` exports `PASSWORD_HASHER`.
- Tests: `test/admin.e2e-spec.ts`; the platform routes of `test/access-routes.controller.ts` and their cases in `access.e2e-spec.ts` removed.
- Docs: `architecture.md` (admin routes, platform routes in the pipeline), README (how to call the admin panel), decisions.

## Key files

- `packages/shared/src/tenant.ts`, `host.ts`, `text.ts`, `auth.ts`
- `apps/api/src/tenants/admin-tenants.controller.ts`, `tenants.service.ts`, `prisma-tenants.repository.ts`
- `apps/api/src/hosts/`
- `apps/api/test/admin.e2e-spec.ts`

## Verification

| Command                         | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run lint`, `typecheck`     | green                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `npm test`                      | shared 205 (reserved and too long slugs, the configuration formats and their normalization, merge-patch edits, plain text without control characters, host input), API 227 (`HostsService.add`: a new account is hashed and created with its membership, an existing one only gets the membership)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `npm run test:e2e -w apps/api`  | 257, of which 60 for the admin panel: 401 / 403 on all eight routes (anonymous, a client, a host on their own tenant) with nothing changed; the tenant list and one tenant; a new tenant's portal works at once (portal list, branding, empty listing page, no cities); 409 `SLUG_TAKEN` with nothing written; the reserved slugs 400 with nothing written, `/t/admin` 404; invalid configuration and non-uuid ids 400; unknown tenants 404; a partial edit shown on the portal, `null` clears, an edit without a known field 400, own slug kept, another tenant's slug 409, a new slug moves the portal; deletion removes the listing, booking, blocked day and membership while the host keeps the account; a new host signs in to the host panel; an existing account keeps its name and password (`accountCreated: false`); 409 `ALREADY_HOST`; one account hosting two tenants; the log names no e-mail or password; a removed host loses the panel with the same token and keeps the account; 404 `HOST_NOT_FOUND` |
| `npm run build`, `format:check` | green                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

## Deliberately left out

- The typed slug as a delete confirmation is a web-app concern (D-029); the API deletes on `DELETE`.
- Races (two creations of one slug or one e-mail, a tenant deleted during an edit) are answered by the Prisma filter's generic `UNIQUE_VIOLATION` or `NOT_FOUND`; only a race can cause them.
- A logo URL must name a domain, so `localhost` and IP addresses are rejected.

## Possible improvements (not in the plan)

- A maximum length for the tenant name and the logo URL (`packages/shared/src/tenant.ts`).
- Pagination of the admin lists once there are many tenants or hosts.
- An invitation or a forced password change for hosts created by the superadmin, who knows their first password.
- An audit log of admin actions.

## Commit message

One commit on `feat/api-admin`, merged into `main` by merge commit `4e44b63` (PR #15).

`642f2bc`:

```
feat(api): add admin panel endpoints for tenants and hosts

- Admin tenants: list, detail, create, merge-patch edit, cascading delete
- Hosts: list, add a new or existing account, remove; accounts stay
- Slugs: reserved words and a 63-char limit; 409 SLUG_TAKEN, ALREADY_HOST
- Shared zod schemas for tenant config, host input and plain text
- e2e for access, a new tenant's portal, slug rules and host accounts
```
