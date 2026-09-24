---
paths:
  - 'apps/api/prisma/**'
---

# Database rules (Prisma 7, PostgreSQL 18)

- Prisma is pinned to `@7` (npm `latest` points to 8.0 RC). Use the v7 docs (`/docs/orm/v7`).
- Prisma 7 setup: generator `prisma-client` with a required `output`; `@prisma/adapter-pg`; `prisma.config.ts` with `import "dotenv/config"` and `process.env.DATABASE_URL` (not `env()`, which throws without the variable, so `prisma generate` needs no database — D-037). Seeding is manual (`npm run db:seed`).
- Naming: camelCase fields in the schema, snake_case tables/columns via `@map` / `@@map`.
- Types: money is `Int` (cents); calendar dates are `@db.Date`; `rating` is `Decimal(2,1)?`.
- Every index exists for a concrete query — say which one in a comment.
- Custom SQL (CHECK, EXCLUDE, …): create the migration with `migrate dev --create-only`, edit the SQL, then apply. Confirm that `migrate dev` reports no drift afterwards.
- Deleting a tenant cascades to listings, bookings, blocked days and memberships; users stay (global identity).
- The seed is deterministic and idempotent: tenant by country, fixed hosts and credentials, `createMany` in batches.
- The database enforces what it can: `NOT NULL` by default, foreign keys with an explicit `onDelete`, `UNIQUE` for natural keys, `CHECK` for value rules. Each constraint protects a named invariant; no speculative tables, columns or indexes.
- Design a schema change first with `/db-architect design`, then follow `/db-change`; finish with `/db-architect review`.
