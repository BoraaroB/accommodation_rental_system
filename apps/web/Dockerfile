# Web image, built from the repository root (npm workspaces share one lockfile):
#   docker build -f apps/web/Dockerfile --build-arg VITE_API_BASE_URL=/api/v1 .
# Node builds the app; nginx serves the files and proxies `/api/` to the API,
# so the browser calls the API on its own origin.
# Possible improvement (not in the plan): pin the base images by digest, and
# run nginx without root (the nginx-unprivileged image); the official image's
# master process runs as root, its workers as `nginx`.

FROM node:24-slim AS build
WORKDIR /app
# Manifests first: the dependency layer is rebuilt only when they change.
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/
# `--ignore-scripts` skips the root `prepare`, which builds sources that are not
# copied yet; `npm rebuild` then runs the dependencies' own install scripts.
RUN npm ci -w @ars/shared -w @ars/web --ignore-scripts && npm rebuild
COPY packages/shared packages/shared
COPY apps/web apps/web
# Built into the bundle: Vite exposes `VITE_*` variables of the environment, and
# a build argument is one during `RUN`.
ARG VITE_API_BASE_URL
RUN : "${VITE_API_BASE_URL:?set the VITE_API_BASE_URL build argument}" \
  && npm run build -w @ars/shared \
  && npm run build -w @ars/web

FROM nginx:1.30-alpine
# The image's entrypoint renders /etc/nginx/templates/*.template into
# /etc/nginx/conf.d at startup, so this replaces the default site.
COPY docker/web/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
