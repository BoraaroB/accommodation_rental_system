# Feature 12 — Web host panel

- **Branch:** `feat/web-host`
- **Status:** PR merged — #25, 2026-09-27

## Goal and scope

The host panel in the web app, on the host API of feature 7 (plan: "listings table, edit form, day blocking, bookings table"; done when the manual host scenario passes and the tests are green).

- `/:tenantSlug/host` — sends the host on to the listings.
- `/:tenantSlug/host/listings` — the tenant's listings in a table, searched by title or city (`GET /tenants/:tenantSlug/host/listings?q&page`).
- `/:tenantSlug/host/listings/:id` — the listing editor (title, type, price, guests, bedrooms) and the calendar in blocking mode (`GET|PATCH .../host/listings/:id`, `GET|POST|DELETE .../blocked-days`, the public availability for the booked days).
- `/:tenantSlug/host/bookings` — the tenant's bookings in a table, filtered by listing, status and dates (`GET /tenants/:tenantSlug/host/bookings?listingId&status&from&to&page`).

Challenge references:

- "a host manages the listings and calendar of their tenant"
- "7. Editing listings."
- "8. Blocking individual days in the calendar for a listing."
- "9. Viewing bookings."

## Decisions

Approved by the repository owner in the design:

- **Filters in the URL** (D-017): the listings page keeps `q` and `page`, the bookings page `listingId`, `status`, `from`, `to` and `page`, parsed with the API's `hostListingQuerySchema` and `hostBookingQuerySchema`.
- **Host calendar:** the shared `AvailabilityCalendar` gets the statuses `booked` and `blocked` and a range selection. Booked days are the public availability's taken days minus the listing's blocked days. Past and booked days cannot be selected, and a selection cannot span a booking; the host selects a day or a range, then blocks or unblocks it. The API's 409 `DAY_ALREADY_BOOKED` stays the authority.
- **Listing filter of the bookings:** a combobox that searches the tenant's listings on the server (`q`); the editor links to the listing's bookings.
- **Cache tags:** the host's mutations invalidate what they change — the listing, both listing lists and the bookings after an edit; the listing's availability and the portal's list after blocking — so the public calendar shows a blocked day at once.
- **Shared code:** the availability endpoint moves to `api/`, `FormAlert` to `components/`, and a `MoneyInput` (euros typed, cents held) is shared by the portal's price filter and the editor, because two features use each (D-058).
- **Time badge** (D-013): past, in progress or upcoming, from the dates and `today()`; not shown for a cancelled booking.
- **Tables:** the UI kit's `table` (shadcn/ui), not TanStack Table — asked by the owner during the feature and answered: paging, search and filters happen on the server and the columns are fixed, so TanStack's model would add a dependency without a feature to use it.

Recorded as [D-066](../decisions.md#d-066-the-host-calendar-tells-booked-days-from-blocked-ones-and-blocks-a-selected-range), [D-067](../decisions.md#d-067-the-hosts-changes-make-cached-responses-stale-through-tags) and [D-068](../decisions.md#d-068-the-host-tables-keep-their-filters-in-the-url-and-apply-them-at-once); D-013 is now implemented, D-060 got a note.

Changed during implementation:

- `PROPERTY_TYPES` moved to `lib/` and `backToOf` (the list a page was opened from) to `lib/backTo.ts`, since the host panel uses them too (D-058); the euro parsing of the price filter is `lib/euros.ts`.
- The header link of the editor is "View bookings": "Bookings" is also the name of the panel's tab.
- An emptied price is kept as `NaN`: React Hook Form reads `undefined` from a controller as "back to the default value", which put the old price back.
- The test stub (`test/apiStub.ts`) awaits a handler that returns a promise, so a handler can read the request's body.

Found in the manual scenario:

- The UI kit's `Calendar` defines its `components` inline, so every render replaces the whole grid, and a click that lands while the calendar renders again is lost. The tests wait for the calendar's data before they click; the kit is unchanged (a possible improvement, below).

Found in the review and fixed:

- On phones a range could not be finished in the next month: the days of the month left behind were no longer loaded, so their status was unknown and the range started again. The calendar now requests the months shown and the selection, and a day keeps the status of the latest answer that covers it.
- The filter bars were remounted with the URL, so the focus left the control that applied a filter; they now follow the URL (`values` in React Hook Form, state adjusted during render for the picked dates).
- After a listing was chosen, its title in the combobox became a search and the options shrank to that listing; only typing (`input-change`) searches now. An unknown `listingId` in the URL shows "Unknown listing" instead of "All listings". The search text goes through `hostListingQuerySchema`.
- A block that succeeded cleared a selection made while it ran; it now clears only the range it sent.
- Duplication removed: `useCalendarMonths` (the portal's and the host's calendar), `api/listingArgs.ts`, `EmptyPageState` (three pages), `hasBookingFilters`, `BOOKING_STATUS_LABELS`.
- Tests: an assertion that passed without a refetch replaced by the recorded request; a test that repeated another folded into it; added the Block / Unblock states, the dates filter, the chosen title not being a search and the unknown listing.

## What was done

- Routes: `/:tenantSlug/host` sends on to `listings` (a loader redirect), `listings`, `listings/:id` and `bookings` under `HostLayout`.
- `features/host/`: `api.ts` (`hostApi`: host listings, a listing and its edit, blocked days, block, unblock, host bookings, with `argSchema` / `responseSchema` and tags), `hostFilters.ts` (URL filters), `stayTiming.ts`, `bookingStatuses.ts`, `paths.ts`, `hooks/useUrlFilters.ts`, `hooks/useDebouncedValue.ts`, and the components `ListingSearch`, `HostListingsTable`, `ListingEditForm`, `BlockingCalendar`, `BookingFilters`, `ListingPicker`, `BookingsTable`, `BookingBadges`.
- Pages: `HostListingsPage`, `HostListingPage` (editor and calendar), `HostBookingsPage`.
- Shared: `AvailabilityCalendar` with `booked` / `blocked`, a legend per view and range selection; `DateRangePicker` without a required `minDate`; `MoneyInput`, `FormAlert`, `EmptyPageState` in `components/`; `useCalendarMonths` in `hooks/`; `api/availabilityApi.ts` and `api/listingArgs.ts`; cache tags in `baseApi` and on the portal's endpoints; `table` from the shadcn CLI.
- Docs: D-066, D-067, D-068, notes on D-013 and D-060, `architecture.md` (tree, routes, host panel), `README.md` (using the host panel).

## Key files

- `apps/web/src/features/host/api.ts`, `hostFilters.ts`, `hooks/useUrlFilters.ts`
- `apps/web/src/features/host/components/BlockingCalendar.tsx`, `ListingEditForm.tsx`, `ListingPicker.tsx`, `BookingFilters.tsx`
- `apps/web/src/components/AvailabilityCalendar.tsx`, `MoneyInput.tsx`
- `apps/web/src/pages/HostListingsPage.tsx`, `HostListingPage.tsx`, `HostBookingsPage.tsx`
- `apps/web/src/api/baseApi.ts` (tags), `apps/web/src/app/router.ts`

## Tests

- Unit: the host URL filters (a bad parameter drops itself, a bad date range drops both dates, defaults are not written), `stayTiming` (the checkout day is past), `parseEuros` / `eurosText`.
- `AvailabilityCalendar`: booked and blocked days named and explained in the legend, booked and past days not selectable, one day as `[day, next day)`, a range extended to the day after its last, a range across a booking starting again, a click on the only selected day clearing it.
- `HostListingsPage`: the table and the links to the editor, the search through the URL from page 1, clearing a search that matches nothing, the pager's links.
- `HostListingPage`: the fields with the price in euros and the links, a save in cents followed by a refetch (tags), nothing sent for an empty title or an amount like `1e2`, a studio with bedrooms, 409 on the guests field only, not found for a bad id and a 404; the calendar's statuses and which of Block / Unblock is offered, blocking a day (the request's range, the day shown as blocked), unblocking a range (the query and the days freed), the 409 shown.
- `HostBookingsPage`: nights, totals, status and time badges (none for a cancelled booking), the status and the dates filters in the URL and the query, the listing search and choice, the chosen title not being a search, an unknown listing, clearing every filter.
- The router: `/adriatic/host` opens the listings.

## Verification

| Command                         | Result                                                |
| ------------------------------- | ----------------------------------------------------- |
| `npm run lint`, `typecheck`     | green                                                 |
| `npm test`                      | shared 238, API 227, web 215                          |
| `npm run build`, `format:check` | green (the known chunk-size warning of the web build) |
| API e2e                         | 257, green (nothing in `apps/api` changed)            |

Manual scenario (current API and web dev server, headless Chrome driven through the DevTools protocol, 1280 px and 375 px), 25 checks, all passing:

- `host1.adriatic` signs in and lands on `/adriatic/host/listings` (363 listings); "Zagreb" writes `?q=Zagreb` and lists only Zagreb; a click on a row opens the editor, and "All listings" keeps the search.
- A price change is saved and served by the portal API; the price is put back afterwards.
- A free day is blocked: it shows as blocked, the public availability lists it and the public listing page says "Not available for your dates"; unblocking frees it again.
- On a listing with a stay in the next month, its 11 booked days cannot be selected, and a range across the stay starts again from the day clicked.
- At 375 px a range across two months stays one range, and the listings, editor and bookings pages have no horizontal scroll.
- "View bookings" opens the listing's bookings with its title in the filter; the status filter and "Clear filters" update the URL; the picker offers the server's matches for "Zagreb" and filters by the chosen one; the badges show.
- The search box and the status filter keep the focus after they apply.
- A client gets the 403 page on the host panel.

## Deliberately left out

- An "unsaved changes" prompt when leaving the editor: not in the plan.
- Sorting the host tables: the API's order is used (listings newest first, bookings by check-in).
- The inclusive end of the booking date filter: it keeps the API's `[from, to)`, like the portal's search (D-068).

## Possible improvements (not in the plan)

- Define the UI kit calendar's `components` outside `Calendar`, so a render does not replace the grid and lose a click (comment in `components/ui/calendar.tsx`).
- Write a block's answer into the blocked days' cache instead of refetching it, so a day just blocked cannot show as booked for a moment (comment in `features/host/api.ts`).
- A sort for the booking table, or upcoming stays first (comment in `pages/HostBookingsPage.tsx`).
- Let the portal's search and price forms follow the URL without remounting, as the host filters do, so the focus stays (comment in `pages/PortalHomePage.tsx`).

## Commit message

One commit on `feat/web-host`, merged into `main` by merge commit `d3916b1` (PR #25).

`b031e73`:

```
feat(web): add host panel for listings, day blocking and bookings

- Listing table with search and an editor (price in euros, sent in cents)
- Blocking calendar: booked vs blocked days, select a range to (un)block
- Booking table filtered by listing, status and dates, with time badges
- Filters in the URL; cache tags refresh the portal after host changes
- Shared MoneyInput, FormAlert and useCalendarMonths; shadcn table
```
