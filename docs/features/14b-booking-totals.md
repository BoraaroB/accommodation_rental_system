# Feature 14b — Booking totals

- **Branch:** `feat/booking-total-snapshot`
- **Status:** PR merged — #33, 2026-09-28

## Goal and scope

A change of plan asked for by the repository owner before feature 15. The host bookings table showed each stay's total at the listing's **current** price (D-048), so editing a listing's price also changed the totals of completed and confirmed bookings. A booking's amount is agreed when it is made and is never recomputed: each booking now stores its total.

- `bookings.total_cents`: `NOT NULL`, CHECK `>= 0`, in a new migration.
- The seed writes it from the CSV: the stay's nights times the listing's price per night in `listings.csv`. Every run on an empty database gives the same totals.
- `GET /tenants/:tenantSlug/host/bookings` reads the stored total; editing a listing's price changes only the listing.
- The response shape (`HostBooking`) and the web app's behaviour do not change; one web comment is updated.

## Decisions

- **D-074** (new): `bookings.total_cents`, `integer NOT NULL`, no default, `CHECK (total_cents >= 0)`; only the total is stored. The seed writes it from the CSV; the migration has no backfill, since the database is built from scratch.
- **D-048**: its total at the listing's current price is replaced by D-074; the listing's title in the host table stays.
- Approved by the repository owner during the design: the seed takes the price from `listings.csv`; no backfill and no repair of databases seeded before this feature — they are recreated.

## What was done

- `schema.prisma`: `Booking.totalCents` (`@map("total_cents")`).
- Migration `20260928112539_booking_total_cents`: generated with `migrate dev --create-only`, then the CHECK and a header comment were added. Applied to the empty `booking_test`; a second `migrate dev --create-only` produced an empty migration (removed), so there is no drift.
- Seed: `withBookingTotals` gives every booking the nights times its listing's CSV price (`stayTotalCents`) and throws for a booking whose listing is not in the input; it runs with `assertGuestsFit`, before the transaction.
- `bookings.mapper.ts`: `hostBookingSelect` selects `totalCents` and no longer the listing's price; `toHostBooking` returns the stored total.
- Comments: `hostBookingSchema` in `@ars/shared`, the `updateListing` invalidation in `apps/web/src/features/host/api.ts` (the only change in the web app), the `schema.prisma` header.
- Docs: `decisions.md` (D-074, D-048), `implementation-plan.md` (changes table, data model, feature table), `architecture.md`, `README.md` (a database seeded before this feature is recreated with `docker compose down -v`).

## Key files

- `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/20260928112539_booking_total_cents/migration.sql`
- `apps/api/prisma/seed/seed.ts`, `seed.spec.ts`
- `apps/api/src/bookings/bookings.mapper.ts`
- `apps/api/test/database.e2e-spec.ts`, `seed.e2e-spec.ts`, `host.e2e-spec.ts` (fixtures also in `portal.e2e-spec.ts`, `admin.e2e-spec.ts`, `prisma-error-routes.controller.ts`)

## Verification

| Command                         | Result                                                                                                                                                                        |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run lint`, `typecheck`     | green                                                                                                                                                                         |
| `npm test`                      | shared 238, API 229 (2 new: `withBookingTotals`), web 246                                                                                                                     |
| `npm run build`, `format:check` | green                                                                                                                                                                         |
| `npm run test:e2e -w apps/api`  | 261 green; new: the CHECK rejects -1 and accepts 0, every seeded total equals the CSV one after a price edit, a host's price edit leaves the three bookings' totals unchanged |
| `/db-architect review`          | schema correct; fixed: the migration header and the README now say a database seeded before this feature is recreated, the `schema.prisma` header says "in the migrations"    |
| Review of the diff (`reviewer`) | no correctness or invariant findings; fixed: the stale comment in the web app, `architecture.md` wording, progress and this log                                               |

## Deliberately left out

- No backfill in the migration and no repair of stored totals in the seed: the repository owner builds the database from scratch every time.
- No `price_per_night_cents` on the booking: nothing shows it, and the nights come from the dates.

## Possible improvements (not in the plan)

- None.

## Commit message

One commit on `feat/booking-total-snapshot`, merged into `main` by merge commit `65aa967` (PR #33).

`64b6a89`:

```
feat(api): store each booking's total at the price it was booked at

- bookings.total_cents (NOT NULL, CHECK >= 0) in a new migration
- The seed writes it from the CSV: nights x the listing's CSV price
- Host bookings return the stored total; a price edit keeps it
- D-074 replaces D-048's total at the current price; docs updated
```
