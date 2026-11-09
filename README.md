# Acme

Schedule social media posts across platforms, from one place. "Acme" is a
working name.

Acme is fair source: you may use, modify and self-host it under the
[Functional Source License](LICENSE.md), and each release becomes Apache-2.0
two years after it ships.

It is not released yet. Today you can:

- create an account and workspaces, and connect Mastodon, Bluesky, LinkedIn,
  X, Threads, Instagram and TikTok accounts, Facebook Pages and YouTube
  channels to them;
- upload images and videos to a workspace's media library;
- write a post, with its own text on some channels and images or videos
  with alt text, keep it with the workspace's drafts or discard it, then
  schedule it, move it on a calendar, take it back to draft or cancel it;
- have it published on those channels at its time, with its media (a
  video uploaded to YouTube with the title and settings it asks for), then
  follow each channel's attempts, post it again where it failed, and say
  whether one Acme could not confirm went out;
- hear how your posts ended, or every post if you choose, and which
  channels need reconnecting, under a bell in the app and by email;
- see how posts did on Mastodon, Bluesky, TikTok and YouTube: their likes,
  reposts, replies and quotes, and a YouTube video's views, read back every
  hour for two days then daily for a month, by
  channel and day, and on each post's page;
- ask a writing assistant to rewrite, shorten or translate a post, or to
  suggest hashtags, when the server has an AI provider;
- manage a workspace's members, invitations and API keys, rename it or
  delete it with everything in it;
- choose your language, see your sessions and connected applications,
  download your data or delete your account;
- bill workspaces through Stripe, with plans that limit channels, members,
  posts a month and assistant requests a day, when the server has a Stripe
  key, and ask for a Cloudflare Turnstile check on sign-up when it has
  Turnstile's keys; without them, nothing is limited or checked;
- sign in from the command line and work in a workspace from it: drafts,
  following up on posts, analytics, billing, members and invitations, and
  a copy of your data; and let MCP clients do the same in one workspace,
  but for your data, which no MCP tool hands out;
- run the server from a staff console at `/admin`: find accounts and
  workspaces, see the system's health, ban, sign out or act as an account,
  each action in an audit log;
- have the web app's errors, in browsers and on its server, logged and
  counted by the server, with a Grafana alert on a spike.

Analytics on LinkedIn, X and Meta's platforms, and the other platforms Acme
knows (Pinterest), are still to come.

## Set up

You need Git, Bun (the version in [`.bun-version`](.bun-version)), Node 26.13
or later, Docker (Engine 28 or later with Compose 2.35 or later, because the
stacks use image mounts), and [uv](https://docs.astral.sh/uv/), which installs
the Ansible toolchain that `bun run test` checks `packages/acme-infra` with.

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
| Stripe API mock (stripe-mock)  | <http://127.0.0.1:12111>                              | any key that starts with `sk_test_`                               |
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
**Drafts**, **Channels**, **Media library** and **Settings**, where you invite
people. Your own settings are under **Account settings** in the account menu.
Password reset and invitation emails land in Mailpit too.

To make an account staff (Better Auth's admin role, which may impersonate
members and ban accounts), set its role in the database, then sign in again:

```sh
docker compose --file packages/acme-docker/compose.yaml exec postgres \
  psql --username acme --dbname acme \
  --command "UPDATE auth.\"user\" SET role = 'admin' WHERE email = 'you@example.test'"
```

The staff console is then at <http://localhost:3001/admin>: the system's
health, accounts, workspaces and the audit log of what staff did. Anyone
else gets the not-found page there.

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
- **LinkedIn** and **X** need an app you register on each platform, whose
  redirect is `PUBLIC_URL/connect/<platform>/callback`: set
  `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET`, `X_CLIENT_ID` and
  `X_CLIENT_SECRET`. The docs' self-hosting page says how. Until then,
  **Channels** does not offer them. X refuses `localhost` in redirects: try it
  with `PUBLIC_URL` on `http://127.0.0.1:3001` and the web app's production
  build, or through an HTTPS tunnel. LinkedIn members reconnect every 60 days.
- **Threads**, **Instagram** and **Facebook Pages** need an app in Meta's
  developer dashboard, in development mode with you in its roles, and its ids
  and secrets in `META_APP_ID`, `META_APP_SECRET`, `THREADS_APP_ID` and
  `THREADS_APP_SECRET`; the docs' self-hosting page lists its permissions and
  addresses. Facebook and Instagram come back with the accounts the sign-in
  reached, to tick. Meta fetches the media it publishes from the store, which
  it cannot reach on this machine: text posts work, media needs a public
  store.
- **TikTok** needs an app on TikTok for Developers with Login Kit, the
  Content Posting API (Direct Post) and the Display API, its key and secret
  in `TIKTOK_CLIENT_KEY` and `TIKTOK_CLIENT_SECRET`, and the redirect
  `PUBLIC_URL/connect/tiktok/callback`, which TikTok takes on HTTPS only: use
  an HTTPS tunnel. Until TikTok audits the app, posts go out only from
  private accounts, visible to their owner only. Videos go up in chunks;
  photos need `TIKTOK_MEDIA_URL_PREFIX`, a public store address verified
  for the app.
- **YouTube** needs an OAuth client of the web application type in a Google
  Cloud project with the YouTube Data API v3 on, whose redirect is
  `PUBLIC_URL/connect/youtube/callback`, in `YOUTUBE_CLIENT_ID` and
  `YOUTUBE_CLIENT_SECRET`; Google takes `http://localhost:3001` there. While
  the project's consent screen is in testing, only its test users sign in,
  and Google ends their access after 7 days: reconnect then.

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
5. Keep the server running: at that time it publishes the post. The post's
   page then shows **Published** for the channel, with its attempts, and
   **Post again** where it failed. The bell in the header counts a new
   notification within 30 seconds, and <http://localhost:3001/app/notices>
   lists it.

Emails about posts that failed, or may have gone out unconfirmed, land in
Mailpit. A published post is not emailed until you turn it on in the
notifications' **Email preferences**.

### Analytics

Keep the server running after a post goes out: every hour, at minute 7, it
reads back the counts of the posts due, and **Analytics** on the workspace's
card shows them, as does the post's page. Mastodon accounts connected before
analytics are read without their token, which shows public and unlisted
posts only: reconnect them to let Acme read the others.

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

### Billing and captcha

Billing and the captcha are off until the server has their keys. To try
billing, use a Stripe account in test mode, with a monthly price for each
paid plan, and forward its webhooks with the Stripe CLI:

```sh
stripe listen --forward-to localhost:3001/api/auth/stripe/webhook   # prints the signing secret
export STRIPE_SECRET_KEY=sk_test_... STRIPE_WEBHOOK_SECRET=whsec_... \
  STRIPE_PRICE_PRO=price_... STRIPE_PRICE_BUSINESS=price_...
```

On each workspace's **Billing** page, linked from its card, owners and
admins then move to a paid plan through Stripe's checkout and manage the
subscription in its customer portal. Every workspace starts on the free
plan: 3 channels, 2 members, 30 posts a month and 10 assistant requests a
day.

For the captcha, Cloudflare's test keys pass every check without a real
widget: `TURNSTILE_SITE_KEY=1x00000000000000000000AA` and
`TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA`.

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

Each context keeps its tables in a Postgres schema of its own (`analytics`,
`assistant`, `auth`, `billing`, `channels`, `media`, `notifications`,
`publishing`, `staff`); the job runner's `cluster_*` tables are in `public`. The server
keeps finished jobs for 30 days (`ACME_CLUSTER_RETENTION` changes it), and
names itself among the job runners with `HOSTNAME`.

### Command line

```sh
bun nx run acme-cli:run -- health   # from source, against http://localhost:3000
bun nx run acme-cli:run -- login    # sign in: approve the code at http://localhost:3001/device
bun nx run acme-cli:run -- whoami   # who you are signed in as, and your workspaces
bun nx run acme-cli:run -- mcp      # how to connect an MCP client
bun nx run acme-cli:run -- drafts list --workspace <slug>   # or set ACME_WORKSPACE
bun nx run acme-cli:run -- account export                   # your data, in a file only you may read
bun nx run acme-cli:run -- logout
bun nx run acme-cli:build           # compile packages/acme-cli/dist/acme
packages/acme-cli/dist/acme --help
```

`--api-url`, then `ACME_API_URL`, sets the server's URL. `acme health` exits
with 0 when the API answers, and with 1 when it is unreachable (5-second
timeout) or answers with an error. `acme login` saves the sign-in in
`credentials.json`, which only you may read, in `ACME_CONFIG_DIR`, else
`$XDG_CONFIG_HOME/acme`, `%APPDATA%\acme` or `~/.config/acme`. `acme --help`
lists the commands that act in a workspace (`channels`, `drafts`, `posts`,
`analytics`, `billing`, `members`, `invitations`) and on your account
(`account`).

### MCP clients

The server answers MCP clients at `/api/mcp` on the web app's origin:
`http://localhost:3001/api/mcp` in development. Most MCP clients register
themselves before they sign in, which the server allows only with
`MCP_DYNAMIC_REGISTRATION=true`. The client then opens a browser, where you
sign in, pick the workspace it may use, and allow it. Its tools read the
workspace, and, when you let it do what your role allows, write drafts,
follow up on posts and invite people; each says what it changes.

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
| `LINKEDIN_CLIENT_ID`          | unset: LinkedIn is not offered   | The LinkedIn app's client id, with `LINKEDIN_CLIENT_SECRET`    |
| `X_CLIENT_ID`                 | unset: X is not offered          | The X app's OAuth 2.0 client id, with `X_CLIENT_SECRET`        |
| `META_APP_ID`                 | unset: no Facebook nor Instagram | Meta's app, with `META_APP_SECRET`                             |
| `THREADS_APP_ID`              | unset: no Threads                | The app's Threads id, with `THREADS_APP_SECRET`                |
| `TIKTOK_CLIENT_KEY`           | unset: TikTok is not offered     | The TikTok app's client key, with `TIKTOK_CLIENT_SECRET`       |
| `YOUTUBE_CLIENT_ID`           | unset: YouTube is not offered    | The Google OAuth client's id, with `YOUTUBE_CLIENT_SECRET`     |
| `ACME_AI_PROVIDER`            | unset: no writing assistant      | `anthropic` or `openai-compatible`                             |
| `ACME_AI_API_KEY`             | unset                            | The provider's key: required for Anthropic                     |
| `ACME_AI_BASE_URL`            | Anthropic's API                  | The API's base URL: required for an OpenAI-compatible server   |
| `ACME_AI_MODEL`               | `claude-opus-5-5` with Anthropic | The model: required for an OpenAI-compatible server            |
| `ACME_AI_DAILY_REQUESTS`      | `100`                            | Assistant requests each workspace may send per UTC day         |
| `STRIPE_SECRET_KEY`           | unset: no billing, no limits     | Bills workspaces through Stripe, with the variables it needs   |
| `TURNSTILE_SITE_KEY`          | unset: no captcha                | With `TURNSTILE_SECRET_KEY`, Turnstile on sign-up and resets   |
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

The server's tests also read the emails they send from Mailpit, store media
in SeaweedFS under `tests/media/`, and check billing against stripe-mock.
`SMTP_URL` and `MAILPIT_URL`, the `ACME_S3_*` variables and `STRIPE_MOCK_URL`
point them elsewhere. Run the tests on a database of
their own when a dev server uses the stack's: it would run the jobs they leave
behind.

### End-to-end tests

`packages/acme-e2e` drives a new member's first steps in Chromium: signing
up through the emailed link, creating a workspace, writing a draft and
finding it on the drafts page, scheduling it on a synthetic channel,
finding it on the calendar, taking it back to draft to edit and schedule
it again, cancelling it, giving a draft on a synthetic YouTube channel the
options YouTube asks for, inviting a second member, switching to French and
keeping it in the account settings, signing out and in again, then the
second member signing up and joining. It also walks the staff console: a
member gets the not-found page, then staff find the member, ban them and
lift the ban, act as them and come back, and read each action in the
audit log. Each run builds
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

The other production images build the same way, from the repository root:
`build-web-image` (Next's standalone server on Node, as the `node` user, on
port 3001), `build-static-image` (the marketing site and the docs, served by
nginx on ports 8080 and 8081; pass their build-time variables with
`--build-arg`) and `build-postgres-image` (Postgres 18 with pgBackRest), each
a target of `acme-docker`.

## Deploy

[`compose.production.yaml`](packages/acme-docker/compose.production.yaml)
runs the whole stack: Postgres with pgBackRest, the server, the web app, the
site and docs (profile `static`), the OpenTelemetry Collector, Loki, Tempo,
Prometheus and Grafana with its alert rules and dashboards. Every port
listens on 127.0.0.1, every service restarts when it stops and runs on a
read-only file system, and the server gets 75 seconds to stop.

### Production, behind Cloudflare

Acme's own servers, production and the sandbox, run on Hetzner Cloud and are
reachable only through a Cloudflare Tunnel: no inbound port, SSH included.
Cloudflare Access guards Grafana, SSH, the admin and the whole sandbox;
Grafana's alerts go to a Telegram chat; Postgres is backed up to R2. A third
server, linked to neither, checks their public endpoints from outside with
Gatus, and alerts when production's Grafana stops sending its heartbeat.
Ansible in [`packages/acme-infra`](packages/acme-infra/README.md) sets the
servers up and releases a commit: it builds the images on the machine running
it, uploads them over SSH, and starts the new server, which migrates the
database.

```sh
cd packages/acme-infra
uv sync --locked
uv run ansible-galaxy collection install --requirements-file requirements.yml
uv run ansible-playbook playbooks/site.yml --limit sandbox --check --diff
uv run ansible-playbook playbooks/release.yml --limit sandbox
uv run ansible-playbook playbooks/uptime.yml --check --diff
```

Nothing has been applied yet: the inventory holds placeholders, and every
playbook stops until they are replaced. Its README says what to set up at
Cloudflare first, and
[`runbooks/restore-database.md`](packages/acme-infra/runbooks/restore-database.md)
how to restore the database.

### Self-hosting, behind Caddy

[`compose.self-host.yaml`](packages/acme-docker/compose.self-host.yaml) puts
Caddy in front of the stack, with a Let's Encrypt certificate for your domain:
it alone listens on ports 80 and 443, and its
[`Caddyfile`](packages/acme-docker/self-host/Caddyfile) sends `/api/*` and
`/.well-known/oauth-*` to the server and the rest to the web app. Fill in a copy
of [`self-host.env.example`](packages/acme-docker/self-host.env.example)
outside the repository, then, from `packages/acme-docker`:

```sh
docker compose --project-name acme --file compose.production.yaml \
  --file compose.self-host.yaml --env-file /srv/acme/acme.env build
docker compose --project-name acme --file compose.production.yaml \
  --file compose.self-host.yaml --env-file /srv/acme/acme.env up --detach --wait
```

The docs' self-hosting page explains each setting.

## Layout

| Package                                   | What it is                                                                     |
| ----------------------------------------- | ------------------------------------------------------------------------------ |
| [`acme-contract`](packages/acme-contract) | The HTTP API definition shared by the server and its clients                   |
| [`acme-server`](packages/acme-server)     | The Effect server: the API, Better Auth, the MCP endpoint and the job runner   |
| [`acme-ui`](packages/acme-ui)             | The design system: shadcn/ui and the Tailwind CSS v4 theme, shipped as sources |
| [`acme-web`](packages/acme-web)           | The web app (Next.js)                                                          |
| [`acme-cli`](packages/acme-cli)           | The `acme` command line, a client of the API                                   |
| [`acme-docker`](packages/acme-docker)     | The development and production stacks, and the production images               |
| [`acme-docs`](packages/acme-docs)         | The documentation site (Blume), with the API reference from the contract       |
| [`acme-site`](packages/acme-site)         | The marketing site (Astro), with the privacy, terms and data deletion pages    |
| [`acme-e2e`](packages/acme-e2e)           | End-to-end browser tests, run against the server and the web app's build       |
| [`acme-infra`](packages/acme-infra)       | Ansible for Acme's servers, behind a Cloudflare Tunnel                         |

How the code is organised, and the rules it follows, are in
[AGENTS.md](AGENTS.md).
