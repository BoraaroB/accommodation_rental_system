---
name: db-architect
description: Design or review the PostgreSQL 18 schema, constraints, indexes and Prisma 7 migrations of apps/api. Use before a schema change (design) and after it (review), together with /db-change.
argument-hint: '[design|review] [tables, change or files]'
context: fork
agent: postgres-architect
---

Task: $ARGUMENTS

- `design <change>`: propose tables, constraints, indexes, the Prisma schema sketch, custom SQL, the CSV mapping and tests, within the scope in `docs/implementation-plan.md` and following `.claude/rules/database.md`.
- `review [files]`: review `apps/api/prisma/schema.prisma` and the migrations (or the files named) against the invariants in `CLAUDE.md` and `.claude/rules/database.md`.

Answer in the format your agent instructions define for that mode.
