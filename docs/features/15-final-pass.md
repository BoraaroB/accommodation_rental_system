# Feature 15 — Final documentation pass

- **Branch:** `docs/final-pass`
- **Status:** done – awaiting commit

## Goal and scope

The last feature of the plan: a final check of the documentation against the code, with no code changes.

- `README.md`: setup, demo credentials and commands match the code; the "in development" status is replaced; a section "What's left and what would come next" collects what was left out on purpose, what was not done from the plan's cut line, known limitations and the possible improvements recorded by earlier features.
- `docs/architecture.md` and `docs/decisions.md` match the code.
- Final verification: lint, typecheck, unit and API e2e tests, build, format, and `docker compose up --build` on a clean copy of the repository.

## Decisions

- No new decision. `decisions.md` records that every decision is implemented; D-002's status was the last one still `Accepted`.

## What was done

- `README.md`: the "in development" status is replaced by the finished state. Setup, demo accounts and commands were checked against `package.json`, the three `.env.example` files and the seed; they needed no change. New section "What's left and what would come next": what was left out on purpose, what was not done from the plan's cut line (a Playwright smoke test, row-level security), known limitations, and the possible improvements of features 1–14a grouped by security, scale, robustness, product and UI, smaller fixes and tests, each group linking the feature logs. The Docker section's note on the seed now uses D-071's wording: no panel deletes a listing, and a tenant whose slug changed gets an empty twin.
- `docs/architecture.md`: describes the built system instead of the target. The API module tree and table list every module (`ValidationModule`, `AuthModule`, `AccessModule`, `UsersModule`, `TenantsModule`, `ListingsModule`, `BlockedDaysModule`, `BookingsModule`, `HostsModule` were missing), with what each provides and imports as in its `*.module.ts`, and why guarded modules import `TenantsModule` and `AccessModule`. Sentences about later features are in the past tense.
- `docs/decisions.md`: D-002 is `Implemented (feature 9)`; the status legend says every decision is implemented and a changed decision names what changed it. Spot checks against the code: page sizes 24 / 48 (D-045), 366 blocked days (D-049), nulls last and the "New" badge (D-023), bcrypt cost 12 (D-042), 10 connection attempts (D-038), `ConsoleLogger` (D-020), the lucide placeholder (D-024).
- `docs/README.md`: the progress tracker line no longer says "15 features" (the table has three changes of plan, 10a, 14a and 14b).

## Key files

- `README.md`
- `docs/architecture.md`, `docs/decisions.md`, `docs/README.md`
- `docs/progress.md`, this log

## Verification

| Command                                        | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run lint`, `typecheck`                    | green                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `npm test`                                     | shared 238, API 229, web 246                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `npm run build`, `format:check`                | green; the web bundle is 998 kB (313 kB gzipped)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `npm run test:e2e -w apps/api`                 | 261 green                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `docker compose up --build -d` on a clean copy | a copy of the tracked files only (no `node_modules`, build output or `.env`), `cp .env.example .env` with free ports, run as a separate Compose project; image layers came from the Docker cache. `migrate` exited 0 after seeding 3 tenants, 8 users, 1,000 listings and 12,757 bookings; `api` healthy; through nginx: `/`, `/adriatic` and `/admin/tenants` 200, `GET /api/v1/tenants` the three portals, sign-in as the superadmin and a host, the host's bookings with stored totals, another tenant's host routes 403. Removed afterwards with `down -v --rmi local` |
| Review of the diff (`reviewer`)                | module tree and table match every `*.module.ts`, every link and anchor resolves, the README's claims hold. Fixed: the Playwright test is cited to the plan, not feature 1; the seed note uses D-071's wording (no panel deletes a listing; the empty twin of a renamed tenant); the missing improvements of features 2, 3, 6, 13 and 14 were added; a deleted tenant's host memberships go and user accounts stay; `RequestContextService` is marked exported; "Smaller fixes" instead of "from the reviews"; the currency point links D-052                               |

## Deliberately left out

- No code changes, including the improvements listed in the README: they stay outside the plan.
- The logs of features 1–14b are left as they were; they describe their own time.

## Possible improvements (not in the plan)

- None.

## Commit message
