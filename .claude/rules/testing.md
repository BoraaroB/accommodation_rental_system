---
paths:
  - '**/*.{spec,test}.{ts,tsx}'
---

# Testing rules (Vitest 4.1)

- Test behaviour, not implementation details. Prefer table-driven cases with `it.each`.
- Dates are relative to today: `addDays(today(), n)` from `@ars/shared`. Never rely on the CSV's dates being in the future.
- e2e tests create their own fixtures (tenants, listings, bookings, blocked days) and run against the `booking_test` database. Every e2e request goes to `/api/v1/...`.
- Tests that load the full CSV assert only date-independent facts: row counts (1000 listings, 12,757 bookings), the tenant split (363 / 428 / 209) and the mapping.
- Every new endpoint gets isolation and permission e2e cases: another tenant's resource → 404, a host of another tenant → 403, a client on host routes → 403, anonymous → 401.
- Availability edge cases use fixtures: back-to-back stays (checkout day is free), cancelled bookings block nothing, blocked days block.
- Web tests use Testing Library queries by role and label. The mocking strategy for API calls is decided (and verified in docs) in feature 9.
