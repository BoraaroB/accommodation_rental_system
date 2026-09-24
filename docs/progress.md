# Progress

- **Last updated:** 2026-09-24
- **Current feature:** 2 — API bootstrap (`feat/api-bootstrap`)
- **Current step:** feature 2 is `done – awaiting commit`
- **Next step:** the repository owner commits `feat/api-bootstrap`, opens and merges the PR; then record the commit message and PR number in the feature log and set the status to `PR merged`
- **Blocked / waiting on:** the commit, PR and merge of feature 2

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
| 2   | API bootstrap            | `feat/api-bootstrap` | done – awaiting commit |     |            |
| 3   | Database schema          | `feat/db-schema`     | not started            |     |            |
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

Feature 2 — API bootstrap ([log](features/02-api-bootstrap.md)):

- [x] 1. Restate the scope and verify the docs (NestJS 12, `@nestjs/config` 12, Vite 8 / Oxc, Postgres 18 image, Compose, zod 4, npm workspaces)
- [x] 2. Scaffold `apps/api` from the NestJS 12 ESM template; tooling (lint, typecheck, tests); build order of `@ars/shared`
- [x] 3. `@ars/shared`: `apiErrorSchema` and `requestIdSchema` with tests
- [x] 4. Validated configuration (zod env schema, `ConfigModule`), `apps/api/.env.example`
- [x] 5. Logging: `AppLogger` (`ConsoleLogger`), request context, `RequestIdMiddleware`, `RequestLoggerMiddleware`
- [x] 6. Errors: `AllExceptionsFilter` + `buildErrorBody`
- [x] 7. `/api/v1` versioning, `/api/health`, CORS, `main.ts` bootstrap
- [x] 8. e2e tests
- [x] 9. `docker-compose.yml` (Postgres 18 + `booking_test`), root `.env.example`, README
- [x] 10. Checks and review
- [x] 11. Feature log and decisions; status `done – awaiting commit`
- [x] 12. Restructure into one Nest module per area after the owner's review ([D-035](decisions.md#d-035-one-nest-module-per-area)); checks green again
- [x] 13. Production readiness (shutdown hooks, no `x-powered-by`) and the entity-module rule for features 3–8
