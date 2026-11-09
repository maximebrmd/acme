# Acme

Schedule social media posts across platforms, from one place. "Acme" is a
working name.

Acme is fair source: you may use, modify and self-host it under the
[Functional Source License](LICENSE.md), and each release becomes Apache-2.0
two years after it ships.

## Set up

You need Git, Bun (the version in [`.bun-version`](.bun-version)), Node 26.13
or later, and Docker: Engine 28 or later with Compose 2.35 or later, because
the development stack uses an image mount.

```sh
bun install --frozen-lockfile
bun run references          # clone framework sources into .local/references
bun nx run acme-docker:up   # start the development stack, wait until healthy
```

## Development stack

| Service                        | Address                                               | Credentials                                                       |
| ------------------------------ | ----------------------------------------------------- | ----------------------------------------------------------------- |
| Postgres 18                    | `postgres://acme:acme@127.0.0.1:15432/acme`           | user, password and database `acme`                                |
| S3 API (SeaweedFS)             | <http://127.0.0.1:18333>                              | key `acme`, secret `acme-development-secret`, bucket `acme-media` |
| SeaweedFS file browser         | <http://127.0.0.1:18888>                              |                                                                   |
| SMTP (Mailpit)                 | `127.0.0.1:11025`                                     | any user and password                                             |
| Mailpit inbox                  | <http://127.0.0.1:18025>                              |                                                                   |
| OTLP (OpenTelemetry Collector) | gRPC `127.0.0.1:14317`, HTTP <http://127.0.0.1:14318> |                                                                   |
| Grafana                        | <http://127.0.0.1:13000>                              | anonymous admin                                                   |
| Prometheus                     | <http://127.0.0.1:19090>                              |                                                                   |
| Loki                           | <http://127.0.0.1:13100>                              |                                                                   |
| Tempo                          | <http://127.0.0.1:13200>                              |                                                                   |

Every port listens on 127.0.0.1 only. To change one, copy
`packages/acme-docker/.env.example` to `packages/acme-docker/.env`.

```sh
bun nx run acme-docker:logs               # follow the logs
bun nx run acme-docker:down               # stop
bun nx run acme-docker:down -- --volumes  # stop and delete the data
```

## Develop

Point the server at the stack's Postgres, then run the API and the web app
side by side:

```sh
export DATABASE_URL=postgres://acme:acme@127.0.0.1:15432/acme
bun nx run acme-server:dev   # http://localhost:3000
bun nx run acme-web:dev      # http://localhost:3001, French under /fr
```

The server applies pending database migrations when it starts, then listens on
port 3000 (`PORT` changes it). It serves its OpenAPI document at
`/openapi.json`, `GET /api/health` (liveness) and `GET /api/ready`
(readiness: 503 while the database is unreachable).

The web app forwards `/api/*` to `ACME_API_URL` (default
`http://localhost:3000`), read at request time. Open it on `localhost`: Next's
dev server blocks its dev resources for other hostnames, `127.0.0.1` included.

To send the server's telemetry to the stack, and see it in Grafana:

```sh
OTEL_EXPORTER_OTLP_ENDPOINT=http://127.0.0.1:14318 bun nx run acme-server:dev
```

### Database

```sh
bun nx run acme-server:db:generate   # write a migration from src/*/infrastructure/schema.ts
bun nx run acme-server:db:migrate    # apply pending migrations without starting the server
```

### Command line

```sh
bun nx run acme-cli:run -- health   # from source, against http://localhost:3000
bun nx run acme-cli:build           # compile packages/acme-cli/dist/acme
packages/acme-cli/dist/acme health --api-url http://localhost:3000
packages/acme-cli/dist/acme --help
```

`ACME_API_URL` also sets the URL. `acme health` exits with 0 when the API
answers, and with 1 when it is unreachable (5-second timeout) or answers with
an error.

### Docs and marketing site

```sh
bun nx run acme-docs:dev   # http://localhost:4322
bun nx run acme-site:dev   # http://localhost:4321
```

Both build without configuration. Optional build-time variables, read from the
environment:

- `DOCS_SITE_URL` and `SITE_URL`: the public origins, for absolute and
  canonical links.
- `SITE_DOCS_URL`: links the marketing site to the docs.
- `DOCS_PLAUSIBLE_DOMAIN` and `SITE_PLAUSIBLE_DOMAIN`: turn on Plausible.
- `DOCS_PLAUSIBLE_HOST` and `SITE_PLAUSIBLE_HOST`: point Plausible at a
  self-hosted instance.

## Verify

With the development stack up:

```sh
export DATABASE_URL=postgres://acme:acme@127.0.0.1:15432/acme
bun run check       # generated types, then oxlint and oxfmt
bun run typecheck
bun run test        # the server's tests write to DATABASE_URL
bun run build
```

## Build for production

`bun run build` writes `packages/acme-cli/dist/acme`, `packages/acme-docs/dist`,
`packages/acme-site/dist` and the web app's standalone server.

To run the web app, copy `packages/acme-web/.next/static` to
`packages/acme-web/.next/standalone/packages/acme-web/.next/static`, then, from
`packages/acme-web/.next/standalone`:

```sh
PORT=3001 ACME_API_URL=http://localhost:3000 node packages/acme-web/server.js
```

The server image runs the sources with Bun as an unprivileged user, and reads
`PORT` (default 3000) and plain environment variables. It runs in production
mode, which has no defaults for its address, secret, mail or client-address
header. To build it and run it against the development stack:

```sh
bun nx run acme-docker:build-server-image   # tags acme-server:local
docker run --rm --network acme_default -p 127.0.0.1:3000:3000 \
  -e DATABASE_URL=postgres://acme:acme@postgres:5432/acme \
  -e PUBLIC_URL=http://localhost:3001 \
  -e BETTER_AUTH_SECRET="$(openssl rand -base64 32)" \
  -e MAIL_FROM="Acme <noreply@acme.localhost>" \
  -e SMTP_URL=smtp://mailpit:1025 \
  -e AUTH_IP_HEADERS=x-forwarded-for \
  -e OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318 \
  acme-server:local
```

`AUTH_IP_HEADERS` names the header sign-in rate limits read the client's
address from. Behind a real edge, name the one it sets and overwrites, such
as `cf-connecting-ip` behind Cloudflare.

## Layout

| Package                                   | What it is                                                                     |
| ----------------------------------------- | ------------------------------------------------------------------------------ |
| [`acme-contract`](packages/acme-contract) | The HTTP API definition shared by the server and its clients                   |
| [`acme-server`](packages/acme-server)     | The Effect server                                                              |
| [`acme-ui`](packages/acme-ui)             | The design system: shadcn/ui and the Tailwind CSS v4 theme, shipped as sources |
| [`acme-web`](packages/acme-web)           | The web app (Next.js)                                                          |
| [`acme-cli`](packages/acme-cli)           | The `acme` command line, a client of the API                                   |
| [`acme-docker`](packages/acme-docker)     | The development stack and the server's production image                        |
| [`acme-docs`](packages/acme-docs)         | The documentation site (Blume), with the API reference from the contract       |
| [`acme-site`](packages/acme-site)         | The marketing site (Astro), with the privacy, terms and data deletion pages    |

How the code is organised, and the rules it follows, are in
[AGENTS.md](AGENTS.md).
