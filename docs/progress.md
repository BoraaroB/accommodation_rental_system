# Progress

- **Last updated:** 2026-09-28
- **Current feature:** 14b — Booking totals (`feat/booking-total-snapshot`), a change of plan
- **Current step:** `/db-architect review` and `reviewer` done, their findings fixed; feature log finished
- **Next step:** the repository owner commits, opens and merges the PR; then record the commit and PR in the feature log
- **Blocked / waiting on:** —

## Rules

- A feature starts only after the previous feature's PR is **merged into `main`**. Before starting, confirm it in the local history: `git log --oneline --merges main` must show the merge of the previous feature's branch. If it does not (for example because `main` has not been pulled), wait.
- One feature at a time; one feature = one branch = one PR.

## Open questions

- None. The sign-in page question was decided at the start of feature 11: one global `/login` and `/register` ([D-065](decisions.md#d-065-one-global-sign-in-page)).
- The three questions carried over from feature 1 were resolved in feature 2 (see its [log](features/02-api-bootstrap.md#decisions)).

## Features

Statuses: `not started` · `in progress` · `done – awaiting commit` · `committed` · `PR merged`

| #   | Feature                  | Branch                        | Status                 | PR  | Done       |
| --- | ------------------------ | ----------------------------- | ---------------------- | --- | ---------- |
| 1   | Repo setup               | `chore/repo-setup`            | PR merged              | #1  | 2026-09-24 |
| 2   | API bootstrap            | `feat/api-bootstrap`          | PR merged              | #3  | 2026-09-24 |
| 3   | Database schema          | `feat/db-schema`              | PR merged              | #5  | 2026-09-24 |
| 4   | Database seed            | `feat/db-seed`                | PR merged              | #7  | 2026-09-24 |
| 5   | API auth                 | `feat/api-auth`               | PR merged              | #9  | 2026-09-25 |
| 6   | API portal (public)      | `feat/api-portal`             | PR merged              | #11 | 2026-09-25 |
| 7   | API host panel           | `feat/api-host`               | PR merged              | #13 | 2026-09-25 |
| 8   | API admin panel          | `feat/api-admin`              | PR merged              | #15 | 2026-09-25 |
| 9   | Web bootstrap            | `feat/web-bootstrap`          | PR merged              | #17 | 2026-09-26 |
| 10  | Web portal               | `feat/web-portal`             | PR merged              | #19 | 2026-09-27 |
| 10a | Tenant route prefix      | `refactor/tenant-routes`      | PR merged              | #21 | 2026-09-27 |
| 11  | Web auth                 | `feat/web-auth`               | PR merged              | #23 | 2026-09-27 |
| 12  | Web host panel           | `feat/web-host`               | PR merged              | #25 | 2026-09-27 |
| 13  | Web admin panel          | `feat/web-admin`              | PR merged              | #27 | 2026-09-27 |
| 14  | Docker                   | `chore/docker`                | PR merged              | #29 | 2026-09-27 |
| 14a | Password toggle          | `feat/password-toggle`        | PR merged              | #31 | 2026-09-28 |
| 14b | Booking totals           | `feat/booking-total-snapshot` | done – awaiting commit |     |            |
| 15  | Final documentation pass | `docs/final-pass`             | not started            |     |            |

## Current feature checklist

Feature 14b — Booking totals ([log](features/14b-booking-totals.md)):

- [x] Scope and design (`/db-architect design`), approved by the repository owner
- [x] Schema and migration: `bookings.total_cents`, `NOT NULL`, CHECK `>= 0`
- [x] Seed: the total from the CSV (nights × the listing's CSV price)
- [x] API: the host bookings table reads the stored total
- [x] Tests: seed unit, database CHECK, seed e2e, host e2e (a price edit keeps the totals)
- [x] `/check`, e2e, `/db-architect review`, `reviewer`
- [x] Docs: D-074, D-048, plan, architecture, README, feature log
