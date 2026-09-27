# Feature 14 — Docker

- **Branch:** `chore/docker`
- **Status:** done – awaiting commit

## Goal and scope

The whole stack in Docker Compose (plan: "api Dockerfile (`node:24-slim`; `migrate deploy` → seed → start) and web (nginx `default.conf.template`, `VITE_API_BASE_URL` as a build arg), full compose with a root `.env` and `.env.example`"; done when `cp .env.example .env && docker compose up --build` works on a clean clone). No application code changes.

## Decisions

Approved by the repository owner in the design:

- **Migrations and the seed run in a one-off `migrate` service**, not in the API container's start command as the plan says. The API image has two targets: `migrate` (all dependencies; `prisma migrate deploy`, then the seed, then it exits) and `runtime` (production dependencies only; `node dist/main.js` as the `node` user). The `api` service starts only after `migrate` has completed successfully. The owner chose this over the plan's variant after asking whether it is the industry standard: migrations as a separate step before the app starts (a Kubernetes Job or init container, Heroku's release phase, a CI/CD step) run once however many API replicas there are, and the API image carries no Prisma CLI or `tsx`.
- **`JWT_SECRET` in the root `.env.example`** is a long value marked as local-only, so a copied example starts the stack, as the plan's done criterion requires. `apps/api/.env.example` keeps its short placeholder (D-042), so a local API started with `npm` still refuses to run until a real secret is set.
- The web image is built with Node and served by `nginx:1.30-alpine`: the SPA with a fallback to `index.html`, and `/api/` proxied to `API_UPSTREAM`, so the browser calls the API on its own origin.
- Every published port is bound to `127.0.0.1`, as the database already was.

Verified before writing (locally):

- `nginx:1.30-alpine` (nginx 1.30.5) and `node:24-slim` exist. The nginx entrypoint (`/docker-entrypoint.d/20-envsubst-on-templates.sh`) runs `envsubst` over `/etc/nginx/templates/*.template` into `/etc/nginx/conf.d`, substituting only variables that are set, so nginx's own `$uri` is left alone.
- `npm ci` takes `-w` to install only the named workspaces (npm 11.16).
- `@prisma/engines` downloads the schema engine in its `postinstall`, so the dependencies are installed inside the Linux image; `bcrypt` 6 ships glibc prebuilds for linux-x64 and linux-arm64.

Changed during implementation:

- The slim image has no OpenSSL, which the Prisma CLI needs to pick its schema engine; the build stage installs it (the runtime needs no engine).
- `npm ci --omit=dev` still installed the Prisma CLI, TypeScript and Prisma Studio: `@prisma/client` names the CLI as an optional peer, so npm keeps it. `--omit=peer` did not help; `--omit=dev --omit=optional` did. The runtime image went from 582 MB to 351 MB, and the API was checked to work without its optional dependencies (sign-in with bcrypt, Prisma queries).
- The migrate command calls `prisma` directly (the hoisted `node_modules/.bin` on `PATH`) instead of `npx`, which printed npm's update notice.
- The API's healthcheck runs every 2 s while starting (`start_interval`) and every 30 s after, instead of every 5 s, which wrote a `GET /api/health` line to the API's log every 5 s.

Found in the review and fixed:

- The seed brings back seeded rows deleted since (a tenant, a host's membership), and a seeded tenant whose slug changed gets an empty twin with the old slug. The docs called the job "safe to repeat"; D-071, D-040, README, architecture and the comments now say what happens, and seeding only an empty database is a possible improvement.
- nginx resolves `api` only at startup: `web` depends on `api` with `restart: true`, so Compose restarts it after recreating the API.
- The migrate shell ran as PID 1 and ignored SIGTERM: the service has `init: true`.
- The `API_UPSTREAM` comment says it takes no path or trailing slash (a trailing slash would make nginx strip `/api/`).
- The README names the Docker version `start_interval` needs (Engine 25).
- Possible-improvement comments for image digests, a non-root nginx and TLS.

## What was done

- `apps/api/Dockerfile`: a `build` stage (OpenSSL, dependencies from the manifests, `@ars/shared` and the API built); the `migrate` target (the CSV files, `prisma migrate deploy && prisma db seed`, as `node`); a `prod-deps` stage (`npm ci --omit=dev --omit=optional --ignore-scripts`); the `runtime` target (`NODE_ENV=production`, `dist/` only, as `node`, `node dist/main.js`).
- `apps/web/Dockerfile`: the Vite build with the required `VITE_API_BASE_URL` build argument, served by `nginx:1.30-alpine`; `docker/web/default.conf.template` (SPA fallback, `/api/` proxied to `API_UPSTREAM`).
- `.dockerignore`.
- `docker-compose.yml`: the services `migrate`, `api` and `web` next to `db`, in order through `depends_on`; `DATABASE_URL` built from the `POSTGRES_*` values; every port on `127.0.0.1`.
- Root `.env.example`: the API's, the seed's and the web app's variables, with a local-only `JWT_SECRET`.
- Docs: D-071, D-072, notes on D-022, D-027, D-038, D-040 and D-042; `architecture.md` (overview, configuration, a Docker section); `README.md` (Run with Docker, requirements, structure).

## Key files

- `apps/api/Dockerfile`, `apps/web/Dockerfile`, `.dockerignore`
- `docker/web/default.conf.template`
- `docker-compose.yml`, `.env.example`

## Tests

No application code changed, so there are no new unit or e2e tests; the images and Compose were checked by running them (below).

## Verification

| Command                         | Result                                                |
| ------------------------------- | ----------------------------------------------------- |
| `npm run lint`, `typecheck`     | green                                                 |
| `npm test`                      | shared 238, API 227, web 243                          |
| `npm run build`, `format:check` | green (the known chunk-size warning of the web build) |
| API e2e                         | 257, green                                            |
| `docker compose config --quiet` | valid with `.env.example`                             |

The stack, from a copy of the repository without ignored files (as a clean clone: no `node_modules`, `dist` or `.env`), run with `cp .env.example .env && docker compose up --build --wait` under another project name. Only the ports in the copy's `.env` were changed, because 5432 and 8080 are taken on this machine; this also showed that they are configurable:

- `db` healthy → `migrate` exited 0 (the migration applied; 3 tenants, 8 users, 6 memberships, 1,000 listings, 12,757 bookings) → `api` healthy → `web` started.
- Through nginx: `/` and the deep link `/adriatic/listings` return `index.html`, a hashed asset its JavaScript, `/api/health` and `/api/v1/tenants` 200, `/api/listings` 404 with an `x-request-id`, a date-filtered listings search returns listings, and `admin@example.com` signs in (bcrypt on the runtime image) and `GET /auth/me` answers. The API port answers directly too.
- The API writes JSON log lines; nginx rendered the template.
- A second `up` on the same volume: "No pending migrations to apply", the seed inserted 0 rows, the counts stayed the same.
- `docker compose stop api` finished at once with exit code 0 (SIGTERM handled, not killed).
- After the review's fixes, again: `migrate` runs with `init` and exits 0; the API recreated alone (`--force-recreate --no-deps`), after which `/api/health` through nginx answers 200. Docker gave the new container the same address, so the stale-address case itself was not reproduced.
- The test containers, images and volume were removed.

## Deliberately left out

- A healthcheck for `web`: nothing depends on it.
- Changing the seed so it runs only on an empty database: not in the plan (possible improvement).
- Excluding `/api/health` from the API's request log: an application change; the slower healthcheck interval keeps the log quiet instead.

## Possible improvements (not in the plan)

- Seed only an empty database, so rows deleted in the panels stay deleted across `up` (comment in `apps/api/Dockerfile`).
- Pin the base images by digest, kept up to date by a dependency bot (comments in both Dockerfiles).
- Run nginx without root (the nginx-unprivileged image) (comment in `apps/web/Dockerfile`).
- Long-lived cache headers for `/assets/` and a 404 for a missing asset, gzip, security headers such as a Content-Security-Policy, and TLS or a TLS-terminating proxy (comment in `docker/web/default.conf.template`).
