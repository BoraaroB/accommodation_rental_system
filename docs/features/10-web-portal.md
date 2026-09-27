# Feature 10 — Web portal

- **Branch:** `feat/web-portal`
- **Status:** PR merged — #19, 2026-09-27 (reopened once before the commit, after the owner's browser review: UI on shadcn/ui)

## Goal and scope

The public side of the web app: the demo landing page, every tenant's portal with its branding, the listing list with filters in the URL, sort and pagination, and the listing detail with an availability calendar.

- `/` — landing page: a card for every portal (`GET /tenants`).
- `/:tenantSlug` — portal home: search bar (city, dates, guests), price filter (sidebar on desktop, sheet on phones), active filter chips, sort, result cards, pagination (`GET /t/:tenantSlug`, `/cities`, `/listings`).
- `/:tenantSlug/listings/:id` — listing detail: facts, price, rating, availability calendar and "Available for your dates" when the search had dates (`GET /t/:tenantSlug/listings/:id`, `.../availability`).
- `PortalLayout` — the tenant's name, logo and primary colour, and a link back to all portals.

Challenge references:

- "1. A list of all listings."
- "2. Opening a single listing."
- "3. Filtering the list by city, number of guests, price range and date range. The date filter returns only listings that are free across the whole range."
- "4. On a single listing — when that listing is available to book."
- "Feel free to take UI inspiration from Airbnb or Booking. We are not looking for visual design; we are looking for something that can actually be used."

Done when (from the plan): manual scenario at 375 px and on desktop; Testing Library tests are green.

## Decisions

Approved by the repository owner in the design:

- **Structure (D-058):** `features/tenants/api.ts`; `features/listings/` with `api.ts`, the URL filter functions, `hooks/useListingFilters.ts` and the portal's components; `AvailabilityCalendar` in the shared `components/` folder, because the host panel (feature 12) reuses it for blocking; `Select`, `Drawer` and `Pagination` in the UI kit (replaced by shadcn/ui, below); pages in `pages/`; formatting in `lib/format.ts`; month helpers and `centsToEuros` in `@ars/shared`.
- **Filters (D-017):** each URL parameter is parsed on its own through `listingQuerySchema.shape`, so a bad one drops only itself; then the whole schema runs and a failing date range drops both dates, a minimum above the maximum drops the maximum. Two forms (react-hook-form + `zodResolver(listingQuerySchema)`): `SearchBar` (city, dates, guests) and `ListingFilters` (price in euros, at most two decimals, converted with `eurosToCents`).
- **Calendar:** two months on desktop, one on phones; month-by-month navigation from the current month, the first month shown at most 11 months ahead; one availability request per view; past days greyed out, taken days struck through, the searched range highlighted. "Available for your dates ✓/✗" comes from a request for exactly `[from, to)`.
- **Tests:** `VITE_API_BASE_URL` in the Vitest config is `http://api.test/api/v1` (`.test` is a reserved TLD), because Node's `Request` rejects a relative URL; `test/setup.ts` replaces `fetch` with a guard that fails every unexpected request, and `stubApi()` answers by path. Tests go through URL → `argSchema` → request → `responseSchema` → UI.
- **Drawer:** a native `<dialog>` opened with `showModal()` — replaced by the kit's Sheet (below).
- **Sort on phones:** a native `<select>` — replaced by the kit's Select (below).
- **`<ScrollRestoration />`** in `RootLayout`, so a new page of results or an opened listing starts at the top.
- **Placeholder images (D-024):** an emoji per property type — replaced by lucide-react icons (below).

Changed during implementation:

- **The listing list endpoint has no `argSchema`** ([D-021](../decisions.md#d-021-one-set-of-zod-schemas-for-fe-and-be)): RTK Query needs a schema whose input type is its output type, and the coercing `listingQuerySchema` is not; the argument is already that schema's output.
- **Price input:** a text input with a decimal keyboard (`inputMode="decimal"`), not `type="number"`, so a typed "12,5" reaches validation instead of becoming an empty value; the form holds cents, the input shows euros.
- **`ButtonLink`** joins the UI kit (a router link styled as a button, for pagination and calls to action); the button classes moved to `buttonStyles.ts`, shared by `Button` and `ButtonLink` — both replaced by the kit's `buttonVariants` on router links (below).

Found in the review and fixed:

- **Reset** left prices typed but not applied in the inputs when the URL did not change (the form only follows the URL); it now resets the form too.
- `addMonths` turned years 0001–0099 into 1901–1999 (`Date.UTC` maps years 0–99 to 1900+); it now uses `setUTCFullYear`.
- "Back to results" accepted any path that starts with the portal's slug (`/adriatic-north` for `/adriatic`); it now accepts only this portal's list.
- The portal header kept its loading skeleton after the tenant request failed; it now links to the portal list.
- The search bar showed the schema's messages ("from and to go together"); it now says "Choose a check-in date", "Check-out must be after check-in", …, chosen by what was entered. Moving the departure after a new arrival revalidates it after a failed search.
- The portal home has a (visually hidden) `h1` and a results `h2`, so card titles (`h3`) sit under a heading on phones too.
- Applying the same filters again replaces the history entry instead of adding one.
- The URL filter tests no longer repeat zod's own field rules; tests added for Reset, the empty page, closing the drawer, the date messages and "Back to results".

Found in the manual scenario and fixed:

- A city from the URL that the portal does not have (e.g. `city=Split` on `adriatic`) showed "Anywhere" in the select while its chip showed the city; the select now keeps it as an option.
- The two calendar months had rows of different heights when one month spans five weeks and the other six.
- On the listing detail the price was right-aligned while the rest of its card was left-aligned; only the result card aligns it right.

Reopened after the repository owner's review in the browser (plan approved 2026-09-26):

- **Navigation:** the landing page has a navbar (the product name links to `/`); the portal header, in the tenant's colour, has an "All portals" link, also on "Portal not found".
- **UI kit on shadcn/ui with Base UI** ([D-062](../decisions.md#d-062-the-ui-kit-is-shadcnui-on-base-ui)) — a change of plan asked for by the owner, who found the native controls, the hand-made calendar and the toasts too plain. Everything stays inside feature 10. The hand-written `Button`, `ButtonLink`, `Input`, `Select`, `Field`, `Card`, `Badge`, `Skeleton`, `Drawer`, `Pagination`, `Toast`, `EmptyState` are replaced by generated shadcn components; `QueryState`, `ErrorState`, `ErrorBoundary` stay ours (kebab-case files), and `form-field` wraps the kit's `Field` with the old label/hint/error wiring.
- **Controls:** a searchable city combobox, one date range picker instead of two date inputs, selects for guests and sort, a Sheet for the phone filters ([D-061](../decisions.md#d-061-the-filter-drawer-is-the-ui-kits-sheet)), the availability calendar on the kit's Calendar ([D-060](../decisions.md#d-060-the-availability-calendar-shows-a-year-ahead-one-request-per-view)), lucide-react icons for the placeholders.
- **Dates stay in UTC:** both calendars run with react-day-picker's `timeZone="UTC"` (marked experimental, since 9.1.1) and convert only with `parseIsoDate` / `toIsoDate`; the calendar tests pass in UTC−4 and UTC+9 as well.
- **Theme:** the tokens are the shadcn variables in OKLCH (our brand blue and success green converted), mapped with `@theme inline`; branding sets `--primary` and `--ring` (D-056).
- **Toasts on Sonner, outside Redux** ([D-063](../decisions.md#d-063-toasts-are-sonner-outside-redux)).
- **Generated code adapted:** links rendered as router `Link`s with `buttonVariants` (Base UI's docs say its Button must not render links; shadcn's `PaginationLink` did), one light theme for Sonner (no `next-themes`), `bg-black/10` → `bg-foreground/10`, unused `date-fns` and `next-themes` removed; oxlint's `only-export-components` off for `components/ui` only.
- **Date messages:** with one picker, a missing departure says "Choose a check-out date"; the picker cannot produce a departure before the arrival.

Found in the review of the rework and fixed:

- A web test failed in the last days of every month: jsdom shows one calendar month and the test picked days by distance from today; it now opens the calendar on a known month through a searched stay.
- The city, guests and price controls kept showing a filter that was removed from the URL ("Clear all", a chip): react-hook-form falls back to a field's first value when a new `values` object leaves the field out. The forms now start from the URL (`defaultValues`) and are remounted when it changes (`key` = the search string).
- The tenant colour did not reach popups (the sheet, the date picker, select lists), which Base UI renders into `<body>`: `useBrandColor` now sets `--primary` and `--ring` on the document while a portal is shown.
- The date button's accessible name was only "Dates"; it is now the label and the chosen dates (`aria-labelledby`, with `fieldLabelId` from `form-field`). The date popover is named "Choose dates"; the combobox's clear and open buttons are named.
- The price input accepted "1e2" and "0x10" (`Number` reads them); only plain decimals are amounts now, and anything else is sent to the schema as `NaN`, which it rejects.
- The filter sheet was 75% wide on phones (the kit's `data-[side=right]:w-3/4` won over `w-full`); it is full width.
- Unused code of the hand-made calendar removed: `formatMonth`, `formatShortWeekday`, `isoWeekday`.
- Docs: D-058's `lib/` list, `separator` / `textarea` in the kit list, a source for Base UI as shadcn's default.
- Noted, not changed: the kit's controls are 32 px tall on phones (feature 9 used 44 px); that still meets WCAG 2.5.8 (24 px).

Recorded as [D-059](../decisions.md#d-059-web-tests-stub-fetch-behind-an-absolute-test-api-url) to [D-063](../decisions.md#d-063-toasts-are-sonner-outside-redux); D-011, D-017, D-021, D-023, D-024, D-025, D-056 and D-057 have new statuses or notes; the plan's "Changes since the plan was approved" has a row for the UI kit.

## What was done

- `@ars/shared`: `addMonths` (day clamped to a shorter month) and `startOfMonth` in `date.ts`; `centsToEuros` in `money.ts`. (`isoWeekday` was added for the hand-made calendar and removed with it.)
- **Dependencies:** `react-hook-form` 7.89 and `@hookform/resolvers` 5.9 (its zod resolver supports zod 4); from `shadcn init` / `add` (CLI 4.21): `@base-ui/react` 1.8, `class-variance-authority` 0.7, `cn` 0.4 (clsx + tailwind-merge in one), `lucide-react` 1.48, `react-day-picker` 10.0, `sonner` 2.0, `tw-animate-css` 1.4, `@fontsource-variable/geist` 5.3, and `shadcn` itself (its `tailwind.css` is imported).
- **Endpoints:** `features/tenants/api.ts` (`getTenants`, `getTenant`) and `features/listings/api.ts` (`getCities`, `getListings`, `getListing`, `getAvailability`), with `responseSchema` from `@ars/shared` and `argSchema` where the schema allows it.
- **Filters in the URL:** `features/listings/listingFilters.ts` (`parseListingFilters`, `toSearchParams`) and `useListingFilters` (`filters`, `applyFilters`, `clearFilters`, `pageHref`).
- **Portal home:** `SearchBar` (city combobox, `DateRangePicker`, guests select; a summary on phones), `ListingFilters` + `PriceRangeInput` (€ prefix; sidebar and sheet), `ActiveFilterChips`, `SortSelect`, `ListingCard` (vertical on phones, horizontal from `md`), `PropertyPlaceholder` (lucide icon), `RatingBadge` ("New" for `null`), `PriceSummary` (per night, and the stay's total), `Pager`, empty states (no match, empty page, portal without stays).
- **Listing detail:** facts, price, rating, `AvailabilityVerdict` and `ListingAvailability` with `AvailabilityCalendar` (a widget `ErrorBoundary` around it); "Listing not found" for a 404 or a malformed id (not sent); "Back to results" returns to the exact list URL.
- **Branding and navigation:** `PortalLayout` loads the tenant, sets `--primary` / `--ring`, shows name, logo, "All portals" and the contact e-mail, and "Portal not found" for an unknown tenant or an address that is not a slug.
- **Landing page:** a navbar and a card per portal in its colour.
- **UI kit:** shadcn/ui on Base UI (`components.json`, `components/ui/*`, `lib/utils.ts`), our `form-field`, `empty-state`, `error-state`, `query-state`, `error-boundary`; shared `components/DateRangePicker.tsx` and `components/Pager.tsx`; `hooks/useMediaQuery.ts`; `ui` slice: `filtersDrawerOpen` only; Sonner `Toaster` in `RootLayout`.
- **Other:** `lib/format.ts` (`formatMoney`, date and month formats in UTC, `formatCountry`, `pluralize`), `hooks/useTenantSlug.ts`, `ScrollRestoration` in `RootLayout`; the `@/` alias in `tsconfig*.json`, `vite.config.ts` and `vitest.config.ts`.
- **Tests:** `test/apiStub.ts`, `test/fixtures.ts`, `test/renderRoute.tsx`; the setup stubs `fetch` and `scrollTo`.

## Key files

- `apps/web/src/features/listings/` — `api.ts`, `listingFilters.ts`, `hooks/useListingFilters.ts`, `components/`
- `apps/web/src/features/tenants/` — `api.ts`, `brandStyle.ts`, `components/TenantLogo.tsx`
- `apps/web/src/pages/` — `LandingPage.tsx`, `PortalHomePage.tsx`, `ListingDetailPage.tsx`
- `apps/web/src/components/AvailabilityCalendar.tsx`, `DateRangePicker.tsx`, `Pager.tsx`, `components/ui/` (shadcn/ui), `apps/web/components.json`, `src/styles/tokens.css`, `src/styles/index.css`
- `apps/web/src/app/layouts/PortalLayout.tsx`, `app/router.ts`
- `apps/web/src/test/` — `apiStub.ts`, `setup.ts`, `fixtures.ts`, `renderRoute.tsx`; `apps/web/vitest.config.ts`
- `packages/shared/src/date.ts`, `money.ts`

## Verification

| Command / check                             | Result                                                                                                                                     |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run lint`, `typecheck`, `format:check` | green                                                                                                                                      |
| `npm test`                                  | shared 223 (`addMonths` incl. clamping and years below 100, `startOfMonth`, `centsToEuros`), api 227, web 104 in 14 files                  |
| `npm run build`                             | green; Vite warns that the JS chunk is 911 kB (290 kB gzipped) — see "Possible improvements"                                               |
| `npm run test:e2e -w apps/api`              | 257 green (the API is unchanged)                                                                                                           |
| Calendar tests in other time zones          | `AvailabilityCalendar.spec` green with `TZ=America/New_York` and `TZ=Asia/Tokyo`; the reviewer ran the whole web suite in UTC−11 to UTC+14 |

Web tests cover:

- the URL filters: every filter read and coerced, defaults, an invalid parameter dropped alone, bad date ranges dropped as a pair, a maximum below the minimum dropped, empty and default values not written, the round trip;
- the portal home, through the router and a stubbed API: the request mirrors the URL; search with the city combobox, the date range picker and the guests select writes the URL and returns to page 1; the picker closes after two days and names itself with them; a missing departure is explained and sends nothing; the stay total and the detail link with dates; the price typed in euros and sent in cents; price errors (below the minimum, "12,5", "1e2") that send nothing; Reset; "Clear all" empties the controls; chips; sort; pagination links; a city the portal does not have; the empty and empty-page states; the filter sheet (Apply, close and reopen);
- the listing detail: facts, price, rating and "New"; taken days in the calendar; "Available / Not available for your dates"; past dates ignored; 404 and a malformed id (not sent); "Back to results" to the list it came from and not to another portal;
- `PortalLayout`: branding (name, logo, `--primary` on the document and removed on leaving, "All portals", contact e-mail), "Portal not found" for a 404 and for an address that is not a slug (not sent), an error with Retry; the landing page and its navbar; `AvailabilityCalendar` (weeks from Monday, day labels with status and stay, navigation and its limits); `FormField`; the Sonner toasts of `rtkErrorMiddleware`; `formatMoney` and `pluralize`; the router.

Manual (API and dev server running, headless Chrome screenshots at 375 px and 1280 px, before and after the shadcn/ui rework):

- `/` has a navbar and a card per portal; a portal's header, in its colour, links back to all portals; `/nowhere` shows "Portal not found".
- `/adriatic?city=Belgrade&from&to&guests=2` on a phone: search summary, Filters and Sort, chips, "94 stays found", vertical cards with the stay's total; no horizontal scroll. On desktop: the search bar with equal-height controls, the "Filter by" sidebar with € prefixes, horizontal cards.
- A listing detail with the searched stay taken: taken days struck through, the departure day of a booking free, the stay highlighted; one month on a phone, two on desktop.
- Not checked in the browser: a tenant colour and logo on a real page (the seeded tenants have none, and changing a tenant is left to the admin panel, feature 13) — `PortalLayout`'s test covers the variables; the open states of the date picker, selects and sheet (screenshots cannot click) — covered by the page tests.

## Deliberately left out

- The property type filter: the API has no such parameter.
- Sign-in links and the "Host panel" link in the portal header (feature 11).
- For an unknown slug that is still a valid slug, the page's own requests (cities, listings) go out and fail with 404 while the tenant loads; "Portal not found" replaces the page when the tenant's 404 arrives.

## Possible improvements (not in the plan)

- Choose `--primary-foreground` by the tenant colour's contrast, so text stays readable on a light colour (comment in `features/tenants/brandStyle.ts`).
- Load the pages with the routes' `lazy`, so the first visit downloads less; the JS bundle is about 910 kB (290 kB gzipped) with the UI kit (comment in `app/router.ts`).
- A dark theme: the kit's `dark:` classes are ready, only a `.dark` token set and a toggle are missing.
- Send response schema mismatches to `reportError` through `onSchemaFailure` (carried over from feature 9, comment in `api/baseApi.ts`).

## Commit message

One commit on `feat/web-portal`, merged into `main` by merge commit `96df924` (PR #19).

`560ad91`:

```
feat(web): add the tenant portal with URL filters on shadcn/ui

- Add the landing page and each portal's home in its tenant branding, with a way back to all portals
- Keep search, price filter, sort and page in the URL, parsed with listingQuerySchema
- Add the listing detail with the stay total and an availability calendar in UTC
- Build the UI on shadcn/ui with Base UI, react-day-picker, Sonner and lucide-react
- Test pages through the router against a stubbed fetch (D-059)
```

Follow-up in the post-merge PR: git on macOS ignores case, so the commit kept six UI kit files under their old names (`Badge.tsx`, `Button.tsx`, `Card.tsx`, `Field.tsx`, `Input.tsx`, `Skeleton.tsx`) while the code imports `badge`, `button`, `card`, `field`, `input` and `skeleton`. It worked on macOS but would fail on a case-sensitive file system (Linux, Docker); the six files are renamed to lowercase with `git mv`.
