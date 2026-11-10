# syntax=docker/dockerfile:1.28.0@sha256:bb22d9815c728170f72750f4e5b0d672e06176142e1d602c7e66c050100b7e5b

# The static builds of the marketing site (port 8080) and the docs (port
# 8081), served by nginx as a user without privileges. Build it from the
# repository root:
#
#   bun nx run peal-docker:build-static-image
#
# Their settings are read at build time, so pass them as build arguments,
# such as --build-arg SITE_URL=https://example.com. Each is optional: unset
# or empty turns its feature off, as in `bun run build`.

FROM oven/bun:1.4.4-slim@sha256:1846adf22496bd711036aae8be147e57bdebbaea2e5264e3e0b5af1db187d9a4 AS bun

FROM node:26.13.0-trixie-slim@sha256:5adad64f9a1fca2d51972caa65983634c8a774eb300d72b20f7f2a0f60368072 AS build

COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun

WORKDIR /app

ENV ASTRO_TELEMETRY_DISABLED=1

# The docs render the API reference from the contract's openapi.json.
COPY package.json bun.lock ./
COPY packages/peal-contract/package.json packages/peal-contract/
COPY packages/peal-docs/package.json packages/peal-docs/
COPY packages/peal-site/package.json packages/peal-site/

RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile --filter peal-contract --filter peal-docs --filter peal-site

COPY tsconfig.base.json ./
COPY packages/peal-contract packages/peal-contract
COPY packages/peal-docs packages/peal-docs
COPY packages/peal-site packages/peal-site

ARG DOCS_SITE_URL=""
ARG DOCS_PLAUSIBLE_DOMAIN=""
ARG DOCS_PLAUSIBLE_HOST=""
ARG SITE_URL=""
ARG SITE_APP_URL=""
ARG SITE_DOCS_URL=""
ARG SITE_PLAUSIBLE_DOMAIN=""
ARG SITE_PLAUSIBLE_HOST=""

RUN cd packages/peal-contract && bun scripts/openapi.ts
RUN cd packages/peal-docs && ./node_modules/.bin/blume build
RUN cd packages/peal-site && ./node_modules/.bin/astro build

FROM nginxinc/nginx-unprivileged:1.31.7-alpine@sha256:b5047b9b76845eac124358373c6852377c52e4b05834a47647e955dd91cb8f1e

COPY packages/peal-docker/config/static/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/packages/peal-site/dist /usr/share/nginx/site
COPY --from=build /app/packages/peal-docs/dist /usr/share/nginx/docs

# The base image's unprivileged nginx user.
USER 101

EXPOSE 8080 8081

HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --start-interval=1s --retries=3 \
    CMD ["wget", "-q", "-O", "/dev/null", "http://127.0.0.1:8080/", "http://127.0.0.1:8081/"]
