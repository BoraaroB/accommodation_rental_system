# Accommodation Rental System

Multi-tenant accommodation rental portal built as an interview challenge. Each tenant has a public portal at `/{tenant-slug}`; there is also a host panel and an admin panel. Bookings come from CSV — clients do not book.

- Requirements: `docs/challenge/full_stack_challenge.md` — the only source of requirements.
- Plan: `docs/implementation-plan.md` · Decisions: `docs/decisions.md` · Progress: `docs/progress.md` · Feature logs: `docs/features/`.

## Commands

Run from the repo root (npm workspaces).

- `npm install`
- `npm test` · `npm run lint` · `npm run typecheck` · `npm run build` — all workspaces (`--workspaces --if-present`)
- `npm test -w packages/shared` — a single workspace
- `npm run format` · `npm run format:check` — Prettier
- Later features add: `npm run test:e2e -w apps/api`, `npm run db:migrate`, `npm run db:seed`, `docker compose up`.

## Monorepo map

```
apps/api          NestJS 12 (ESM) + Prisma 7          (feature 2+)
apps/web          Vite 8 + React 19 + Tailwind 4 + RTK (feature 9+)
packages/shared   @ars/shared: contracts.ts (as-is), zod schemas, date/money utils; tsc → dist, ESM
data/             listings.csv, bookings.csv — seed input only, never read at runtime
docs/             documentation (English)
```

## Pinned versions

Verify docs for THESE versions, not for whatever is newest.

- Node 24 (`.nvmrc`, engines `>=24.15.0`) · npm workspaces
- TypeScript `~6.0` — not 7: `typescript-eslint` needs `<6.1`, Nest CLI 12 ships `~6.0`
- Vitest `^4.1` — what the Nest 12 ESM template generates; used in every workspace
- oxlint (with `--deny-warnings`; no `--type-aware`, it needs TS 7) · Prettier 3
- NestJS 12 · **Prisma 7 — always `@7`** (npm `latest` is 8.0 RC; docs under `/docs/orm/v7`) · PostgreSQL 18
- React 19 · Vite 8 · React Router 8 (data mode) · Tailwind 4 · Redux Toolkit / RTK Query 2.12
- zod 4 · react-hook-form 7 + @hookform/resolvers 5 · csv-parse 7

## Definition of done

- `npm run lint`, `npm run typecheck`, `npm test` (and API e2e when relevant) are green.
- New behaviour has tests.
- `docs/progress.md`, the feature log and `docs/decisions.md` are updated.

## Verify, don't invent

- Never invent a library API, CLI flag, config option or version. Verify only what is uncertain, and quickly: the installed package in `node_modules`, `--help`, or one docs page for the pinned version (`/verify-docs` for bigger questions). No broad research rounds; let tests confirm behaviour. If something is not confirmed, say so and ask — never guess.
- Must be confirmed before they are written: Prisma 7 `nulls` sort syntax, the Prisma 7 error class import, the web Vitest config.
- If the implementation needs to deviate from `docs/implementation-plan.md`, ask the user first.
- Improvements outside the plan are not implemented and not proposed as additions: add a short `// Possible improvement (not in the plan): …` comment where it would go and list it under "Possible improvements (not in the plan)" in the feature log.

## Workflow

- At the start of every session read `docs/progress.md` and continue from "Next step" (`/progress`).
- One feature at a time (one feature = one branch = one PR). **A new feature starts only after the previous feature's PR is merged into `main`.** Confirm it with `git log --oneline --merges main`: the merge of the previous feature's branch must be there. If it is not (e.g. `main` not pulled yet), stop and say so — never start on an unmerged predecessor.
- Feature cycle: restate scope + verify docs → design first: `/nest-architect design` for API work, `/db-architect design` for schema work; show the design to the user before coding → set `in progress` + checklist in `docs/progress.md`, open `docs/features/NN-*.md` → implement with tests → `/check` + `/nest-architect review` (and `/db-architect review` for schema work) + `reviewer` agent → finish feature log and decisions → status `done – awaiting commit` → report + `/commit-msg` proposal → the user commits, opens and merges the PR → record the commit message and PR in the feature log, status `PR merged`.
- After every finished step: tick the checklist and update "Current step" / "Next step" in `docs/progress.md`.
- Git: the user runs every state-changing git command (`init`, `add`, `commit`, `push`, `branch`, `checkout -b`, `switch`, `merge`, `rebase`, `reset`, `stash`). Only `git status`, `git diff`, `git log` are allowed. Enforced by `permissions.deny` in `.claude/settings.json`; that list does not catch every spelling (e.g. `git --git-dir=… commit`), so the rule still applies to anything it misses.
- Commit and PR proposals: Conventional Commits in English — subject ≤ ~72 chars, blank line, 2–5 bullets. No AI attribution: no `Co-Authored-By`, no "Generated with …" — also enforced by `attribution` in `.claude/settings.json`.
- Code, comments, README and `docs/` never mention AI tools. Only this file and `.claude/` do.
- Everything written into the repo is in English.

## Invariants

- **Money** is integer cents everywhere (DB, API, URL params). Euros exist only in form inputs and are converted once with `eurosToCents` from `@ars/shared`.
- **Dates** are `IsoDate` strings (`YYYY-MM-DD`, UTC, no time). Stays are half-open `[checkIn, checkOut)`: day D is taken when `checkIn ≤ D < checkOut`, so the checkout day is free. Date math lives in `@ars/shared` (`today`, `addDays`, …).
- A **cancelled** booking blocks nothing.
- **Tenant scoping:** every Listing / Booking / BlockedDay repository method takes `tenantId`; a single row is loaded with `findFirst({ where: { id, tenantId } })`, never by `id` alone.
- **Roles are not in the token.** The JWT carries only `sub` and `email`; the effective role is computed per request for the tenant in the URL.
- Every API route is under **`/api/v1`**; only `/api/health` is version-neutral.
- The tenant route parameter is always **`tenantSlug`** on FE and BE — never `slug`, `tenant` or `id`.
- Every input is validated with a **zod schema from `packages/shared`**, on FE and BE.
- **No hardcoded URLs, hosts, ports or secrets.** Everything comes from `.env` through one validated config module per app; a new variable goes into that app's `.env.example` in the same change.
- **Errors** are thrown as Nest/domain exceptions with a machine `code`; clients only ever receive the `apiErrorSchema` shape, never a stack trace.
- **Never log** passwords, tokens/JWTs or the `authorization` header.
- **FE errors:** API errors are shown through `QueryState` / `getErrorMessage`; render errors are caught by error boundaries.
- **UI** uses design tokens only (no raw hex colours) and is mobile-first.
