# Progress

- **Last updated:** 2026-09-24
- **Current feature:** 4 — Database seed (`feat/db-seed`), log: [features/04-db-seed.md](features/04-db-seed.md)
- **Current step:** feature 4 done – awaiting commit
- **Next step:** the repository owner commits, opens and merges the PR; then record the commit message and PR in the feature log and set `PR merged`
- **Blocked / waiting on:** the repository owner's commit and PR for `feat/db-seed`

## Rules

- A feature starts only after the previous feature's PR is **merged into `main`**. Before starting, confirm it in the local history: `git log --oneline --merges main` must show the merge of the previous feature's branch. If it does not (for example because `main` has not been pulled), wait.
- One feature at a time; one feature = one branch = one PR.

## Open questions

- None. The three questions carried over from feature 1 were resolved in feature 2 (see its [log](features/02-api-bootstrap.md#decisions)).

## Features

Statuses: `not started` · `in progress` · `done – awaiting commit` · `committed` · `PR merged`

| #   | Feature                  | Branch               | Status                 | PR  | Done       |
| --- | ------------------------ | -------------------- | ---------------------- | --- | ---------- |
| 1   | Repo setup               | `chore/repo-setup`   | PR merged              | #1  | 2026-09-24 |
| 2   | API bootstrap            | `feat/api-bootstrap` | PR merged              | #3  | 2026-09-24 |
| 3   | Database schema          | `feat/db-schema`     | PR merged              | #5  | 2026-09-24 |
| 4   | Database seed            | `feat/db-seed`       | done – awaiting commit |     |            |
| 5   | API auth                 | `feat/api-auth`      | not started            |     |            |
| 6   | API portal (public)      | `feat/api-portal`    | not started            |     |            |
| 7   | API host panel           | `feat/api-host`      | not started            |     |            |
| 8   | API admin panel          | `feat/api-admin`     | not started            |     |            |
| 9   | Web bootstrap            | `feat/web-bootstrap` | not started            |     |            |
| 10  | Web portal               | `feat/web-portal`    | not started            |     |            |
| 11  | Web auth                 | `feat/web-auth`      | not started            |     |            |
| 12  | Web host panel           | `feat/web-host`      | not started            |     |            |
| 13  | Web admin panel          | `feat/web-admin`     | not started            |     |            |
| 14  | Docker                   | `chore/docker`       | not started            |     |            |
| 15  | Final documentation pass | `docs/final-pass`    | not started            |     |            |

## Current feature checklist

Feature 4 — Database seed:

- [x] Scope restated, design approved (bcrypt and tsx added in this feature)
- [x] Dependencies: `csv-parse@7`, `bcrypt@6`, `tsx`
- [x] `@ars/shared`: `isoDateSchema`, `listingDtoSchema`, `bookingDtoSchema` + tests
- [x] Seed: env, CSV mappers, tenants and users, idempotent writes + unit tests
- [x] Scripts and config: `db:seed`, `migrations.seed`, lint / typecheck / vitest cover `prisma/`, `.env.example`
- [x] e2e: seed twice against `booking_test`
- [x] Seed run on the development database: 3 / 1000 / 12,757 rows
- [x] Checks, schema review, code review
- [x] README credentials, feature log, decisions; status `done – awaiting commit`
