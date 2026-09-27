# Progress

- **Last updated:** 2026-09-27
- **Current feature:** 12 — Web host panel (`feat/web-host`)
- **Current step:** feature 12 done – awaiting commit
- **Next step:** the repository owner commits `feat/web-host` and opens the PR; after the merge, record the commit and PR in the feature log and mark it `PR merged`
- **Blocked / waiting on:** the repository owner: the commit, the PR and its merge

## Rules

- A feature starts only after the previous feature's PR is **merged into `main`**. Before starting, confirm it in the local history: `git log --oneline --merges main` must show the merge of the previous feature's branch. If it does not (for example because `main` has not been pulled), wait.
- One feature at a time; one feature = one branch = one PR.

## Open questions

- None. The sign-in page question was decided at the start of feature 11: one global `/login` and `/register` ([D-065](decisions.md#d-065-one-global-sign-in-page)).
- The three questions carried over from feature 1 were resolved in feature 2 (see its [log](features/02-api-bootstrap.md#decisions)).

## Features

Statuses: `not started` · `in progress` · `done – awaiting commit` · `committed` · `PR merged`

| #   | Feature                  | Branch                   | Status                 | PR  | Done       |
| --- | ------------------------ | ------------------------ | ---------------------- | --- | ---------- |
| 1   | Repo setup               | `chore/repo-setup`       | PR merged              | #1  | 2026-09-24 |
| 2   | API bootstrap            | `feat/api-bootstrap`     | PR merged              | #3  | 2026-09-24 |
| 3   | Database schema          | `feat/db-schema`         | PR merged              | #5  | 2026-09-24 |
| 4   | Database seed            | `feat/db-seed`           | PR merged              | #7  | 2026-09-24 |
| 5   | API auth                 | `feat/api-auth`          | PR merged              | #9  | 2026-09-25 |
| 6   | API portal (public)      | `feat/api-portal`        | PR merged              | #11 | 2026-09-25 |
| 7   | API host panel           | `feat/api-host`          | PR merged              | #13 | 2026-09-25 |
| 8   | API admin panel          | `feat/api-admin`         | PR merged              | #15 | 2026-09-25 |
| 9   | Web bootstrap            | `feat/web-bootstrap`     | PR merged              | #17 | 2026-09-26 |
| 10  | Web portal               | `feat/web-portal`        | PR merged              | #19 | 2026-09-27 |
| 10a | Tenant route prefix      | `refactor/tenant-routes` | PR merged              | #21 | 2026-09-27 |
| 11  | Web auth                 | `feat/web-auth`          | PR merged              | #23 | 2026-09-27 |
| 12  | Web host panel           | `feat/web-host`          | done – awaiting commit |     |            |
| 13  | Web admin panel          | `feat/web-admin`         | not started            |     |            |
| 14  | Docker                   | `chore/docker`           | not started            |     |            |
| 15  | Final documentation pass | `docs/final-pass`        | not started            |     |            |

## Current feature checklist

Feature 12 — Web host panel ([log](features/12-web-host.md)):

- [x] Scope restated, design approved by the repository owner
- [x] Shared UI: `table` (shadcn), `MoneyInput`, `FormAlert` moved to `components/`, `DateRangePicker` without a required `minDate`, `AvailabilityCalendar` with host statuses and range selection
- [x] API layer: cache tags, the availability endpoint in `api/`, `features/host/api.ts`
- [x] Host listings page (`/:tenantSlug/host/listings`)
- [x] Listing editor (`/:tenantSlug/host/listings/:id`)
- [x] Blocking calendar
- [x] Host bookings page (`/:tenantSlug/host/bookings`) with filters and the time badge
- [x] Routes (`/:tenantSlug/host` → listings) and tests
- [x] `/check`, review, manual scenario in the browser
- [x] Feature log, decisions, docs
