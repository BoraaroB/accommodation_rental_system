---
paths:
  - 'apps/web/**'
---

# Web rules (Vite 8, React 19, Tailwind 4, RTK)

- Routing: React Router 8 data mode — `createBrowserRouter` + `RouterProvider` from `react-router`. The tenant param is `:tenantSlug`.
- Data fetching: one `createApi` in `shared/api/baseApi.ts`; each feature adds endpoints with `injectEndpoints`; invalidation through tags. Endpoints use `argSchema` / `responseSchema` from `@ars/shared`, with `catchSchemaFailure` and `skipSchemaValidation` in production.
- **Filters live in the URL** search params (`useListingFilters`), never in Redux or component state. "Apply" writes the params and resets `page` to 1; empty values are not written.
- Redux slices are only for auth (token) and UI state (drawer, toasts).
- Env: only `shared/config/env.ts` reads `import.meta.env` (zod-validated `VITE_*`); the rest of the code imports from it.
- Forms: react-hook-form + `zodResolver(sharedSchema)`; server 400 `message[]` and known error `code`s are mapped to fields with `setError`.
- Errors: `QueryState` for loading / error / empty / content; `getErrorMessage` in `shared/api/errors.ts` is the only place that narrows RTK errors; route `ErrorBoundary` + layout boundaries + the widget `ErrorBoundary` class for risky widgets.
- UI: reuse `shared/ui` components (variant maps, tokens only). Colours, radius and fonts come from `styles/tokens.css` (`@theme`) — no raw hex values. Mobile-first: base styles are for phones, `md:` / `lg:` extend them. Tenant branding overrides `--color-primary` at runtime.
- Money is shown from cents; totals are computed in cents (`nights × pricePerNightCents`). A `null` rating is shown as "New".
