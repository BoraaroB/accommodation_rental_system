# Feature 5 — API auth

- **Branch:** `feat/api-auth`
- **Status:** PR merged — #9, 2026-09-25

## Goal and scope

Separate "who you are" from "what you may do" (D-007): a JWT proves identity only; the effective role and its permissions are computed per request for the tenant in the URL.

- `POST /api/v1/auth/register` (public): always creates a plain client (D-008); the e-mail is trimmed and lowercased (D-003).
- `POST /api/v1/auth/login` (public): returns an access token whose payload holds only `sub` and `email`.
- `GET /api/v1/auth/me` (signed in): `id`, `email`, `name`, `isSuperadmin`, `hostOf[]` — for UI gating only.
- A global `AuthGuard` with `@Public()`; `TenantGuard` with `@CurrentTenant()`; `PermissionsGuard` with `@RequirePermissions(...)`, `AccessService` and one `ROLE_PERMISSIONS` map.

Challenge references:

- "Registration and sign-in. Registration is for clients — host accounts are created by the superadmin."
- "Three kinds of user — client, host and superadmin."
- "Keep auth simple — we are not asking for SSO, 2FA or refresh-token rotation. What interests us is how you separate who you are from what you may do."

Done when (from the plan): permission unit tests and 401/403 e2e tests are green.

## Decisions

Approved by the repository owner in the design ([D-041](../decisions.md#d-041-permission-checks-are-bound-per-controller-and-fail-closed), [D-042](../decisions.md#d-042-access-tokens-registration-and-sign-in), [D-043](../decisions.md#d-043-one-global-validation-pipe-for-zod-schemas)):

- **Modules:** `core/validation` (global `StandardSchemaValidationPipe`), `users` (repository only), `tenants` (repository, `TenantsService`, `TenantGuard`, `@CurrentTenant()`), `access` (permissions, `ROLE_PERMISSIONS`, `AccessService`, `PermissionsGuard`), `auth` (controller, service, global `AuthGuard`, `PasswordHasher` and `TokenSigner` contracts).
- **Guards:** `AuthGuard` is the only global guard; tenant controllers declare `@UseGuards(TenantGuard, PermissionsGuard)`, so the order is Auth → Tenant → Permissions. A handler behind `PermissionsGuard` without `@RequirePermissions` is denied.
- **Superadmin** has every permission, on every tenant; otherwise a membership in the URL's tenant makes a host; everyone else is a client with no permissions.
- **`POST /auth/register` returns `201` with the user profile, not a token**; the client signs in with `POST /auth/login` afterwards.
- **`JWT_EXPIRES_IN` is an integer number of seconds.**
- **`GET /auth/me`** requires a signed-in user but no permission: it answers "who you are".
- By default in the design, not objected to: `userId` in the request log line (listed in the plan's logging section); the seed hashes through `BcryptPasswordHasher`, so the bcrypt cost is defined once; `users/` has no service and `tenants/` no controller until a use case needs them (`.claude/rules/api.md` updated).

Found in review and fixed:

- The `JWT_SECRET` placeholder in `.env.example` was long enough to pass validation, so a copied example would have started with a public signing key. It is now `change-me`, which the env schema rejects.
- Registration reveals whether an e-mail has an account (409 `EMAIL_TAKEN`); recorded as an accepted trade-off in D-042 instead of adding timing protection to login.
- An e2e test now pins the token algorithm: HS512 with the right secret and `alg: none` are both 401.
- `@RequirePermissions` documents that it needs `PermissionsGuard` on the controller.
- `TenantRequest` moved out of the guard file into `tenant-request.ts`; the rules now describe the infrastructure-contract file pattern and the public tenant controller recipe.

Tests trimmed before the commit, at the repository owner's request: unit specs that repeated e2e coverage (bcrypt hasher, user mapper, `TenantsService`, `TenantGuard`) were removed, the role tables merged into `access.service.spec.ts`, and the shared schema cases cut to the rules we wrote. `.claude/rules/testing.md` now says which level tests what, for the following features.

## What was done

- `@ars/shared` (`auth.ts`): `emailSchema` (trim, lowercase, max 254), `registerSchema` (password 8 characters to 72 bytes, name 1–100), `loginSchema`, `accessTokenSchema`, `hostedTenantSchema`, `userProfileSchema` and their types.
- API configuration: `JWT_SECRET` (at least 32 characters) and `JWT_EXPIRES_IN` (positive integer, seconds) in the env schema, `.env.example` and the config e2e cases; dependency `@nestjs/jwt@^12.0.2`.
- `core/validation`: `StandardSchemaValidationPipe` as `APP_PIPE`.
- `users/`: `UsersRepository` (`findByEmail`, `findProfileById`, `findAccess`, `create`) with `PrismaUsersRepository`; `toUserProfile` mapper (memberships → `hostOf`, ordered by slug; the password hash is never selected for a profile).
- `tenants/`: `TenantsRepository.findBySlug`, `TenantsService.getBySlug` (404 `TENANT_NOT_FOUND`), `TenantGuard`, `@CurrentTenant()`.
- `access/`: `PERMISSIONS`, `ROLE_PERMISSIONS`, `hasPermissions`, `AccessService.roleFor` / `can`, `PermissionsGuard`, `@RequirePermissions`, 403 `INSUFFICIENT_PERMISSIONS`.
- `auth/`: `AuthController`, `AuthService`, global `AuthGuard`, `@Public()`, `@CurrentUser()`, `BcryptPasswordHasher`, `JwtTokenSigner` (HS256; verification returns `null` for any invalid token and checks the claims with zod), error classes `EMAIL_TAKEN`, `INVALID_CREDENTIALS`, `AUTHENTICATION_REQUIRED`, `INVALID_TOKEN`.
- `@Public()` on the health check and the e2e-only controllers.
- `RequestLoggerMiddleware` adds `userId` to the request line of a signed-in request.
- The seed hashes passwords through `BcryptPasswordHasher`.
- README: `JWT_SECRET` setup and how to sign in.

## Key files

- `packages/shared/src/auth.ts`
- `apps/api/src/core/validation/validation.module.ts`
- `apps/api/src/auth/` — `auth.module.ts`, `auth.controller.ts`, `auth.service.ts`, `auth.guard.ts`, `jwt-token-signer.ts`, `bcrypt-password-hasher.ts`
- `apps/api/src/access/` — `role-permissions.ts`, `access.service.ts`, `permissions.guard.ts`
- `apps/api/src/tenants/` — `tenant.guard.ts`, `tenants.service.ts`
- `apps/api/src/users/` — `users.repository.ts`, `prisma-users.repository.ts`, `users.mapper.ts`
- `apps/api/test/auth.e2e-spec.ts`, `access.e2e-spec.ts`, `access-routes.controller.ts`

## Verification

| Command                         | Result                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run lint`, `typecheck`     | green                                                                                                                                                                                                                                                                                                                                          |
| `npm test`                      | shared 104, API 197 — schema rules, `ROLE_PERMISSIONS` and `AccessService`, `AuthGuard` and `PermissionsGuard`, `AuthService`, JWT signer (claims, tampering, expiry), env                                                                                                                                                                     |
| `npm run test:e2e -w apps/api`  | 109 — register / login / me, 400 / 401 / 409, case-insensitive e-mail, `isSuperadmin` in the body ignored, token claims, HS256 only, no token or password in the logs; anonymous 401, unknown tenant 404, client 403, host of A on B 403, host of A on A 200, superadmin 200, removed membership → 403 with the same token, deleted user → 401 |
| `npm run build`, `format:check` | green                                                                                                                                                                                                                                                                                                                                          |
| `npm run db:seed` (again)       | runs under `tsx` with the new hasher import; inserts nothing                                                                                                                                                                                                                                                                                   |

## Deliberately left out

- Refresh tokens, revocation, SSO and 2FA — the challenge asks to keep auth simple.
- The Docker root `.env.example` gets `JWT_SECRET` in feature 14, with the API service.

## Possible improvements (not in the plan)

- Rate-limit `register` and `login` (`auth.controller.ts`).
- Lock an account after repeated failed sign-ins (`auth.service.ts`).
- Refresh tokens and revocation (`jwt-token-signer.ts`).
- Cache the slug → tenant lookup that runs on every tenant route (`tenants.service.ts`).
- Check at startup that every handler with `@RequirePermissions` is behind `PermissionsGuard`, and every handler behind it declares permissions (`permissions.guard.ts`).

## Commit message

One commit on `feat/api-auth`, merged into `main` by merge commit `66954f6` (PR #9).

`e046ff0`:

```
feat(api): add auth, tenant guard and per-tenant permissions

- Register, login and me under /api/v1/auth; JWT holds only sub and email
- Global AuthGuard with @Public; TenantGuard and PermissionsGuard per controller
- Roles computed per request per tenant via AccessService and ROLE_PERMISSIONS
- Global zod validation pipe; shared auth schemas; JWT_SECRET/JWT_EXPIRES_IN
- Unit tests for guards and roles; e2e for 401/403/404 and token handling
```
