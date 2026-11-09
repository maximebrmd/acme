# Acme

Schedule social media posts across platforms, from one place. "Acme" is a
working name.

Acme is fair source: you may use, modify and self-host it under the
[Functional Source License](LICENSE.md), and each release becomes Apache-2.0
two years after it ships.

It is not released yet. Today you can:

- create an account and workspaces, and connect Mastodon and Bluesky
  accounts to them;
- upload images and videos to a workspace's media library;
- write a post, with its own text on some channels and images or videos
  with alt text, then schedule it, move it on a calendar or cancel it;
- have it published to Mastodon and Bluesky at its time, with its media;
- hear how each post ended, and which channels need reconnecting, under a
  bell in the app and by email, as each member chooses;
- ask a writing assistant to rewrite, shorten or translate a post, or to
  suggest hashtags, when the server has an AI provider;
- sign in from the command line, and let MCP clients read a workspace.

Analytics, billing, the other platforms, and managing members, invitations
and API keys from the app are still to come. Saved drafts are not listed
anywhere yet: keep a draft's address to come back to it.

## Set up

You need Git, Bun (the version in [`.bun-version`](.bun-version)), Node 26.13
or later, and Docker: Engine 28 or later with Compose 2.35 or later, because
the development stack uses an image mount.

```sh
bun install --frozen-lockfile
bun run references                  # clone framework sources into .local/references
bun nx run acme-docker:up           # start the development stack, wait until healthy
bun nx run acme-server:media-cors   # let browsers upload to the stack's bucket
```

`media-cors` puts a CORS rule on the bucket for the web app's origin,
`http://localhost:3001`, and any origins in `TRUSTED_ORIGINS`, and keeps the
bucket's other rules. Run it once per bucket; running it again changes
nothing.

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
`packages/acme-docker/.env.example` to `packages/acme-docker/.env`; to run a
second stack beside the first, also set `COMPOSE_PROJECT_NAME`.

```sh
bun nx run acme-docker:logs               # follow the logs
bun nx run acme-docker:down               # stop
bun nx run acme-docker:down -- --volumes  # stop and delete the data
```

The apps you run from source listen on these ports:

| App               | Address                 | Command                      |
| ----------------- | ----------------------- | ---------------------------- |
| Server (API, MCP) | <http://localhost:3000> | `bun nx run acme-server:dev` |
| Web app           | <http://localhost:3001> | `bun nx run acme-web:dev`    |
| Marketing site    | <http://localhost:4321> | `bun nx run acme-site:dev`   |
| Docs              | <http://localhost:4322> | `bun nx run acme-docs:dev`   |

## Develop

Point the server at the stack's Postgres, give it a key for channel tokens,
then run the API and the web app side by side:

```sh
export DATABASE_URL=postgres://acme:acme@127.0.0.1:15432/acme
export ACME_TOKEN_KEYS="dev:$(openssl rand -base64 32)"   # needed to connect channels
bun nx run acme-server:dev   # http://localhost:3000
bun nx run acme-web:dev      # http://localhost:3001, French under /fr
```

Outside production the server needs nothing else: it sends email to Mailpit,
stores media in SeaweedFS, and takes `http://localhost:3001` as its public
address (`PUBLIC_URL`), which links in emails and the platforms' redirects
point to. It applies pending database migrations when it starts, then listens
on port 3000 (`PORT` changes it). It answers `GET /api/health` (liveness) and
`GET /api/ready` (readiness: 503 while the database is unreachable), and
serves its OpenAPI document at `/openapi.json`.

The web app forwards `/api/*` and the OAuth discovery documents
(`/.well-known/oauth-*`) to `ACME_API_URL` (default `http://localhost:3000`),
read at request time, so browsers, the command line and MCP clients all use
one origin. Open it on `localhost`: Next's dev server serves its scripts to
that hostname only, so on `127.0.0.1` pages never hydrate.

### A first account

1. Open <http://localhost:3001/sign-up> and create an account, with a password
   of at least 12 characters.
2. Open the confirmation email in Mailpit, <http://127.0.0.1:18025>, and follow
   its link, which signs you in.
3. On <http://localhost:3001/app>, create a workspace. You own it.

Each workspace's card links to its **Calendar**, **New post** (the composer),
**Channels** and **Media library**. Password reset and invitation emails land
in Mailpit too.

To make an account staff (Better Auth's admin role, which may impersonate
members and ban accounts), set its role in the database, then sign in again:

```sh
docker compose --file packages/acme-docker/compose.yaml exec postgres \
  psql --username acme --dbname acme \
  --command "UPDATE auth.\"user\" SET role = 'admin' WHERE email = 'you@example.test'"
```

### Channels

Connecting a channel needs `ACME_TOKEN_KEYS`, the keys that encrypt the
accounts' tokens. Without it the server starts, and connecting answers "This
server is not set up to connect accounts of this platform". Keep the same keys
from one run to the next: tokens encrypted with a key you drop can no longer
be read, and their channels must be reconnected.

- **Mastodon** works with any instance on the public internet, over HTTPS. The
  server registers itself on each instance the first time a member connects
  an account there. A local server needs no public address for it: the
  instance sends your browser back to
  `http://localhost:3001/connect/mastodon/callback`, and never calls Acme
  itself.
- **Bluesky**, without `BLUESKY_CLIENT_KEYS`, runs the AT Protocol's
  development (loopback) client, whose sessions last two weeks. That client
  sends the browser back to `http://127.0.0.1:3001/connect/bluesky/callback`
  rather than `localhost`, so a connection started on `localhost` cannot
  finish there, and `next dev` does not hydrate pages on `127.0.0.1`. The
  confidential client needs `PUBLIC_URL` on HTTPS without a port, and keys
  from `bun nx run acme-server:bluesky-key`.

The server refreshes tokens due for it every 10 minutes and, daily at 08:00
UTC, tells a workspace's owners and admins about accounts that must be
reconnected, in the app and by email.

### Publish a first post

Posts really go out, so use an account you can post test messages from.

1. On the workspace's **Channels**, connect a Mastodon account.
2. In **Media library**, upload an image, and describe it for people who
   cannot see it.
3. In **New post**, tick the channel, write the text, then **Choose from the
   library** to attach the image; its description becomes its alt text.
4. Under **When**, pick a time a few minutes ahead, then **Schedule**. The
   post appears on the **Calendar**.
5. Keep the server running: at that time it publishes the post. Reload the
   post's page, which then shows **Published** for the channel. The bell in
   the header counts a new notification within 30 seconds, and
   <http://localhost:3001/app/notices> lists it.

Emails about posts that failed, or may have gone out unconfirmed, land in
Mailpit. A published post is not emailed until you turn it on in the
notifications' **Email preferences**.

### Writing assistant

The composer's **Assistant** menu appears once the server has a language
model. Give it one before starting it:

```sh
# Anthropic's API, with claude-opus-5-5 unless ACME_AI_MODEL names another
export ACME_AI_PROVIDER=anthropic ACME_AI_API_KEY=<your key>
# or any OpenAI-compatible server, such as one on this machine
export ACME_AI_PROVIDER=openai-compatible \
  ACME_AI_BASE_URL=http://127.0.0.1:8000/v1 ACME_AI_MODEL=<its model>
```

Each workspace may send it 100 requests per UTC day
(`ACME_AI_DAILY_REQUESTS`). The text you ask about goes to that provider;
Acme never logs it, nor the suggestion. The server calls the provider
directly, so a model server on this machine or your network works.

### Telemetry

To send the server's telemetry to the stack, and see it in Grafana:

```sh
OTEL_EXPORTER_OTLP_ENDPOINT=http://127.0.0.1:14318 bun nx run acme-server:dev
```

### Database

```sh
bun nx run acme-server:db:generate   # write a migration from src/*/infrastructure/schema.ts
bun nx run acme-server:db:migrate    # apply pending migrations without starting the server
bun nx run acme-server:auth-schema   # regenerate Better Auth's tables after changing its options
```

Each context keeps its tables in a Postgres schema of its own (`assistant`,
`auth`, `channels`, `media`, `notifications`, `publishing`); the job runner's
`cluster_*` tables are in `public`. The server keeps finished jobs for 30 days
(`ACME_CLUSTER_RETENTION` changes it), and names itself among the job runners
with `HOSTNAME`.

### Command line

```sh
bun nx run acme-cli:run -- health   # from source, against http://localhost:3000
bun nx run acme-cli:run -- login    # sign in: approve the code at http://localhost:3001/device
bun nx run acme-cli:run -- whoami   # who you are signed in as, and your workspaces
bun nx run acme-cli:run -- mcp      # how to connect an MCP client
bun nx run acme-cli:run -- logout
bun nx run acme-cli:build           # compile packages/acme-cli/dist/acme
packages/acme-cli/dist/acme --help
```

`--api-url`, then `ACME_API_URL`, sets the server's URL. `acme health` exits
with 0 when the API answers, and with 1 when it is unreachable (5-second
timeout) or answers with an error. `acme login` saves the sign-in in
`credentials.json`, which only you may read, in `ACME_CONFIG_DIR`, else
`$XDG_CONFIG_HOME/acme`, `%APPDATA%\acme` or `~/.config/acme`.

### MCP clients

The server answers MCP clients at `/api/mcp` on the web app's origin:
`http://localhost:3001/api/mcp` in development. Most MCP clients register
themselves before they sign in, which the server allows only with
`MCP_DYNAMIC_REGISTRATION=true`. The client then opens a browser, where you
sign in, pick the workspace it may use, and allow it.

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

## Settings

The docs' [environment variables](packages/acme-docs/docs/environment-variables.mdx)
page lists every variable the server, the web app and the command line read.
In development, these are the ones you may want:

| Variable                      | Default                          | What it does                                                   |
| ----------------------------- | -------------------------------- | -------------------------------------------------------------- |
| `DATABASE_URL`                | none: required                   | The Postgres database                                          |
| `ACME_TOKEN_KEYS`             | unset: channels cannot connect   | `keyId:base64key` entries that encrypt channel tokens          |
| `BLUESKY_CLIENT_KEYS`         | unset: the loopback client       | Keys of the confidential Bluesky client                        |
| `ACME_AI_PROVIDER`            | unset: no writing assistant      | `anthropic` or `openai-compatible`                             |
| `ACME_AI_API_KEY`             | unset                            | The provider's key: required for Anthropic                     |
| `ACME_AI_BASE_URL`            | Anthropic's API                  | The API's base URL: required for an OpenAI-compatible server   |
| `ACME_AI_MODEL`               | `claude-opus-5-5` with Anthropic | The model: required for an OpenAI-compatible server            |
| `ACME_AI_DAILY_REQUESTS`      | `100`                            | Assistant requests each workspace may send per UTC day         |
| `MCP_DYNAMIC_REGISTRATION`    | `false`                          | Lets MCP clients register themselves                           |
| `PUBLIC_URL`                  | `http://localhost:3001`          | The origin people open Acme at                                 |
| `TRUSTED_ORIGINS`             | none                             | More origins allowed to send signed-in requests and uploads    |
| `ACME_API_URL`                | `http://localhost:3000`          | Where the web app and the command line reach the server        |
| `ACME_S3_KEY_PREFIX`          | none                             | A folder for this checkout's media in a shared bucket (`dev/`) |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | unset                            | Exports logs, metrics and traces                               |

## Verify

With the development stack up:

```sh
export DATABASE_URL=postgres://acme:acme@127.0.0.1:15432/acme
bun run check       # generated types, then oxlint and oxfmt
bun run typecheck
bun run test        # the server's tests write to DATABASE_URL
bun run build
```

The server's tests also read the emails they send from Mailpit, and store
media in SeaweedFS under `tests/media/`. `SMTP_URL` and `MAILPIT_URL`, and the
`ACME_S3_*` variables, point them elsewhere. Run the tests on a database of
their own when a dev server uses the stack's: it would run the jobs they leave
behind.

### End-to-end tests

`packages/acme-e2e` drives a new member's first steps in Chromium: signing
up through the emailed link, creating a workspace, writing a draft,
scheduling it on a synthetic channel, finding it on the calendar and
cancelling it, then switching to French and signing out. Each run builds
the web app, starts the server and the web app's production build on free
ports, and writes to the database you give it, so give it one of its own:

```sh
docker compose --file packages/acme-docker/compose.yaml exec postgres \
  psql --username acme --dbname acme --command "CREATE DATABASE acme_e2e"
DATABASE_URL=postgres://acme:acme@127.0.0.1:15432/acme_e2e bun nx run acme-e2e:e2e
```

It takes a few seconds once the web app is built. It reads emails from the
stack's Mailpit and points the media store at its SeaweedFS, under `e2e/`
(`MAILPIT_URL`, `SMTP_URL` and `ACME_S3_*` change them). If Chromium is
missing, install it with
`packages/acme-e2e/node_modules/.bin/e2e-web install chromium`. The report,
and a trace and screenshots of each failed test, are in
`packages/acme-e2e/.e2e/`, with the server's and the web app's output in
`.e2e/logs/app.log`. CI runs the same tests in its `e2e` job, after the other
checks pass.

## Build for production

`bun run build` writes `packages/acme-cli/dist/acme`, `packages/acme-docs/dist`,
`packages/acme-site/dist` and the web app's standalone server.

To run the web app, copy `packages/acme-web/.next/static` to
`packages/acme-web/.next/standalone/packages/acme-web/.next/static`, then, from
`packages/acme-web/.next/standalone`:

```sh
PORT=3001 ACME_API_URL=http://localhost:3000 node packages/acme-web/server.js
```

It listens on `HOSTNAME`, `0.0.0.0` by default. In a container, where Docker
sets `HOSTNAME` to the container id, set `HOSTNAME=0.0.0.0`.

The server image runs the sources with Bun as an unprivileged user, ships the
C++ runtime sharp needs and a static ffprobe (9.0.2) in `/usr/local/bin`, and
reads `PORT` (default 3000) and plain environment variables. It runs in
production mode, which has no defaults for its public address, secret, mail,
client-address header or media store. To build it and run it against the
development stack, with 75 seconds to stop (`--stop-timeout`) so calls to the
platforms in flight can answer:

```sh
bun nx run acme-docker:build-server-image   # tags acme-server:local
docker run --rm --network acme_default -p 127.0.0.1:3000:3000 --stop-timeout 75 \
  -e DATABASE_URL=postgres://acme:acme@postgres:5432/acme \
  -e PUBLIC_URL=http://localhost:3001 \
  -e BETTER_AUTH_SECRET="$(openssl rand -base64 32)" \
  -e MAIL_FROM="Acme <noreply@acme.localhost>" \
  -e SMTP_URL=smtp://mailpit:1025 \
  -e AUTH_IP_HEADERS=x-forwarded-for \
  -e ACME_S3_ENDPOINT=http://seaweedfs:8333 \
  -e ACME_S3_BUCKET=acme-media \
  -e ACME_S3_ACCESS_KEY_ID=acme \
  -e ACME_S3_SECRET_ACCESS_KEY=acme-development-secret \
  -e ACME_S3_FORCE_PATH_STYLE=true \
  -e OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318 \
  acme-server:local
```

`AUTH_IP_HEADERS` names the header sign-in rate limits read the client's
address from. Behind a real edge, name the one it sets and overwrites, such
as `cf-connecting-ip` behind Cloudflare. Add `ACME_TOKEN_KEYS` to connect
channels.

## Layout

| Package                                   | What it is                                                                     |
| ----------------------------------------- | ------------------------------------------------------------------------------ |
| [`acme-contract`](packages/acme-contract) | The HTTP API definition shared by the server and its clients                   |
| [`acme-server`](packages/acme-server)     | The Effect server: the API, Better Auth, the MCP endpoint and the job runner   |
| [`acme-ui`](packages/acme-ui)             | The design system: shadcn/ui and the Tailwind CSS v4 theme, shipped as sources |
| [`acme-web`](packages/acme-web)           | The web app (Next.js)                                                          |
| [`acme-cli`](packages/acme-cli)           | The `acme` command line, a client of the API                                   |
| [`acme-docker`](packages/acme-docker)     | The development stack and the server's production image                        |
| [`acme-docs`](packages/acme-docs)         | The documentation site (Blume), with the API reference from the contract       |
| [`acme-site`](packages/acme-site)         | The marketing site (Astro), with the privacy, terms and data deletion pages    |
| [`acme-e2e`](packages/acme-e2e)           | End-to-end browser tests, run against the server and the web app's build       |

How the code is organised, and the rules it follows, are in
[AGENTS.md](AGENTS.md).
