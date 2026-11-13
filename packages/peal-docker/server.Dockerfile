# syntax=docker/dockerfile:1.28.0@sha256:bb22d9815c728170f72750f4e5b0d672e06176142e1d602c7e66c050100b7e5b

# The production image of peal-server. Build it from the repository root:
#
#   bun nx run peal-docker:build-server-image
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
COPY packages/peal-contract/package.json packages/peal-contract/
COPY packages/peal-server/package.json packages/peal-server/

RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile --production --filter peal-server

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
# ffprobe, which reads a video's dimensions, duration and codec: a static
# build (no shared libraries, so it runs on the distroless base), pinned by
# digest for amd64 and arm64. Without it, videos stay uploaded and unprobed.
COPY --from=mwader/static-ffmpeg:9.0.2-1@sha256:f5d100184884eb3e82b0eb14bb5ebf98da99826ac824989720297fb9ef21c822 /ffprobe /usr/local/bin/ffprobe
COPY --from=dependencies /app/node_modules node_modules
COPY --from=dependencies /app/packages/peal-contract/node_modules packages/peal-contract/node_modules
COPY --from=dependencies /app/packages/peal-server/node_modules packages/peal-server/node_modules
COPY packages/peal-contract/package.json packages/peal-contract/
COPY packages/peal-contract/src packages/peal-contract/src
COPY packages/peal-server/package.json packages/peal-server/
COPY packages/peal-server/src packages/peal-server/src
# The migrations the server applies when it starts.
COPY packages/peal-server/drizzle packages/peal-server/drizzle
# Prints a new key for the Bluesky client, so a deployment can create
# BLUESKY_CLIENT_KEYS on its own host: peal-infra does.
COPY packages/peal-server/scripts/bluesky-key.ts packages/peal-server/scripts/
# Prints the addresses to register with each platform's app for the
# server's PUBLIC_URL, so operators read them from the server they run.
COPY packages/peal-server/scripts/platform-addresses.ts packages/peal-server/scripts/
# Gives the Stripe account the rate card's catalogue, run where
# STRIPE_SECRET_KEY already is, so the key never leaves the server.
COPY packages/peal-server/scripts/stripe-catalogue.ts packages/peal-server/scripts/

USER nonroot

EXPOSE 3000

# Bun is the only program in the image, so it probes /api/health itself.
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --start-interval=1s --retries=3 \
    CMD ["bun", "--eval", "const response = await fetch(`http://127.0.0.1:${process.env.PORT ?? 3000}/api/health`); process.exit(response.ok ? 0 : 1);"]

ENTRYPOINT ["bun"]
CMD ["packages/peal-server/src/main.ts"]
