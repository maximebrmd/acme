# syntax=docker/dockerfile:1.28.0

# The production image of acme-server. Build it from the repository root:
#
#   bun nx run acme-docker:build-server-image
#
# It runs the TypeScript sources with Bun, as a user without privileges, and
# reads PORT and plain environment variables (OTEL_EXPORTER_OTLP_ENDPOINT…),
# so it runs on any host.

# Dependencies: the server's production dependencies and its workspace
# packages, and nothing the other workspaces need. Bun skips the workspaces
# listed in bun.lock whose manifests are not copied here.
FROM oven/bun:1.4.4-slim AS dependencies

WORKDIR /app

COPY package.json bun.lock ./
COPY packages/acme-contract/package.json packages/acme-contract/
COPY packages/acme-server/package.json packages/acme-server/

RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile --production --filter acme-server

# Runtime: Bun on a distroless base, with no shell or package manager.
FROM oven/bun:1.4.4-distroless

WORKDIR /app

ENV NODE_ENV=production

# Effect exports a signal only when its OTEL_<SIGNAL>_EXPORTER names otlp,
# where the OpenTelemetry specification defaults to it. Default them here, so
# setting OTEL_EXPORTER_OTLP_ENDPOINT alone turns export on; without an
# endpoint nothing is sent. Set one to "none" to turn that signal off.
ENV OTEL_TRACES_EXPORTER=otlp \
    OTEL_METRICS_EXPORTER=otlp \
    OTEL_LOGS_EXPORTER=otlp

COPY --from=dependencies /app/node_modules node_modules
COPY --from=dependencies /app/packages/acme-contract/node_modules packages/acme-contract/node_modules
COPY --from=dependencies /app/packages/acme-server/node_modules packages/acme-server/node_modules
COPY packages/acme-contract/package.json packages/acme-contract/
COPY packages/acme-contract/src packages/acme-contract/src
COPY packages/acme-server/package.json packages/acme-server/
COPY packages/acme-server/src packages/acme-server/src
# The migrations the server applies when it starts.
COPY packages/acme-server/drizzle packages/acme-server/drizzle

USER nonroot

EXPOSE 3000

# Bun is the only program in the image, so it probes /health itself.
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --start-interval=1s --retries=3 \
    CMD ["bun", "--eval", "const response = await fetch(`http://127.0.0.1:${process.env.PORT ?? 3000}/health`); process.exit(response.ok ? 0 : 1);"]

ENTRYPOINT ["bun"]
CMD ["packages/acme-server/src/main.ts"]
