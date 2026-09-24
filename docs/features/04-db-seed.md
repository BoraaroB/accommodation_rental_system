# Feature 4 — Database seed

- **Branch:** `feat/db-seed`
- **Status:** done – awaiting commit

## Goal and scope

Load the delivered CSV into Postgres once, so every later feature works with the database only (D-015).

- `npm run db:seed` reads `listings.csv` and `bookings.csv`, maps every row from snake_case strings to the typed camelCase shapes of `contracts.ts`, validates it with a zod schema from `@ars/shared` and inserts it with batched `createMany`.
- Three tenants split by listing country (D-004), two hosts per tenant, one superadmin and one demo client.
- The seed is deterministic and idempotent.

Challenge references:

- "How you load the data into the database is your choice."
- `contracts.ts`: "The CSV columns are snake_case, these types are camelCase. The mapping is part of the work."
- "How you split the 1,000 listings across tenants and hosts is up to you."
- "Three kinds of user — client, host and superadmin."

Done when (from the plan): the database has 3 / 1000 / 12,757 rows; mapper tests are green.

## Decisions

Approved by the repository owner before implementation ([D-040](../decisions.md#d-040-the-seed-is-a-standalone-script-that-only-inserts-missing-rows)):

- **A standalone script, not a Nest app.** `apps/api/prisma/seed/` (the plan's location) with its own zod env schema (`DATABASE_URL`, `SEED_DATA_DIR`, `SEED_DEMO_PASSWORD`). The API's env schema is unchanged: the API never reads the `SEED_*` variables.
- **Run through `prisma db seed`** (`migrations.seed` in `prisma.config.ts`) with **`tsx`**: Node 24 strips types but does not resolve `.js` import specifiers to `.ts` files, which the project and the generated Prisma client use. `tsx` was not in the plan.
- **`bcrypt` is added here, not in feature 5**, because the seed creates users with passwords.
- **Idempotent by "insert what is missing":** every table is written with `createMany({ skipDuplicates: true })` (listings and bookings in batches of 1,000), all in one transaction. A second run inserts nothing and never deletes or overwrites data (for example a host's edits).
- **Validation:** CSV rows are validated with `listingDtoSchema` / `bookingDtoSchema` from `@ars/shared` (single-field rules). Rules across fields (0 bedrooms for a studio, no reviews without a rating, `checkOut > checkIn`) are enforced by the CHECK constraints (D-036); a violation rolls the transaction back.

Found in review and fixed:

- `skipDuplicates` is `ON CONFLICT DO NOTHING` without a target, so Postgres also skips a row that breaks the **exclusion** constraint — an overlapping stay would have been dropped silently. After each booking batch the seed counts the batch's ids in the table; a missing one aborts the whole seed ("N bookings overlap an active stay on the same listing"). Rows skipped because their id already exists are found, so a repeated run still passes.
- `guests ≤ maxGuests` compares two tables, so the database cannot check it; `assertGuestsFit` checks it before anything is written.

## What was done

- `@ars/shared`: `isoDateSchema`, `isIsoDate` and `parseIsoDate` (now exported: the UTC midnight Prisma writes to a `date` column); `currencySchema`, `propertyTypeSchema`, `listingDtoSchema`; `bookingStatusSchema`, `bookingDtoSchema`. Type tests check `z.infer` is exactly `ListingDto` / `BookingDto`.
- Seed (`apps/api/prisma/seed/`):
  - `mappers.ts`: `parseCsv` (`csv-parse/sync`, `columns: true`), `parseListingRow`, `parseBookingRow` and `mapRows`, which stops at the first invalid row with the file, the row number and the zod message. Numbers must be plain decimals; an empty cell is never 0; an empty rating is `null`.
  - `accounts.ts`: the three tenants with their countries, the eight accounts, `tenantSlugForCountry`.
  - `seed.ts`: `assertGuestsFit` and `seed()`: bcrypt (cost 12, a salt per account) before the transaction, then tenants → users → memberships → listings → bookings; returns the rows inserted per table.
  - `main.ts`: loads `.env`, validates the env, reads and maps the CSV, runs the seed, logs the counts; a failure logs `fatal` and sets exit code 1. A Prisma validation error is logged without its message (D-039).
- Scripts and config: `db:seed` (API and root), `migrations.seed`, `prisma/` in lint, `tsconfig.json` and the unit test include; `SEED_DATA_DIR` and `SEED_DEMO_PASSWORD` in `apps/api/.env.example`; `databaseUrlSchema` exported from the API env schema and reused.
- README: the seed command, the tenant split and the demo accounts.

## Key files

- `packages/shared/src/listing.ts`, `booking.ts`, `date.ts`
- `apps/api/prisma/seed/main.ts`, `seed.ts`, `mappers.ts`, `accounts.ts`, `seed-env.ts`
- `apps/api/prisma.config.ts` (`migrations.seed`)
- `apps/api/test/seed.e2e-spec.ts`

## Verification

| Command                                 | Result                                                                                                        |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `npm run lint`, `typecheck`, `build`    | green                                                                                                         |
| `npm test`                              | shared 96, API 145 — including the full CSV: 1,000 / 12,757 rows, 109 unrated, split 363 / 428 / 209          |
| `npm run test:e2e -w apps/api`          | 75 — seed twice (all rows, then 0), a host's edit survives, overlapping stays roll back, bcrypt hash verifies |
| `npm run db:migrate && npm run db:seed` | "Inserted 3 tenants, 8 users, 6 host memberships, 1000 listings and 12757 bookings" in about 2 s              |
| second `npm run db:seed`                | inserts nothing                                                                                               |
| row counts on the development database  | tenants 3, listings 1,000, bookings 12,757, users 8, memberships 6                                            |
| bad env / missing CSV directory         | `FATAL [Seed]` with the variable names (no values) or the missing file; exit code 1                           |
| `npm run format:check`                  | green                                                                                                         |

## Deliberately left out

- Tenant branding (`logoUrl`, `primaryColor`) stays empty; the superadmin sets it in the admin panel (feature 8).
- The seed never updates existing rows, so a changed `SEED_DEMO_PASSWORD` does not change existing accounts; delete them (or the database volume) and seed again.

## Notes for later features

- Feature 5: the password hasher uses bcrypt too; a bcrypt hash carries its cost, so the seeded hashes (cost 12) verify whatever cost the hasher uses. The seed can then hash through it.
- Feature 6: `parseIsoDate` turns an `IsoDate` into the `Date` Prisma writes; the DB → API mapper needs the reverse (`Date` → `IsoDate`).
- Feature 14: the API image must run the seed — it needs `prisma/`, `data/` (`SEED_DATA_DIR`) and `tsx`, or a compiled seed.

## Possible improvements (not in the plan)

- None.

## Commit message

```
feat(api): seed tenants, demo accounts and CSV data

- Map and validate CSV rows with shared listing and booking zod schemas
- Split listings into three tenants by country; add hosts, admin, client
- Insert only missing rows in one transaction; reject overlapping stays
- Run via `npm run db:seed` (prisma db seed + tsx); bcrypt for passwords
- Unit tests for mappers and the full CSV; e2e seeds twice on booking_test
```
