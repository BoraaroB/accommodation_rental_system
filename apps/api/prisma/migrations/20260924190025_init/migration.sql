-- CreateEnum
CREATE TYPE "currency" AS ENUM ('EUR');

-- CreateEnum
CREATE TYPE "property_type" AS ENUM ('apartment', 'studio', 'house', 'loft', 'room');

-- CreateEnum
CREATE TYPE "booking_status" AS ENUM ('confirmed', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "membership_role" AS ENUM ('host');

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logo_url" TEXT,
    "primary_color" TEXT,
    "contact_email" TEXT,
    "currency" "currency" NOT NULL DEFAULT 'EUR',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_superadmin" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_memberships" (
    "user_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "role" "membership_role" NOT NULL DEFAULT 'host',

    CONSTRAINT "tenant_memberships_pkey" PRIMARY KEY ("user_id","tenant_id")
);

-- CreateTable
CREATE TABLE "listings" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "property_type" "property_type" NOT NULL,
    "max_guests" INTEGER NOT NULL,
    "bedrooms" INTEGER NOT NULL,
    "price_per_night_cents" INTEGER NOT NULL,
    "currency" "currency" NOT NULL DEFAULT 'EUR',
    "rating" DECIMAL(2,1),
    "review_count" INTEGER NOT NULL,
    "created_at" DATE NOT NULL,

    CONSTRAINT "listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" UUID NOT NULL,
    "listing_id" UUID NOT NULL,
    "check_in" DATE NOT NULL,
    "check_out" DATE NOT NULL,
    "guests" INTEGER NOT NULL,
    "status" "booking_status" NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocked_days" (
    "listing_id" UUID NOT NULL,
    "day" DATE NOT NULL,
    "created_by_id" UUID NOT NULL,

    CONSTRAINT "blocked_days_pkey" PRIMARY KEY ("listing_id","day")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "tenant_memberships_tenant_id_idx" ON "tenant_memberships"("tenant_id");

-- CreateIndex
CREATE INDEX "listings_tenant_id_city_idx" ON "listings"("tenant_id", "city");

-- CreateIndex
CREATE INDEX "listings_tenant_id_price_per_night_cents_idx" ON "listings"("tenant_id", "price_per_night_cents");

-- CreateIndex
CREATE INDEX "bookings_listing_id_check_in_idx" ON "bookings"("listing_id", "check_in");

-- AddForeignKey
ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocked_days" ADD CONSTRAINT "blocked_days_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocked_days" ADD CONSTRAINT "blocked_days_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Custom SQL: constraints Prisma cannot express in schema.prisma.
-- Each one protects a rule from contracts.ts or docs/decisions.md; the zod
-- schemas in @ars/shared check the same rules before a write reaches here.

-- A stay is [check_in, check_out) and lasts at least one night.
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_check_out_after_check_in_check" CHECK ("check_out" > "check_in");
-- contracts.ts: guests is 1 .. the listing's max guests (the upper bound is checked by the API, D-014).
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_guests_check" CHECK ("guests" >= 1);

-- contracts.ts: max guests 1-12; bedrooms 0 for a studio; review count 0 when rating is null;
-- rating on the 5-point scale. D-011: money is non-negative integer cents.
ALTER TABLE "listings" ADD CONSTRAINT "listings_max_guests_check" CHECK ("max_guests" BETWEEN 1 AND 12);
ALTER TABLE "listings" ADD CONSTRAINT "listings_bedrooms_check" CHECK ("bedrooms" >= 0);
ALTER TABLE "listings" ADD CONSTRAINT "listings_studio_bedrooms_check" CHECK ("property_type" <> 'studio' OR "bedrooms" = 0);
ALTER TABLE "listings" ADD CONSTRAINT "listings_price_per_night_cents_check" CHECK ("price_per_night_cents" >= 0);
ALTER TABLE "listings" ADD CONSTRAINT "listings_review_count_check" CHECK ("review_count" >= 0);
ALTER TABLE "listings" ADD CONSTRAINT "listings_unrated_review_count_check" CHECK ("rating" IS NOT NULL OR "review_count" = 0);
ALTER TABLE "listings" ADD CONSTRAINT "listings_rating_check" CHECK ("rating" BETWEEN 0 AND 5);

-- D-003: e-mails are stored lowercase, so the unique index is case-insensitive in effect.
ALTER TABLE "users" ADD CONSTRAINT "users_email_lowercase_check" CHECK ("email" = lower("email"));

-- D-028: slugs are kebab-case.
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_slug_format_check" CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

-- contracts.ts: bookings on one listing never overlap. Cancelled bookings block
-- nothing, so only the others are compared. daterange is [) like a stay, so a
-- stay may start on the previous one's checkout day.
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_no_overlap_excl"
  EXCLUDE USING gist ("listing_id" WITH =, daterange("check_in", "check_out") WITH &&)
  WHERE ("status" <> 'cancelled');
