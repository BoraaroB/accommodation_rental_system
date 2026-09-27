# API image, built from the repository root (npm workspaces share one lockfile):
#   docker build -f apps/api/Dockerfile --target <target> .
# Targets:
#   migrate — applies the migrations and loads data/*.csv, then exits
#   runtime — the API, with production dependencies only
# Possible improvement (not in the plan): pin the base images by digest,
# updated by a dependency bot.

# Every dependency of @ars/shared and the API, and both packages built.
FROM node:24-slim AS build
# The Prisma CLI (generate, migrate) picks its schema engine by the OpenSSL
# version, and the slim image has none.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
# Manifests first: the dependency layer is rebuilt only when they change.
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
# `--ignore-scripts` skips the root `prepare`, which builds sources that are not
# copied yet; `npm rebuild` then runs the dependencies' own install scripts
# (e.g. the download of the Prisma schema engine).
RUN npm ci -w @ars/shared -w @ars/api --ignore-scripts && npm rebuild
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npm run build -w @ars/shared && npm run build -w @ars/api

# One-off job before the API starts. The Prisma CLI and tsx are dev
# dependencies, so this target keeps every dependency. `migrate deploy` skips
# applied migrations; the seed inserts only missing rows, so it also brings back
# seeded rows deleted since (D-071).
# Possible improvement (not in the plan): seed only an empty database.
FROM build AS migrate
COPY data/listings.csv data/bookings.csv /app/data/
ENV SEED_DATA_DIR=/app/data
# The workspace's CLIs (prisma, tsx) are hoisted to the root node_modules.
ENV PATH=/app/node_modules/.bin:$PATH
WORKDIR /app/apps/api
USER node
CMD ["sh", "-c", "prisma migrate deploy && prisma db seed"]

# Production dependencies only. `@prisma/client` names the Prisma CLI as an
# optional peer, so npm keeps the CLI (and TypeScript) unless optional packages
# are omitted as well; the API needs none. No install script is needed at
# runtime: bcrypt ships prebuilt binaries and the Prisma client talks to
# Postgres through the pg driver adapter, without an engine.
FROM node:24-slim AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN npm ci -w @ars/shared -w @ars/api --omit=dev --omit=optional --ignore-scripts

FROM node:24-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=prod-deps /app ./
COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/apps/api/dist apps/api/dist
WORKDIR /app/apps/api
USER node
# `node` runs as PID 1 and receives `docker stop`'s SIGTERM itself; the API
# closes its providers on it (`enableShutdownHooks`).
CMD ["node", "dist/main.js"]
