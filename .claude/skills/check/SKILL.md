---
name: check
description: Run lint, typecheck, tests, build and the format check across all workspaces and summarize the result. Use before declaring a step or a feature done.
allowed-tools: Bash(npm run *) Bash(npm test) Bash(npm test *)
---

Run from the repository root, in this order, and do not stop at the first failure:

1. `npm run lint`
2. `npm run typecheck`
3. `npm test`
4. `npm run build`
5. `npm run format:check`
6. If `apps/api` exists and its test database is running: `npm run test:e2e -w apps/api`

Report a table with one row per check: check · result (pass / fail / skipped) · details (failing files or tests with the first error line). Do not fix anything unless asked; list the suspected causes.
