# Feature 6 — API portal (public)

- **Branch:** `feat/api-portal`
- **Status:** done – awaiting commit

## Goal and scope

The public side of every portal, read-only and without sign-in:

- `GET /api/v1/tenants`: the portal list for the landing page.
- `GET /api/v1/t/:tenantSlug`: the portal's configuration and branding.
- `GET /api/v1/t/:tenantSlug/cities`: the tenant's cities, the options of the city filter.
- `GET /api/v1/t/:tenantSlug/listings?city&guests&minPriceCents&maxPriceCents&from&to&sort&page&pageSize`: the tenant's listings, filtered, sorted and paginated.
- `GET /api/v1/t/:tenantSlug/listings/:id`: one listing.
- `GET /api/v1/t/:tenantSlug/listings/:id/availability?from&to`: the days of a range on which the listing is taken.

Challenge references:

- "1. A list of all listings."
- "2. Opening a single listing."
- "3. Filtering the list by city, number of guests, price range and date range. The date filter returns only listings that are free across the whole range."
- "4. On a single listing — when that listing is available to book."
- "One tenant's data must never be visible on another tenant's portal."

Done when (from the plan): e2e covers availability edge cases and tenant isolation.

## Decisions

Approved by the repository owner in the design:

- **Modules:** a new `TenantsController` in `tenants/` for `GET /tenants` and `GET /t/:tenantSlug`; a new `listings/` module with one public `ListingsController` on `t/:tenantSlug` for cities, the list, the detail and availability. Feature 7 adds `host-listings.controller.ts` next to it.
- **`TenantGuard` loads the public configuration** (logo, colour, contact e-mail, currency) with the slug lookup, so `GET /t/:tenantSlug` needs no second query. The public tenant has no `id`.
- **Availability** is `{ from, to, unavailableDays }`: the taken days of `[from, to)`, sorted, without saying whether a booking or a block takes them. The list filter and the calendar share one predicate for "an active stay overlaps" and "a blocked day lies within".
- **Pagination:** `pageSize` is optional, default 24, at most 48. Every sort ends with `id asc`, so pages are stable.
- **Dates:** the availability query needs both dates and rejects `from` before today, like the list filter.
- **Integer query parameters** have no upper bound beyond the plan's rules (changed after the review, below).
- **A non-uuid `:id`** is a 400 from the schema.
- The mapper file is `listings.mapper.ts`; `toBookingDto` comes with bookings in feature 7.
- **Tests:** no unit specs for the mappers or the services; `toListingDto`'s explicit `ListingDto` return type and the e2e key check prove the response shape (`.claude/rules/testing.md`).

Recorded as [D-044](../decisions.md#d-044-a-portal-shows-only-its-own-tenants-listings) (a portal lists only its tenant's listings — the open question carried from feature 5), [D-045](../decisions.md#d-045-listing-pages-24-by-default-at-most-48-ties-broken-by-id), [D-046](../decisions.md#d-046-public-availability-lists-the-taken-days-of-a-range) and [D-047](../decisions.md#d-047-the-portals-configuration-comes-with-the-tenant-lookup); D-009 is now implemented, and D-006, D-016 and D-023 in part.

Found in the structure review and fixed:

- `TenantRecord`, the shape `TenantGuard` puts on the request, moved from `tenants.repository.ts` to `tenant-request.ts`, so other modules do not import the tenants repository contract.
- `findMany` and `count` run with `Promise.all` instead of a batch `$transaction`: under READ COMMITTED the transaction gave no consistency, only an extra round trip.
- Kept: the generic `Page<T>` interface next to `pageSchema`; a type test keeps it equal to `z.infer<typeof listingPageSchema>`.

Found in the review and fixed, as decided by the repository owner:

- `maxPriceCents=3000000000` passed validation and failed in Postgres (P2020, the price column is a 32-bit integer), a 500 the web form could reach. Price filters now stop at 2,147,483,647 cents → 400 ([D-045](../decisions.md#d-045-listing-pages-24-by-default-at-most-48-ties-broken-by-id)).
- A NUL byte in `city` or `:tenantSlug` was a 500, the slug case since feature 5. The city schema rejects control characters (400); `TenantsService.getBySlug` checks the new shared `tenantSlugSchema` and answers anything that is not a kebab-case slug with 404 without a query ([D-028](../decisions.md#d-028-tenant-slugs-are-kebab-case-with-reserved-words)).
- `z.coerce.number()` turned an empty value into 0, so `?maxPriceCents=` returned nothing. An empty number now counts as not sent (`emptyAsUnset` in `@ars/shared`).
- Missing e2e cases added: unknown tenant on `/cities`; non-uuid and unknown id on `/availability`.
- Two `import type` lines from one file merged; the `listingIdSchema` comment no longer claims v4 only (`z.uuid()` accepts any version).
- Kept: `TenantsController.get` maps the guard's record itself; a service method would only pass it through.

## What was done

- `@ars/shared`:
  - `pagination.ts`: `paginationQuerySchema` (`page`, `pageSize` 1–48, default 24), `pageSchema(item)`, `Page<T>`.
  - `listing-query.ts`: `listingSortSchema`, `listingQuerySchema` (coerced numbers, trimmed city, `from`/`to` together, `to` after `from`, `from` not in the past, min ≤ max price) and `availabilityQuerySchema`.
  - `listing.ts`: `listingIdSchema`, `listingPageSchema`, `listingAvailabilitySchema`; `tenant.ts`: `publicTenantSchema`, `tenantSlugSchema`; `date.ts` exports `toIsoDate`; `query-param.ts`: `emptyAsUnset`.
- `tenants/`: `TenantRecord` carries the public configuration and lives in `tenant-request.ts`; `findAll`; `TenantsService.listPublic`; `getBySlug` rejects malformed slugs before the query; `toPublicTenant`; `TenantsController` (`GET /tenants`, `GET /t/:tenantSlug`).
- `listings/` (new, generated with the Nest CLI): `ListingsController`, `ListingsService`, the `ListingsRepository` contract and `PrismaListingsRepository` (`findPage`, `findById`, `findCities` with `groupBy`, `findOccupancy`), `listingSelect` + `toListingDto`, `ListingNotFoundError` (404 `LISTING_NOT_FOUND`), `buildListingWhere` / `buildListingOrderBy` with the shared predicates, `unavailableDays`.
- `rating_desc` sorts with `{ rating: { sort: 'desc', nulls: 'last' } }` (Prisma 7 `SortOrderInput`, checked in the generated client).
- Docs: `architecture.md` (portal routes, availability), README (how to call the portal).

## Key files

- `packages/shared/src/listing-query.ts`, `pagination.ts`, `listing.ts`, `tenant.ts`
- `apps/api/src/listings/` — `listings.controller.ts`, `listings.service.ts`, `prisma-listings.repository.ts`, `build-listing-query.ts`, `unavailable-days.ts`, `listings.mapper.ts`
- `apps/api/src/tenants/` — `tenants.controller.ts`, `tenant-request.ts`, `prisma-tenants.repository.ts`
- `apps/api/test/portal.e2e-spec.ts`

## Verification

| Command                         | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run lint`, `typecheck`     | green                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `npm test`                      | shared 134 (query rules, empty numbers, slug format, page type test, `toIsoDate`), API 213 (`buildListingWhere` / `buildListingOrderBy`, `unavailableDays`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `npm run test:e2e -w apps/api`  | 146, of which 37 for the portal: portal list without ids; configuration; unknown tenant and malformed slug 404; cities of one tenant; list only of the tenant, newest first, exact `ListingDto` keys; city (not another tenant's listing in the same city), guests and inclusive price filters, empty numbers ignored; checkout day free, confirmed stay taken, cancelled free, blocked day taken; `rating_desc` with null last, `price_asc`; 25 tied listings paged by id, page past the end, `pageSize`; 400 for past or half ranges, a price above the column's range, a NUL byte in the city and a non-uuid id; another tenant's or an unknown listing 404 on detail and availability; availability days clipped to the range |
| `npm run build`, `format:check` | green                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

## Deliberately left out

- An upper bound on `page`: a huge page is a 200 with no items.
- A maximum span for the availability range.
- Bookings and blocked days as their own modules, and `toBookingDto`: feature 7.

## Possible improvements (not in the plan)

- Cap the span of the availability range (`listings.controller.ts`).
- Paginate the portal list once there are more tenants than a landing page can show (`prisma-tenants.repository.ts`).
- Cache the slug → tenant lookup that runs on every tenant route (`tenants.service.ts`, from feature 5).
- `Cache-Control` / ETag on the public lookups (`/tenants`, `/t/:tenantSlug`, `/cities`), rate limiting on public routes, and keyset pagination with `(tenant_id, created_at)` / `(tenant_id, rating)` indexes at a larger scale.
