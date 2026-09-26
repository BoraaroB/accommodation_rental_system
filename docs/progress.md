# Progress

- **Last updated:** 2026-09-26
- **Current feature:** 9 — Web bootstrap (`feat/web-bootstrap`)
- **Current step:** done – awaiting commit (checks green, review fixes applied, folders reorganised per D-058)
- **Next step:** the repository owner commits, opens and merges the PR; then record the commit message and PR number in the feature log and set the status to `PR merged`
- **Blocked / waiting on:** the repository owner: commit, PR and merge of `feat/web-bootstrap`

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
| 7   | API host panel           | `feat/api-host`      | PR merged              | #13 | 2026-09-25 |
| 8   | API admin panel          | `feat/api-admin`     | PR merged              | #15 | 2026-09-25 |
| 9   | Web bootstrap            | `feat/web-bootstrap` | done – awaiting commit |     |            |
| 10  | Web portal               | `feat/web-portal`    | not started            |     |            |
| 11  | Web auth                 | `feat/web-auth`      | not started            |     |            |
| 12  | Web host panel           | `feat/web-host`      | not started            |     |            |
| 13  | Web admin panel          | `feat/web-admin`     | not started            |     |            |
| 14  | Docker                   | `chore/docker`       | not started            |     |            |
| 15  | Final documentation pass | `docs/final-pass`    | not started            |     |            |

## Current feature checklist

Feature 9 — Web bootstrap ([log](features/09-web-bootstrap.md)):

- [x] Scope, docs check (Vite template, Vitest web config) and design — approved
- [x] Scaffold `apps/web` (Vite `react-ts`), workspace scripts, dependencies
- [x] Tailwind 4 + design tokens; env module, `vite.config.ts` dev proxy, `.env.example`
- [x] Vitest + Testing Library (jsdom) setup
- [x] `reportError`, `getErrorMessage`, `baseApi`, `uiSlice` + `rtkErrorMiddleware`, store
- [x] UI kit: Button, Input, Field, Card, Badge, Skeleton, EmptyState, ErrorState, QueryState, Toast, ErrorBoundary
- [x] Router, layouts (`PortalLayout`, `HostLayout`, `AdminLayout`), root and layout error boundaries, NotFound
- [x] Tests
- [x] `/check` and the `reviewer` agent; review fixes applied
- [x] Folder structure reorganised (D-058, asked for by the repository owner)
- [x] Feature log, `decisions.md`, `architecture.md`, README
