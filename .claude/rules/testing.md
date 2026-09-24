---
paths:
  - '**/*.{spec,test}.{ts,tsx}'
---

# Testing rules (Vitest 4.1)

- Test behaviour, not implementation details. Prefer table-driven cases with `it.each`.
- Keep the suite lean — each behaviour is tested once, at the level that proves it:
  - **e2e for every endpoint:** happy path, 400 validation, the 401 / 403 / 404 matrix and every domain 409.
  - **Unit tests only for logic with branches** that e2e cannot reach cheaply: pure functions (`buildListingWhere`, availability, date and money math), business rules in services, security-critical code (token signing), guards' misconfiguration branches.
  - **No unit tests** for thin wrappers around a library, mappers and lookups that e2e already exercises, or cases that repeat another table. Zod schemas get a few cases for the rules we wrote (normalization, cross-field refinements, limits), not for zod's own checks.
- Dates are relative to today: `addDays(today(), n)` from `@ars/shared`. Never rely on the CSV's dates being in the future.
- e2e tests create their own fixtures (tenants, listings, bookings, blocked days) and run against the `booking_test` database. Every e2e request goes to `/api/v1/...`.
- Tests that load the full CSV assert only date-independent facts: row counts (1000 listings, 12,757 bookings), the tenant split (363 / 428 / 209) and the mapping.
- Every new endpoint gets isolation and permission e2e cases: another tenant's resource → 404, a host of another tenant → 403, a client on host routes → 403, anonymous → 401.
- Availability edge cases use fixtures: back-to-back stays (checkout day is free), cancelled bookings block nothing, blocked days block.
- Web tests use Testing Library queries by role and label. The mocking strategy for API calls is decided (and verified in docs) in feature 9.
