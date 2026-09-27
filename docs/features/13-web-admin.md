# Feature 13 — Web admin panel

- **Branch:** `feat/web-admin`
- **Status:** done – awaiting commit

## Goal and scope

The admin panel in the web app, on the admin API of feature 8 (plan: "tenant table, form and deletion, hosts panel"; done when the manual admin scenario passes and the tests are green). No API change.

- `/admin` — sends on to `tenants` (sign-in lands here).
- `/admin/tenants` — tenants table and deletion (`GET|DELETE /admin/tenants[/:tenantId]`).
- `/admin/tenants/new` — new tenant form (`POST /admin/tenants`).
- `/admin/tenants/:tenantId` — configuration editor and the Hosts section (`GET|PATCH /admin/tenants/:tenantId`, `GET|POST|DELETE .../hosts`). The parameter is `:tenantId`, as in the API (D-051), not the plan's example `:id`.

Challenge references:

- "a superadmin creates tenants, configures them and adds host accounts to them"
- "10. Creating, editing and deleting tenants."
- "11. Tenant configuration. Name and slug are required; anything beyond that is up to you — logo, currency, primary colour, contact email."
- "12. Adding host accounts to a tenant. A tenant may have several hosts."

## Decisions

Approved by the repository owner in the design:

- **Deletion** stays a hard delete (D-029). Asked during the design whether to use a soft delete instead, the owner kept the plan: a soft delete needs a schema and API change. The industry pattern for an irreversible delete was agreed: an alert dialog that names what is lost, confirmation by typing the slug, a destructive button with a specific label ("Delete tenant"), disabled while the request runs, the dialog left open with the error on failure, a toast and a refetch (not an optimistic removal) on success.
- **Tenant form:** one component for create and edit on `tenantCreateSchema`; the edit sends only the changed fields and a cleared field as `null` (merge patch, D-052); 409 `SLUG_TAKEN` on the slug field; a changed slug warns that the old address stops working; the colour as `#rrggbb` text with the native colour picker (no library).
- **After creating** a tenant: its page, with a toast naming the live portal.
- **Hosts:** list with Remove and a plain confirmation; the add form (`hostInputSchema`); 409 `ALREADY_HOST` on the e-mail; `accountCreated: false` shows that the existing account's name and password were not changed (D-053).
- **Cache tags:** the admin tenant mutations invalidate every `Tenant` tag, also provided by the public `getTenants` / `getTenant`; `Host` by tenant id.

Recorded as [D-069](../decisions.md#d-069-the-admin-panel-edits-tenants-and-hosts-in-forms-that-follow-the-apis-rules) and [D-070](../decisions.md#d-070-the-admins-changes-make-every-tenant-response-stale); D-029 got a note.

Changed during implementation:

- The shadcn CLI wanted to overwrite `button.tsx` when adding `alert-dialog` (it would drop the `onPrimary` variant); the overwrite was declined, and the generated backdrop's palette class `bg-black/10` became `bg-foreground/10`, as for the rest of the kit (D-060).
- The delete and remove buttons each own their dialog (the row's button is its trigger), and the typed slug starts empty each time the dialog opens.
- A blank optional field becomes `null` through the field's `setValueAs`; React Hook Form also passes it the default value, which can be `null`.
- The colour picker shows black (`#000000`, the browser's own default) while the field is empty or not yet a colour: a colour input always holds a colour. It is a form value, not a style.
- A deletion (tenant or host) that answers 404 also refreshes the list: the row was already gone.
- The name and password fields of the add-host form say they apply to a new account only, so the admin knows before submitting (D-053).

Asked by the repository owner after the review:

- The admin header had no way to the landing page (`/`); it now has "All portals" (a house icon, the text from `sm` up), as a portal's header does.

Found in the review and fixed:

- A deletion that answered 404 (the tenant was deleted elsewhere) refreshed the list, whose row then took the dialog with it, although the log and D-069 said the dialog stays open; the test only passed because its stub kept the tenant. A 404 now closes the dialog with "… was already deleted" (a host: "… was already removed"), and the test's list drops the tenant; a 500 keeps the dialog open for another try.
- `UNIQUE_VIOLATION` (two requests racing for one slug, as the API's service describes) is shown on the slug field like `SLUG_TAKEN`. For hosts it stays above the form: the race can be on the account or on the membership.
- "Discard changes" also clears the error of a failed save.
- The colour picker reads the field through the shared schema instead of repeating the `#rrggbb` rule.
- The possible-improvement comments were placed above the doc comments they sat inside.
- Tests: the realistic 404 deletion, a failed (500) deletion, a host already removed, "Discard changes", `UNIQUE_VIOLATION` on the slug.

Found in the manual scenario:

- The success toasts (bottom right) can cover the "Add host" button on a desktop for a few seconds; they close on their own or with their close button. Left as it is: the toaster's position is app-wide (D-063).
- On phones "View the portal" stretched across the header; it is aligned to the start like the back link.

## What was done

- Routes: `/admin` sends on to `tenants` (a loader redirect); `tenants`, `tenants/new` and `tenants/:tenantId` under `AdminLayout`.
- `features/admin/`: `api.ts` (`adminApi`: tenants list, one tenant, create, update, delete; hosts list, add, remove — with `argSchema` / `responseSchema` and tags), `paths.ts`, and the components `TenantsTable`, `DeleteTenantDialog`, `TenantForm`, `HostsSection` (with the remove confirmation), `AddHostForm`.
- Pages: `AdminTenantsPage`, `AdminNewTenantPage`, `AdminTenantPage`.
- Shared: the `Tenant` and `Host` tags in `baseApi`, provided by the public tenant queries too; `alert-dialog` from the shadcn CLI; test fixtures `anAdminTenant`, `aHost`.
- Docs: D-069, D-070, a note on D-029, `architecture.md` (tree, routes, admin panel), `README.md` (using the admin panel).

## Key files

- `apps/web/src/features/admin/api.ts`, `paths.ts`
- `apps/web/src/features/admin/components/TenantForm.tsx`, `DeleteTenantDialog.tsx`, `TenantsTable.tsx`, `HostsSection.tsx`, `AddHostForm.tsx`
- `apps/web/src/pages/AdminTenantsPage.tsx`, `AdminNewTenantPage.tsx`, `AdminTenantPage.tsx`
- `apps/web/src/api/baseApi.ts` (tags), `apps/web/src/features/tenants/api.ts`, `apps/web/src/app/router.ts`

## Tests

- `AdminTenantsPage`: the table and its links (tenant page, portal), contact and colour (or "Default"), the count and "New tenant"; the empty state; deleting — "Delete tenant" disabled until the slug is typed exactly, one DELETE, the list loaded again without the tenant, the dialog closed; Cancel sends nothing; a failed deletion (500) keeps the dialog open for another try; a tenant already deleted (404) closes it and leaves the list.
- `AdminNewTenantPage`: creating sends blank optional fields as `null`, opens the tenant's page and names the portal in the toast; a missing name and a reserved slug send nothing; a slug that is not kebab-case; 409 `SLUG_TAKEN` on the field, staying on the form.
- `AdminTenantPage`: the configuration, the portal and back links; an edit sends only the changed fields (trimmed), a cleared one as `null`, then refetches (tags) with the form clean; the colour picker writes the field; a new slug's warning; a reserved slug, a bad colour and a `javascript:` logo send nothing; 409 `SLUG_TAKEN` and `UNIQUE_VIOLATION` on the field only; "Discard changes" after a failed save; "Tenant not found" for a bad id and a 404; hosts listed or "No hosts yet"; adding a host (e-mail lowercased, list refetched, form emptied); `accountCreated: false`'s notice; 409 `ALREADY_HOST` on the e-mail only; invalid host input sends nothing; removing a host after the confirmation, and one already removed (404).
- The router: `/admin` opens the tenants; the header links to all portals.

## Verification

| Command                         | Result                                                |
| ------------------------------- | ----------------------------------------------------- |
| `npm run lint`, `typecheck`     | green                                                 |
| `npm test`                      | shared 238, API 227, web 243                          |
| `npm run build`, `format:check` | green (the known chunk-size warning of the web build) |
| API e2e                         | 257, green (nothing in `apps/api` changed)            |

Manual scenario (current API and web dev server, headless Chrome driven through the DevTools protocol, 1280 px and 375 px), 22 checks, all passing:

- `admin@example.com` signs in and lands on `/admin/tenants`.
- An empty new-tenant form shows the errors and stays; a filled one (colour typed as `#BE123C`) creates the tenant, opens its page with the toast naming the portal, and the colour is saved lowercased.
- Typing `adriatic` as the slug warns that the old address stops working; saving shows 409 `SLUG_TAKEN` on the field; "Discard changes" puts the slug back.
- "View the portal" shows the tenant's name and colour; back in the admin page, a rename with a cleared contact e-mail is saved (`contactEmail: null` in the public API), and going forward to the portal shows the new name at once (tags, no stale cache).
- A new host is added and listed; adding it again shows 409 `ALREADY_HOST` on the e-mail; `host1.adriatic@example.com` (an existing account) is added with the notice that its name and password were not changed, then removed after the confirmation.
- The new host signs in and lands on their empty host panel (`/{slug}/host/listings`); the same host gets the 403 page on `/admin/tenants`.
- At 375 px the tenants, new-tenant and tenant pages have no horizontal scroll, and the delete dialog fits the screen; "Delete tenant" stays disabled for no and for a partial slug, and after the full slug the tenant is deleted: the row is gone and its portal answers 404.
- The test hosts' accounts stay in the local database (accounts are global); the test tenants were deleted.
- Run again after the review's fixes: 22/22.

## Deliberately left out

- An "unsaved changes" prompt when leaving the form: not in the plan (as in the host panel).
- A delete button on the tenant's page: the plan puts deletion in the table.
- Currency: not an input, EUR is the only one (D-052).

## Possible improvements (not in the plan)

- A soft delete with a period in which a deleted tenant can be restored; it needs a schema and API change (comment in `features/admin/components/DeleteTenantDialog.tsx`).
- Invite a new host by e-mail, or make them change the first password, so the admin never knows it (comment in `features/admin/components/AddHostForm.tsx`, D-053).
- Invalidate `Tenant` on a 404 from an edit or an added host (the tenant was deleted elsewhere), so the page says "Tenant not found" instead of keeping the form; tag `GET /auth/me`, so a superadmin who also hosts the tenant sees its new slug in the account menu without a reload (both from the review; comment in `features/admin/api.ts`).

## Commit message

Not committed yet.
