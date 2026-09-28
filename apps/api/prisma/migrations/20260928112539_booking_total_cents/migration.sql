-- D-074: a booking stores its total, agreed when it was made; a later change of
-- the listing's price never changes it. No default and no backfill: the seed
-- writes every total from the CSV. This migration needs an empty bookings table,
-- so a database seeded before it is recreated (`docker compose down -v`), not
-- migrated.

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "total_cents" INTEGER NOT NULL;

-- Custom SQL. D-011: money is non-negative integer cents.
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_total_cents_check" CHECK ("total_cents" >= 0);
