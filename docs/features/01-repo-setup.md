# Feature 1 — Repo setup

- **Branch:** `chore/repo-setup`
- **Status:** done – awaiting commit

## Goal and scope

Lay down the monorepo that every later feature builds on:

- npm workspaces (`apps/*`, `packages/*`), Node 24, formatting and ignore rules;
- the challenge material in one place: the data in `data/`, the original task in `docs/challenge/` (the only source of requirements), `contracts.ts` in `packages/shared`;
- `packages/shared` with the first pure utilities (`today`, `addDays`, `eurosToCents`) and unit tests;
- the documentation skeleton (`docs/`) and the root README.

Challenge references:

- "Stack: NestJS, React, PostgreSQL, Docker" — this feature fixes the monorepo layout for the API and the web app.
- "Tests are required, the choice is yours" — the test runner is chosen here (Vitest).
- "What You Get: contracts.ts, listings.csv, bookings.csv" — the files are placed where the code will use them.

## What was done

- **Root:** npm workspaces (`packages/*` listed before `apps/*`), `engines.node >=24.15.0`, root scripts that run every workspace (`build`, `lint`, `typecheck`, `test` with `--workspaces --if-present`), Prettier (`format`, `format:check`), `.nvmrc` (24), `.gitignore` (env files ignored except `.env.example`), `.gitattributes` (no line-ending conversion for the challenge material — the CSV files use CRLF).
- **Challenge material:** `listings.csv` and `bookings.csv` moved to `data/`; the PDF and its text to `docs/challenge/`; `contracts.ts` to `packages/shared/src/`, unchanged. In `full_stack_challenge.md` the requirement numbers were corrected to match the PDF (host panel 7–9, admin panel 10–12); the text is otherwise unchanged.
- **`@ars/shared`:** an ESM package compiled with `tsc` to `dist/` and exposed through `exports` (`types` first, then `import` / `default`).
  - `today(now = new Date())` — the UTC calendar date; the clock is a parameter, so tests control it.
  - `addDays(date, days)` — strict `YYYY-MM-DD` parsing; rejects impossible dates (`2026-02-30`), non-integer day counts and results outside years 0000–9999.
  - `eurosToCents(euros)` — rejects negative, non-finite and over-large amounts and amounts with more than two decimals; absorbs floating-point error of valid amounts (`0.29 → 29`).
  - `contracts.ts` types re-exported with `export type *`.
- **Tooling** ([D-026](../decisions.md#d-026-typescript-60-vitest-41-oxlint-and-prettier)): TypeScript `~6.0.3`, Vitest `^4.1.11`, oxlint `--deny-warnings`, Prettier 3.
- **Docs:** index, implementation plan (with the corrections found while verifying the tooling), architecture, decisions D-001 to D-032, progress tracker, this log. Root README.

## Key files

| File                                                                       | Purpose                                                      |
| -------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `package.json`                                                             | Workspaces, engines, root scripts                            |
| `.nvmrc`, `.gitignore`, `.gitattributes`, `.prettierrc`, `.prettierignore` | Node version, ignore rules, line endings, formatting         |
| `packages/shared/package.json`                                             | `@ars/shared`: `exports`, scripts, dev dependencies          |
| `packages/shared/tsconfig.json`, `tsconfig.build.json`                     | Type checking (sources + tests) and the build (sources only) |
| `packages/shared/vitest.config.ts`                                         | Test discovery (`src/**/*.spec.ts`), Node environment        |
| `packages/shared/src/date.ts`, `money.ts`, `index.ts`                      | Utilities and the package entry point                        |
| `packages/shared/src/date.spec.ts`, `money.spec.ts`                        | Unit tests                                                   |
| `packages/shared/src/contracts.ts`                                         | The delivered data contracts, unchanged                      |
| `data/`, `docs/challenge/`                                                 | The delivered data and task                                  |
| `docs/*`                                                                   | Plan, architecture, decisions, progress, feature logs        |

## Decisions

- [D-001](../decisions.md#d-001-monorepo-with-npm-workspaces) Monorepo with npm workspaces.
- [D-011](../decisions.md#d-011-money-is-integer-cents-end-to-end) Money is integer cents; `eurosToCents` is the single entry point for euros.
- [D-012](../decisions.md#d-012-dates-are-iso-strings-in-utc-with-one-today) Dates are ISO strings in UTC, with one `today()`.
- [D-026](../decisions.md#d-026-typescript-60-vitest-41-oxlint-and-prettier) TypeScript 6.0, Vitest 4.1, oxlint and Prettier.
- [D-027](../decisions.md#d-027-envexample-files-are-created-with-the-feature-that-needs-them) `.env.example` files are created with the feature that needs them.
- Every other decision from the plan is recorded as Accepted (D-002 to D-032) with the feature that implements it.

## Verification

Run from the repository root on Node 24.18.0 / npm 11.16.0:

| Command                | Result                                                           |
| ---------------------- | ---------------------------------------------------------------- |
| `npm install`          | 49 packages added, 0 vulnerabilities                             |
| `npm run lint`         | pass — oxlint with `--deny-warnings`, 0 diagnostics              |
| `npm run typecheck`    | pass                                                             |
| `npm test`             | pass — 46 tests in 2 files                                       |
| `npm run build`        | pass — `dist/` has `.js`, `.d.ts` and source maps, no spec files |
| `npm run format:check` | pass                                                             |

Also checked:

- `import('@ars/shared')` from the root resolves through `exports` and returns `addDays`, `eurosToCents`, `today`.
- `grep -rE "https?://|localhost:[0-9]" packages/*/src` finds nothing.
- The data files keep their original size and CRLF line endings.
- A review of the full change set against the project invariants. Its findings were fixed: out-of-range years in `addDays`, unsafe integers and sub-cent amounts in `eurosToCents`, line-ending protection for the data, the requirement numbering in the task text, and one inconsistency between the plan and D-027.

## Deliberately left out

- `.env.example` files — added with features 2, 9 and 14 ([D-027](../decisions.md#d-027-envexample-files-are-created-with-the-feature-that-needs-them)).
- Zod schemas, `apiErrorSchema` and type-level tests (`expectTypeOf`) — they arrive with the schemas in features 2–4.
- The test suite does not run under a fixed non-UTC time zone. UTC handling is tested with explicit offsets in the inputs; pinning a time zone for the test run is a possible hardening once the Vitest 4 mechanism for it is verified.
- How `@ars/shared` is built before the apps on a clean clone — an open question for feature 2 (see [progress.md](../progress.md)).

## Commit message

_Filled in after the commit._
