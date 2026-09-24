---
name: db-change
description: Make a Prisma 7 schema change in apps/api — migration (including custom SQL via --create-only), client generation, mapper and seed updates, tests. Use for any change to the Prisma schema or migrations.
argument-hint: '[short description of the change]'
---

Make the database change: $ARGUMENTS

1. **Verify** the Prisma 7 CLI commands and schema features you will use with `/verify-docs` (Prisma is pinned to `@7`; docs under `/docs/orm/v7`).
2. **Schema:** camelCase fields with `@map` / `@@map` to snake_case; money as `Int` cents; dates as `@db.Date`; explicit `onDelete` on relations; an index only for a concrete query (name the query in a comment).
3. **Migration:** a plain change with `migrate dev`; custom SQL (CHECK, EXCLUDE, …) with `migrate dev --create-only`, edit the generated SQL, then apply it. Confirm there is no drift afterwards.
4. **Generate** the client (generator `prisma-client`, explicit `output`).
5. **Update** the CSV → domain mappers, the DB → DTO mappers, the seed, and the shared schemas if a DTO changes.
6. **Tests:** mapper unit tests and the e2e tests touched by the change; run `/check`.
7. Record the decision in `docs/decisions.md` if the change is a design choice.
