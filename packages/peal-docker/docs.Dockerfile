# syntax=docker/dockerfile:1.28.0@sha256:bb22d9815c728170f72750f4e5b0d672e06176142e1d602c7e66c050100b7e5b

# The docs as a Node server, for their assistant, which answers from a
# server route: Blume's node() build, on Node, as a user without
# privileges. Without an assistant the docs are static files, in the static
# image (static.Dockerfile), and this image is not needed. Build it from the
# repository root:
#
#   bun nx run peal-docker:build-docs-image
#
# Its settings are read at build time, so pass them as build arguments:
# DOCS_ASSISTANT_MODEL, such as --build-arg DOCS_ASSISTANT_MODEL=claude-haiku-5-5,
# is required; the others are optional, unset or empty turning their feature
# off. At runtime it reads PORT (4323 here) and HOST (0.0.0.0 here), the
# Anthropic key DOCS_ANTHROPIC_API_KEY with each question,
# DOCS_TURNSTILE_SECRET_KEY when the build has a Turnstile site key, and
# AUTH_IP_HEADERS, the header the edge gives the reader's address in
# (config/docs/serve.ts).

FROM oven/bun:1.4.4-slim@sha256:1846adf22496bd711036aae8be147e57bdebbaea2e5264e3e0b5af1db187d9a4 AS bun

FROM node:26.13.0-trixie-slim@sha256:5adad64f9a1fca2d51972caa65983634c8a774eb300d72b20f7f2a0f60368072 AS build

COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun

WORKDIR /app

ENV ASTRO_TELEMETRY_DISABLED=1

# The docs render the API reference from the contract's openapi.json, and
# take their tokens from peal-ui.
COPY package.json bun.lock ./
COPY packages/peal-contract/package.json packages/peal-contract/
COPY packages/peal-docs/package.json packages/peal-docs/
COPY packages/peal-ui/package.json packages/peal-ui/

RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile --filter peal-contract --filter peal-docs

COPY tsconfig.base.json ./
COPY packages/peal-contract packages/peal-contract
COPY packages/peal-docs packages/peal-docs
COPY packages/peal-ui packages/peal-ui

ARG DOCS_ASSISTANT_MODEL=""
ARG DOCS_TURNSTILE_SITE_KEY=""
ARG DOCS_APP_URL=""
ARG DOCS_SITE_URL=""
ARG DOCS_PLAUSIBLE_DOMAIN=""
ARG DOCS_PLAUSIBLE_HOST=""

# Without a model, Blume builds static files, which the static image serves.
RUN test -n "$DOCS_ASSISTANT_MODEL" \
    || { echo 'Set DOCS_ASSISTANT_MODEL: without an assistant, the static image serves the docs.' >&2; exit 1; }

RUN cd packages/peal-contract && bun scripts/openapi.ts
RUN cd packages/peal-docs && ./node_modules/.bin/blume build && test -f dist/server/entry.mjs

# The server resolves its packages through the project's node_modules: the
# production dependencies alone, installed again without the build's tools.
FROM node:26.13.0-trixie-slim@sha256:5adad64f9a1fca2d51972caa65983634c8a774eb300d72b20f7f2a0f60368072 AS dependencies

COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun

WORKDIR /app

COPY package.json bun.lock ./
COPY packages/peal-contract/package.json packages/peal-contract/
COPY packages/peal-docs/package.json packages/peal-docs/
COPY packages/peal-ui/package.json packages/peal-ui/

RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile --production --filter peal-docs

FROM node:26.13.0-trixie-slim@sha256:5adad64f9a1fca2d51972caa65983634c8a774eb300d72b20f7f2a0f60368072

WORKDIR /app

ENV NODE_ENV=production \
    ASTRO_TELEMETRY_DISABLED=1 \
    HOST=0.0.0.0 \
    PORT=4323

# The files belong to root and stay read-only.
COPY --from=dependencies /app/node_modules node_modules
COPY --from=dependencies /app/packages/peal-docs/node_modules packages/peal-docs/node_modules
COPY --from=build /app/packages/peal-docs/package.json packages/peal-docs/package.json
COPY --from=build /app/packages/peal-docs/dist packages/peal-docs/dist
COPY packages/peal-docker/config/docs/serve.ts packages/peal-docs/serve.ts

USER node

EXPOSE 4323

HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --start-interval=1s --retries=3 \
    CMD ["node", "--eval", "fetch(`http://127.0.0.1:${process.env.PORT}/`).then((response) => process.exit(response.ok ? 0 : 1), () => process.exit(1));"]

CMD ["node", "--import", "./packages/peal-docs/serve.ts", "packages/peal-docs/dist/server/entry.mjs"]
