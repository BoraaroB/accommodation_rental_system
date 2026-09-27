# Progress

- **Last updated:** 2026-09-27
- **Current feature:** 11 — Web auth (`feat/web-auth`), done – awaiting commit
- **Current step:** feature done: checks green, manual scenario passed, code review findings fixed, docs updated
- **Next step:** the repository owner commits `feat/web-auth`, opens and merges the PR; then record the commit and PR in the feature log and set the status to `PR merged`
- **Blocked / waiting on:** the repository owner: commit, PR and merge of `feat/web-auth`

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
| 11  | Web auth                 | `feat/web-auth`          | done – awaiting commit |     |            |
| 12  | Web host panel           | `feat/web-host`          | not started            |     |            |
| 13  | Web admin panel          | `feat/web-admin`         | not started            |     |            |
| 14  | Docker                   | `chore/docker`           | not started            |     |            |
| 15  | Final documentation pass | `docs/final-pass`        | not started            |     |            |

## Current feature checklist

Feature 11 — Web auth ([log](features/11-web-auth.md)):

- [x] Scope restated, docs verified, design approved (global sign-in page, D-065)
- [x] Shared `redirectPathSchema` + tests
- [x] Auth state: `authSlice`, token storage, listener, `prepareHeaders`, 401 handling + tests
- [x] Auth endpoints, `useCurrentUser`, post-sign-in destination + tests
- [x] `RequireRole` (`RequireSuperadmin`, `RequireHost`), the 403 page (`AccessDenied`) + tests
- [x] Sign-in and registration pages, host panel picker + tests
- [x] `AccountMenu` in the site, portal and admin headers + tests
- [x] All checks + manual scenario
- [x] Code review, findings fixed
- [x] Feature log, `decisions.md`, plan and architecture docs; status `done – awaiting commit`
