# syntax=docker/dockerfile:1.28.0@sha256:bb22d9815c728170f72750f4e5b0d672e06176142e1d602c7e66c050100b7e5b

# The production image of acme-server. Build it from the repository root:
#
#   bun nx run acme-docker:build-server-image
#
# It runs the TypeScript sources with Bun, as a user without privileges, and
# reads PORT and plain environment variables (OTEL_EXPORTER_OTLP_ENDPOINT…),
# so it runs on any host. The frontend and base images are pinned by digest,
# with the tag for reading, so a re-pushed tag cannot change what ships.

# Dependencies: the server's production dependencies and its workspace
# packages, and nothing the other workspaces need. Bun skips the workspaces
# listed in bun.lock whose manifests are not copied here.
FROM oven/bun:1.4.4-slim@sha256:1846adf22496bd711036aae8be147e57bdebbaea2e5264e3e0b5af1db187d9a4 AS dependencies

WORKDIR /app

COPY package.json bun.lock ./
COPY packages/acme-contract/package.json packages/acme-contract/
COPY packages/acme-server/package.json packages/acme-server/

RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile --production --filter acme-server

# The C++ runtime that sharp's prebuilt libvips links against, which the
# distroless base lacks. --parents keeps each library's multiarch folder, so
# the runtime stage finds it without LD_LIBRARY_PATH on amd64 and arm64.
RUN mkdir /cc-runtime && \
    cp --parents /usr/lib/*-linux-gnu/libstdc++.so.6 /usr/lib/*-linux-gnu/libgcc_s.so.1 /cc-runtime/

# Runtime: Bun on a distroless base, with no shell or package manager.
FROM oven/bun:1.4.4-distroless@sha256:153a951ae40106e125898103e6e990ee0f38e6aee7f561029e26cf9fbed23470

WORKDIR /app

ENV NODE_ENV=production

COPY --from=dependencies /cc-runtime/ /
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

# Bun is the only program in the image, so it probes /api/health itself.
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --start-interval=1s --retries=3 \
    CMD ["bun", "--eval", "const response = await fetch(`http://127.0.0.1:${process.env.PORT ?? 3000}/api/health`); process.exit(response.ok ? 0 : 1);"]

ENTRYPOINT ["bun"]
CMD ["packages/acme-server/src/main.ts"]
