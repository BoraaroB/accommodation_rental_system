# Feature 7 — API host panel

- **Branch:** `feat/api-host`
- **Status:** done – awaiting commit

## Goal and scope

The host panel's API. Every route is signed-in only and runs through `TenantGuard` and `PermissionsGuard`; a host of the tenant and the superadmin get in:

- `GET /api/v1/t/:tenantSlug/host/listings?q&page&pageSize`: the tenant's listings, searched by title or city.
- `GET|PATCH /api/v1/t/:tenantSlug/host/listings/:id`: one listing; editing its title, type, price, guests and bedrooms.
- `GET|POST|DELETE /api/v1/t/:tenantSlug/host/listings/:id/blocked-days`: the listing's blocked days; blocking and unblocking a range of days.
- `GET /api/v1/t/:tenantSlug/host/bookings?listingId&status&from&to&page&pageSize`: the tenant's bookings.

Challenge references:

- "a host manages the listings and calendar of their tenant"
- "7. Editing listings."
- "8. Blocking individual days in the calendar for a listing."
- "9. Viewing bookings."

Done when (from the plan): e2e covers the 409 codes, host A vs tenant B and idempotent blocking.

## Decisions

Approved by the repository owner in the design:

- **Modules:** `listings/` gets `host-listings.controller.ts` and exports `ListingsService`; new `blocked-days/` and `bookings/` modules, one controller each. `BlockedDaysService` asks `ListingsService` whether the listing exists and which stays occupy the range; `BlockedDaysRepository` touches only `blocked_days`.
- **Listing edit:** the body carries all five editable fields, so the studio rule sees both `propertyType` and `bedrooms`. Lowering `maxGuests` below the guests of a non-cancelled booking (past ones included) is 409 `MAX_GUESTS_BELOW_BOOKING` (D-014).
- **Blocked days:** a range `[from, to)` in the POST body and the DELETE query; a click in the calendar is a one-day range. Blocking fails as a whole with 409 `DAY_ALREADY_BOOKED` when an active booking takes a day of it; blocking again is idempotent. Blocking and unblocking start today at the earliest. **A blocking range spans at most 366 days (400 otherwise)** — not in the plan, decided by the repository owner.
- **Host bookings:** each item is a `BookingDto` plus the listing's title and the stay's total, `nights × pricePerNightCents` at the listing's current price (bookings carry no price). The date filter keeps stays that take a day of `[from, to)`; past dates are allowed. A `listingId` of another tenant gives an empty page.
- **Search:** `q` matches the title or the city, case-insensitive; host lists are newest first, like the portal.

Recorded as [D-048](../decisions.md#d-048-host-bookings-carry-the-listings-title-and-a-total-at-its-current-price), [D-049](../decisions.md#d-049-a-blocking-request-covers-at-most-366-days) and [D-050](../decisions.md#d-050-the-host-listing-search-matches-the-title-or-the-city); D-005, D-010 and D-014 are now implemented, D-013 in the API, and D-011 and D-012 got a note.

Changed during implementation:

- No separate "first booked day" helper: `ListingsService.getBookedDays` reuses `unavailableDays` without the blocked days, and `BlockedDaysService` takes the first.
- The e2e test showed that Prisma 7 does not escape `contains`, so `%` matched every listing; `q` is now escaped (D-050).

Found in the structure review and fixed:

- The stay overlap (`checkIn < to AND checkOut > from`) was written twice; `staysOverlapping` is now the one definition, used by `activeStaysOverlapping` and the host booking filter.
- The blocking body is typed with `BlockDaysInput`, the schema's own type.
- Two e2e cases depended on test order; the edit test has its own listing and the blocked-day row check is limited to its range.

Found in the review and fixed:

- A well-formed date that does not exist (`to: "2027-02-29"`) made blocking a 500: zod runs the object refinement even after a date fails, and the span check parsed it. The span is now counted only for valid dates (400).
- The year 0000 passed validation and failed in Postgres (a 500 on host routes that allow past dates). An `IsoDate` now starts at `0001-01-01` (D-012).
- The `%` search test would also have passed with double escaping; a listing with `%` in its title now proves the literal match.
- A `q` of spaces was a 400; a blank `q` now counts as not sent (`blankAsUnset`).

## What was done

- `@ars/shared`:
  - `date-range.ts`: `DateRange`, `dateRangeSchema` (past allowed), `upcomingDateRangeSchema` (from today), and the range checks the list and booking queries share; `availabilityQuerySchema` is now `upcomingDateRangeSchema`.
  - `listing.ts`: `listingUpdateSchema` (studio ⇒ 0 bedrooms, integers within the column), `listingTextSchema`, `MAX_LISTING_INT`; `listing-query.ts`: `hostListingQuerySchema`.
  - `blocked-day.ts`: `blockDaysSchema` (at most 366 days), `listingBlockedDaysSchema`; `booking-query.ts`: `hostBookingQuerySchema`; `booking.ts`: `hostBookingSchema`, `hostBookingPageSchema`.
  - `date.ts`: `daysBetween`, `eachDay`, no year 0000; `money.ts`: `stayTotalCents`; `query-param.ts`: `blankAsUnset`.
- `listings/`: `HostListingsController`; `ListingsService.listForHost`, `update` (409 `MAX_GUESTS_BELOW_BOOKING`), `getBookedDays`; repository `findMaxActiveGuests` and `update` (fields written by name, `where: { id, tenantId }`); `q` in `buildListingWhere`; `staysOverlapping`; the module exports `ListingsService`.
- `blocked-days/` (new, Nest CLI): controller, service (409 `DAY_ALREADY_BOOKED`, logs blocking and unblocking), repository contract and Prisma implementation (inserts through the tenant-scoped listing with `skipDuplicates`).
- `bookings/` (new, Nest CLI): controller, service, repository contract and Prisma implementation, `buildBookingWhere`, `toBookingDto` and `toHostBooking`.
- Docs: `architecture.md` (host routes, shared predicates), README (how to call the host panel), decisions.

## Key files

- `packages/shared/src/date-range.ts`, `blocked-day.ts`, `booking-query.ts`, `listing.ts`, `listing-query.ts`, `booking.ts`
- `apps/api/src/listings/host-listings.controller.ts`, `listings.service.ts`, `prisma-listings.repository.ts`, `build-listing-query.ts`
- `apps/api/src/blocked-days/`, `apps/api/src/bookings/`
- `apps/api/test/host.e2e-spec.ts`

## Verification

| Command                         | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run lint`, `typecheck`     | green                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `npm test`                      | shared 169 (date ranges, blocking span and invalid dates, listing edit rules, host queries, blank `q`, `daysBetween`, `eachDay`, `stayTotalCents`, year 0000), API 225 (`ListingsService.update`, `BlockedDaysService.block`, `buildBookingWhere`, `q` and its escaping)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `npm run test:e2e -w apps/api`  | 201, of which 55 for the host panel: 401 / 404 / 403 on all seven routes (anonymous, unknown tenant, client, another tenant's host), the tenant's host and the superadmin get in; another tenant's listing 404 on detail, edit and blocked days; search by title and city regardless of case, `%` and `_` as plain text; edit persists, extra fields ignored, portal shows it; 400 for a studio with a bedroom, 13 guests, a missing field, a price in euros, a non-uuid id; 409 `MAX_GUESTS_BELOW_BOOKING` and nothing written, equal to the active maximum allowed although a cancelled booking has more; blocking recorded with its creator, idempotent, shown in the public availability; 409 `DAY_ALREADY_BOOKED` with nothing written; a day under a cancelled booking and a checkout day blockable; unblocking twice; 400 for past days, `to ≤ from`, more than 366 days, a date that does not exist, the year 0000; bookings of the tenant only, by check-in, with title and total; filters by listing, status and overlap (a stay ending on `from` excluded), past ranges; another tenant's listing → empty page |
| `npm run build`, `format:check` | green                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

## Deliberately left out

- The past / in progress / upcoming badge of a booking: the web app computes it in feature 12 (D-013).
- Unblocking and reading blocked days have no span limit: each is one range query.
- A listing that disappears between the service's check and the write is answered by the Prisma filter's generic 404 `NOT_FOUND`; only a race can cause it.

## Possible improvements (not in the plan)

- A maximum title length (`packages/shared/src/listing.ts`).
- A `pg_trgm` index for the host search once a tenant has too many listings to scan (`build-listing-query.ts`).
- Storing the price with each booking, so totals do not follow later price changes (the data has no such price).

## Commit message

Pending — recorded after the commit.
