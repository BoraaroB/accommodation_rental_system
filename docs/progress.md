# Progress

- **Last updated:** 2026-09-28
- **Current feature:** none — feature 14b (Booking totals) is merged; feature 15 has not started
- **Current step:** —
- **Next step:** Feature 15 — Final documentation pass (`docs/final-pass`): restate the scope, show the plan, then set it to `in progress` with its checklist and open `docs/features/15-final-pass.md`
- **Blocked / waiting on:** the repository owner: the post-merge PR `docs/feature-14b-merged` (these docs) merged into `main`, then the go-ahead for feature 15 and the branch `docs/final-pass` created from an up-to-date `main`

## Rules

- A feature starts only after the previous feature's PR is **merged into `main`**. Before starting, confirm it in the local history: `git log --oneline --merges main` must show the merge of the previous feature's branch. If it does not (for example because `main` has not been pulled), wait.
- One feature at a time; one feature = one branch = one PR.

## Open questions

- None. The sign-in page question was decided at the start of feature 11: one global `/login` and `/register` ([D-065](decisions.md#d-065-one-global-sign-in-page)).
- The three questions carried over from feature 1 were resolved in feature 2 (see its [log](features/02-api-bootstrap.md#decisions)).

## Features

Statuses: `not started` · `in progress` · `done – awaiting commit` · `committed` · `PR merged`

| #   | Feature                  | Branch                        | Status      | PR  | Done       |
| --- | ------------------------ | ----------------------------- | ----------- | --- | ---------- |
| 1   | Repo setup               | `chore/repo-setup`            | PR merged   | #1  | 2026-09-24 |
| 2   | API bootstrap            | `feat/api-bootstrap`          | PR merged   | #3  | 2026-09-24 |
| 3   | Database schema          | `feat/db-schema`              | PR merged   | #5  | 2026-09-24 |
| 4   | Database seed            | `feat/db-seed`                | PR merged   | #7  | 2026-09-24 |
| 5   | API auth                 | `feat/api-auth`               | PR merged   | #9  | 2026-09-25 |
| 6   | API portal (public)      | `feat/api-portal`             | PR merged   | #11 | 2026-09-25 |
| 7   | API host panel           | `feat/api-host`               | PR merged   | #13 | 2026-09-25 |
| 8   | API admin panel          | `feat/api-admin`              | PR merged   | #15 | 2026-09-25 |
| 9   | Web bootstrap            | `feat/web-bootstrap`          | PR merged   | #17 | 2026-09-26 |
| 10  | Web portal               | `feat/web-portal`             | PR merged   | #19 | 2026-09-27 |
| 10a | Tenant route prefix      | `refactor/tenant-routes`      | PR merged   | #21 | 2026-09-27 |
| 11  | Web auth                 | `feat/web-auth`               | PR merged   | #23 | 2026-09-27 |
| 12  | Web host panel           | `feat/web-host`               | PR merged   | #25 | 2026-09-27 |
| 13  | Web admin panel          | `feat/web-admin`              | PR merged   | #27 | 2026-09-27 |
| 14  | Docker                   | `chore/docker`                | PR merged   | #29 | 2026-09-27 |
| 14a | Password toggle          | `feat/password-toggle`        | PR merged   | #31 | 2026-09-28 |
| 14b | Booking totals           | `feat/booking-total-snapshot` | PR merged   | #33 | 2026-09-28 |
| 15  | Final documentation pass | `docs/final-pass`             | not started |     |            |

## Current feature checklist

No feature in progress. The checklist of the next feature is added when it starts; the history of finished features is in [features/](features/).
