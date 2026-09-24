# Progress

- **Last updated:** 2026-09-24
- **Current feature:** 3 — Database schema (`feat/db-schema`), [log](features/03-db-schema.md)
- **Current step:** 10 — done; waiting for the commit and PR
- **Next step:** the repository owner commits, opens and merges the PR; then record the commit message and PR number in the feature log
- **Blocked / waiting on:** the commit and the PR of feature 3

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
| 3   | Database schema          | `feat/db-schema`     | done – awaiting commit |     |            |
| 4   | Database seed            | `feat/db-seed`       | not started            |     |            |
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

Feature 3 — Database schema:

- [x] 1. Scope restated; schema and NestJS design reviewed and approved by the repository owner (decisions listed in the [log](features/03-db-schema.md#decisions))
- [x] 2. Install Prisma 7 (`prisma`, `@prisma/client`, `@prisma/adapter-pg`) and confirm locally: generator options, `prisma.config.ts`, error class import, `PrismaPg`, CLI flags
- [x] 3. `prisma.config.ts`, `schema.prisma` (six models), generated client wiring (gitignore, lint, scripts)
- [x] 4. Initial migration with custom SQL (CHECK constraints, EXCLUDE); `migrate dev` on an empty database; drift check
- [x] 5. `DATABASE_URL` in the env schema and `.env.example`; guard that the test database name ends in `_test`
- [x] 6. `DatabaseModule` + `PrismaService`
- [x] 7. `PrismaExceptionFilter`, registered in `ErrorsModule` after the catch-all
- [x] 8. e2e: `booking_test` migrated in `globalSetup`; database, constraint and Prisma-error tests
- [x] 9. `/check`, `/db-architect review`, `/nest-architect review`, `reviewer` agent
- [x] 10. Feature log, `decisions.md`, rules; status `done – awaiting commit`; commit message proposal
