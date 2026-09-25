# Progress

- **Last updated:** 2026-09-25
- **Current feature:** 7 — API host panel (`feat/api-host`)
- **Current step:** done – awaiting commit
- **Next step:** the repository owner commits, opens and merges the PR; then record the commit message and PR number and set `PR merged`
- **Blocked / waiting on:** the repository owner's commit and PR for `feat/api-host`

## Rules

- A feature starts only after the previous feature's PR is **merged into `main`**. Before starting, confirm it in the local history: `git log --oneline --merges main` must show the merge of the previous feature's branch. If it does not (for example because `main` has not been pulled), wait.
- One feature at a time; one feature = one branch = one PR.

## Open questions

- **Feature 11:** one global `/login` and `/register` page instead of the planned per-portal pages (`/:tenantSlug/login`, `/:tenantSlug/register`) and `/admin/login`. After sign-in the web app would route by `GET /auth/me`: superadmin → `/admin/tenants`, host → `/:tenantSlug/host/listings` (a picker when `hostOf` has several tenants), client → `?redirect=` or `/`. The API supports both without changes. Decide at the start of feature 11; choosing the global page is a change of plan and needs a new decision.
- The three questions carried over from feature 1 were resolved in feature 2 (see its [log](features/02-api-bootstrap.md#decisions)).

## Features

Statuses: `not started` · `in progress` · `done – awaiting commit` · `committed` · `PR merged`

| #   | Feature                  | Branch               | Status                 | PR  | Done       |
| --- | ------------------------ | -------------------- | ---------------------- | --- | ---------- |
| 1   | Repo setup               | `chore/repo-setup`   | PR merged              | #1  | 2026-09-24 |
| 2   | API bootstrap            | `feat/api-bootstrap` | PR merged              | #3  | 2026-09-24 |
| 3   | Database schema          | `feat/db-schema`     | PR merged              | #5  | 2026-09-24 |
| 4   | Database seed            | `feat/db-seed`       | PR merged              | #7  | 2026-09-24 |
| 5   | API auth                 | `feat/api-auth`      | PR merged              | #9  | 2026-09-25 |
| 6   | API portal (public)      | `feat/api-portal`    | PR merged              | #11 | 2026-09-25 |
| 7   | API host panel           | `feat/api-host`      | done – awaiting commit |     |            |
| 8   | API admin panel          | `feat/api-admin`     | not started            |     |            |
| 9   | Web bootstrap            | `feat/web-bootstrap` | not started            |     |            |
| 10  | Web portal               | `feat/web-portal`    | not started            |     |            |
| 11  | Web auth                 | `feat/web-auth`      | not started            |     |            |
| 12  | Web host panel           | `feat/web-host`      | not started            |     |            |
| 13  | Web admin panel          | `feat/web-admin`     | not started            |     |            |
| 14  | Docker                   | `chore/docker`       | not started            |     |            |
| 15  | Final documentation pass | `docs/final-pass`    | not started            |     |            |

## Current feature checklist

Feature 7 — API host panel ([log](features/07-api-host.md)):

- [x] Scope restated, design approved (blocking range capped at 366 days, decided by the repository owner)
- [x] Shared schemas and helpers (date ranges, listing edit, host queries, host booking, stay total)
- [x] Host listings: list with search, detail, edit (`MAX_GUESTS_BELOW_BOOKING`)
- [x] Blocked days: list, block (`DAY_ALREADY_BOOKED`), unblock
- [x] Host bookings: list with filters
- [x] e2e `test/host.e2e-spec.ts`
- [x] `/check`, structure review, `reviewer` (findings fixed)
- [x] Feature log, decisions, architecture and README; status `done – awaiting commit`
