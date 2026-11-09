# syntax=docker/dockerfile:1.28.0@sha256:bb22d9815c728170f72750f4e5b0d672e06176142e1d602c7e66c050100b7e5b

# The production image of peal-web: Next's standalone server with its static
# files, on Node, as a user without privileges. Build it from the repository
# root:
#
#   bun nx run peal-docker:build-web-image
#
# It reads PORT (3001 here), HOSTNAME (0.0.0.0 here) and PEAL_API_URL at
# runtime, so one build runs against any server. Base images are pinned by
# digest, with the tag for reading.

# Bun installs the workspace; Node runs Next, as in CI.
FROM oven/bun:1.4.4-slim@sha256:1846adf22496bd711036aae8be147e57bdebbaea2e5264e3e0b5af1db187d9a4 AS bun

FROM node:26.13.0-trixie-slim@sha256:5adad64f9a1fca2d51972caa65983634c8a774eb300d72b20f7f2a0f60368072 AS build

COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

# The web app and the workspace packages it compiles, and nothing the other
# workspaces need. Bun skips the workspaces listed in bun.lock whose
# manifests are not copied here.
COPY package.json bun.lock ./
COPY packages/peal-contract/package.json packages/peal-contract/
COPY packages/peal-ui/package.json packages/peal-ui/
COPY packages/peal-web/package.json packages/peal-web/

RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile --filter peal-web

COPY tsconfig.base.json ./
COPY packages/peal-contract packages/peal-contract
COPY packages/peal-ui packages/peal-ui
COPY packages/peal-web packages/peal-web

RUN cd packages/peal-web && ./node_modules/.bin/next build

# Runtime: the traced server only. Next serves .next/static itself, but the
# standalone output leaves it out, so it is copied beside the server.
FROM node:26.13.0-trixie-slim@sha256:5adad64f9a1fca2d51972caa65983634c8a774eb300d72b20f7f2a0f60368072

WORKDIR /app

# Docker sets HOSTNAME to the container id, which Next would listen on.
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3001

COPY --from=build /app/packages/peal-web/.next/standalone ./
COPY --from=build /app/packages/peal-web/.next/static packages/peal-web/.next/static

# The files belong to root and stay read-only; only Next's cache is the
# server's to write.
RUN mkdir packages/peal-web/.next/cache && chown node:node packages/peal-web/.next/cache

USER node

EXPOSE 3001

# Any answer below 500 means the server is up; pages render without the API.
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --start-interval=1s --retries=3 \
    CMD ["node", "--eval", "fetch(`http://127.0.0.1:${process.env.PORT}/sign-in`, { redirect: 'manual' }).then((response) => process.exit(response.status < 500 ? 0 : 1), () => process.exit(1));"]

CMD ["node", "packages/peal-web/server.js"]
