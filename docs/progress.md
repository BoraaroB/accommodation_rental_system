# Progress

- **Last updated:** 2026-09-26
- **Current feature:** 10 — Web portal (`feat/web-portal`)
- **Current step:** done – awaiting commit (shadcn/ui rework reviewed, fixes applied, checks green)
- **Next step:** the repository owner runs the six case-only `git mv` renames, commits, opens and merges the PR; then record the commit message and PR number in the feature log and set the status to `PR merged`
- **Blocked / waiting on:** the repository owner: renames, commit, PR and merge of `feat/web-portal`

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
| 9   | Web bootstrap            | `feat/web-bootstrap` | PR merged              | #17 | 2026-09-26 |
| 10  | Web portal               | `feat/web-portal`    | done – awaiting commit |     |            |
| 11  | Web auth                 | `feat/web-auth`      | not started            |     |            |
| 12  | Web host panel           | `feat/web-host`      | not started            |     |            |
| 13  | Web admin panel          | `feat/web-admin`     | not started            |     |            |
| 14  | Docker                   | `chore/docker`       | not started            |     |            |
| 15  | Final documentation pass | `docs/final-pass`    | not started            |     |            |

## Current feature checklist

Feature 10 — Web portal ([log](features/10-web-portal.md)):

- [x] Scope, docs check (react-hook-form + resolvers, RTK `argSchema`, `fetch` in jsdom, `<dialog>` in jsdom) and design — approved
- [x] `@ars/shared`: `startOfMonth`, `addMonths`, `centsToEuros` (`isoWeekday` too, removed with the hand-made calendar)
- [x] Web test setup: absolute test API URL, `fetch` guard, `stubApi`, `<dialog>` shim
- [x] UI kit: `Select`, `Drawer`, `Pagination`
- [x] Endpoints: tenants and listings; `lib/format.ts`
- [x] Landing page and tenant branding in `PortalLayout`; `ScrollRestoration`
- [x] Filters in the URL: `listingFilters`, `useListingFilters`, `SearchBar`, `ListingFilters`, chips, sort
- [x] Portal home: cards, placeholder, rating badge, price summary, pagination, empty state
- [x] Listing detail and `AvailabilityCalendar`
- [x] Tests
- [x] `/check` and the `reviewer` agent; review fixes applied
- [x] Manual scenario at 375 px and on desktop (headless Chrome; tenant colour on a real page not checked)
- [x] Feature log, `decisions.md`, `architecture.md`, README

Reopened after the owner's browser review (plan approved 2026-09-26: shadcn/ui on Base UI, Sonner, all inside feature 10):

- [x] Navigation: landing navbar, "All portals" in the portal header
- [x] `shadcn init` (Base UI), `@/` alias, `cn`, theme variables and tenant branding via `--primary`
- [x] UI kit from shadcn: Button, Input, Label, Field, Select, Combobox, Card, Badge, Skeleton, Popover, Calendar, Sheet, Pagination, Sonner, Empty
- [x] Portal on the new kit: search (city combobox, date range picker, guests), sort, filter sheet, cards, chips, lucide placeholders
- [x] `AvailabilityCalendar` on the shadcn Calendar (react-day-picker)
- [x] Toasts on Sonner, out of the `ui` slice
- [x] Tests updated
- [x] `/check` and the `reviewer` agent; review fixes applied
- [x] Manual scenario at 375 px and on desktop
- [x] Docs: new decisions, updated decisions, plan changes, `architecture.md`, feature log, `ui-component` skill
