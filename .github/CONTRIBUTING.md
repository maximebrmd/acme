# Contributing to Peal

Thank you for helping. Peal is built in the open, and bug reports, platform
quirks, docs fixes and code are all welcome. This guide says how to propose a
change, the rules every change follows, and how to run Peal from source.

## Contents

- [Before you start](#before-you-start)
- [Ground rules](#ground-rules)
- [Pull requests](#pull-requests)
- [Licence of contributions](#licence-of-contributions)
- [Architecture](#architecture)
- [Working with AI agents](#working-with-ai-agents)
- [Set up](#set-up) and the [development stack](#development-stack)
- [Develop](#develop): accounts, channels, posts, analytics, the assistant,
  billing, telemetry, the database, the command line, MCP, the docs and site
- [Settings](#settings)
- [Verify](#verify): checks, SDKs, end-to-end tests
- [Build for production](#build-for-production) and [deploy](#deploy)

## Before you start

- **Feedback, help and questions** go to the
  [issues](https://github.com/peal-social/peal/issues/new/choose): pick the
  form that fits, **Self-hosting help** for running Peal yourself.
- **Security issues** go to [security@peal.social](mailto:security@peal.social),
  never to a public issue: see [SECURITY.md](../SECURITY.md).
- **Bugs and ideas** start as an
  [issue](https://github.com/peal-social/peal/issues/new/choose). Search the
  open ones first, and add what you know to an existing one rather than open a
  second.
- **Small fixes** (a typo, a broken link, a clear bug with a test) can go
  straight to a pull request.
- **Larger changes** (a new platform, a new API operation, a change to the
  data model or to how posts are published) start with an issue, so we agree on
  the shape before you spend time on the code. Issues labelled
  [`good first issue`](https://github.com/peal-social/peal/labels/good%20first%20issue)
  and [`help wanted`](https://github.com/peal-social/peal/labels/help%20wanted)
  are ready to pick up: say so in the issue, so nobody else starts the same.

## Ground rules

[AGENTS.md](../AGENTS.md) holds the rules that apply everywhere, and each
package's and server context's `AGENTS.md` its own: read the guide of the code
you change before you change it. The ones contributors meet first:

- **Everything committed is public.** Use synthetic data in tests and
  fixtures. No secrets, tokens, real accounts or customer content in code,
  logs, screenshots or test artifacts.
- **Synthetic credentials never look real.** Write `sk_test_synthetic_…`,
  not a prefix followed by as many characters as a real key has: GitHub's push
  protection refuses a branch for one such value, even after it is removed,
  and CI scans every commit for secrets with Betterleaks
  (`.betterleaks.toml`): a value that says `synthetic` passes.
- **No other products by name.** Do not name a competitor or another product
  in code, comments, docs, commits, pull requests or issues. Describe the
  behaviour instead.
- **The contract and the SDKs change together.** A change to
  `packages/peal-contract` regenerates the SDKs in the same pull request
  ([SDKs](#sdks)), and the API stays compatible with the last release
  (`bun run test` checks it).
- **The docs change with the code.** Docs pages exist in English and French
  (`packages/peal-docs/docs/` and `docs/fr/`): update both. Every setting a
  package reads is listed on the environment variables page, in both
  languages.
- **Dependencies are pinned** to the exact latest release, and `bun.lock` (or
  `packages/peal-infra/ansible/uv.lock`) is committed with them.
- **Lint findings are fixed, not suppressed.** `bun run fix` applies what it
  can.
- **Tests come with the change.** A fix has a test that failed before it; a
  feature has tests for what it promises.

## Pull requests

1. Fork the repository and branch from `main`.
2. Make the change, with its tests and docs.
3. Run the checks CI runs ([Verify](#verify)): `bun run check`,
   `bun run typecheck`, `bun run test` and `bun run build`, and
   `nx run peal-e2e:e2e` when the change touches the pages the end-to-end tests
   visit.
4. Open the pull request against `main` from the template. Say what it
   changes and why, link the issue it closes (`Closes #123`), show what
   changed on screen, in both languages when the text changed, and keep the
   [legal notice](#licence-of-contributions).

Titles follow [Conventional Commits](https://www.conventionalcommits.org):
`feat:`, `fix:`, `docs:`, `test:`, `style:`, `refactor:`, `chore:`, with a
scope where it helps (`fix(sdk): …`, `test(infra): …`) and a `!` for a
breaking change (`feat(sdk)!: …`). Write the title as what the change does,
in plain words: "fix: keep a post's time zone when it moves on the calendar".
Pull requests are squash-merged, so the title becomes the commit on `main`.

A maintainer reviews each pull request, as
[CODEOWNERS](CODEOWNERS) says. CI must pass, including the `sdks` job when the
contract changed, before it merges.

## Licence of contributions

Peal is under the [Functional Source License](../LICENSE.md)
(FSL-1.1-ALv2), and the contract, the SDKs and the agent skill under
Apache-2.0 ([Licensing](../README.md#licensing)). Peal, the licensor, has to
be able to ship your contribution under those licences, to turn each release
into Apache-2.0 two years after it ships, and to change the terms of future
releases. There is no contributor licence agreement to sign: instead, each
pull request carries a short legal notice, from the
[pull request template](PULL_REQUEST_TEMPLATE.md):

> I retain all rights, title and interest in and to my contributions, and by
> keeping this boilerplate intact I confirm that Peal can use, modify, copy,
> and redistribute my contributions, under Peal's choice of terms.

Keep it in the pull request's description. You keep the copyright of what you
wrote; Peal gets the right to distribute it. A pull request without it is not
merged. Maintainers may delete it from their own pull requests.

## Architecture

An [Nx](https://nx.dev) monorepo on Bun, written in TypeScript with
[Effect](https://effect.website). One contract defines the HTTP API: the
server implements it, and the web app, the command line, the MCP tools and the
SDKs derive their clients from it.

| Package                                      | What it is                                                                   |
| -------------------------------------------- | ---------------------------------------------------------------------------- |
| [`peal-contract`](../packages/peal-contract) | The HTTP API definition (Effect `HttpApi`), shared by the server and clients |
| [`peal-server`](../packages/peal-server)     | The Effect server on Bun: bounded contexts, Better Auth, MCP, durable jobs   |
| [`peal-web`](../packages/peal-web)           | The web app: Next.js App Router, next-intl, Tiptap                           |
| [`peal-ui`](../packages/peal-ui)             | The design system: shadcn/ui on Base UI and Tailwind CSS v4, as sources      |
| [`peal-cli`](../packages/peal-cli)           | The `peal` command line, signing in with OAuth                               |
| [`peal-sdk`](../packages/peal-sdk)           | The API's clients in eight languages, generated from the contract            |
| [`peal-docs`](../packages/peal-docs)         | The documentation, with the API reference from the contract's OpenAPI        |
| [`peal-site`](../packages/peal-site)         | The marketing site (Astro), with the legal pages                             |
| [`peal-docker`](../packages/peal-docker)     | The development, production and self-hosting stacks, and the images          |
| [`peal-e2e`](../packages/peal-e2e)           | End-to-end browser tests against the server and the web app's build          |
| [`peal-infra`](../packages/peal-infra)       | Peal's own infrastructure: Pulumi for Cloudflare, Ansible for its servers    |

The data lives in Postgres, one schema per bounded context, with Drizzle;
media in any S3 API; and logs, metrics and traces go out over OpenTelemetry.
How the code is organised, and the rules it follows, are in
[AGENTS.md](../AGENTS.md) and each package's own guide.

## Working with AI agents

The repository is set up for coding agents: `AGENTS.md` files hold the rules,
with a `CLAUDE.md` beside each that includes it. `bun run references` clones
the sources of the fast-moving frameworks Peal uses (Effect, Drizzle, Better
Auth and others) into `.local/references/` at the installed versions: read
them, not memory, before using an API. You are responsible for every line you
send, whoever wrote it: review it, run the checks, and say in the pull request
when an agent wrote a large part of it.

## Set up

You need Git, Bun (the version in [`.bun-version`](../.bun-version)), Node 26.13
or later, Docker (Engine 28 or later with Compose 2.35 or later), and [uv](https://docs.astral.sh/uv/), which installs
the Ansible toolchain that `bun run test` checks `packages/peal-infra/ansible` with.

```sh
bun install --frozen-lockfile
bun run references                  # clone framework sources into .local/references
bun nx run peal-docker:up           # start the development stack, wait until healthy
bun nx run peal-server:media-cors   # let browsers upload to the stack's bucket
```

`bun install` also patches the workspace's TypeScript with Effect's language
service (`effect-tsgo patch`), which reports mistakes in Effect code, such as
an Effect that is never run, as type errors. To see them in your editor, use
the workspace's TypeScript 7 rather than the editor's own. In VS Code or
Cursor, install the TypeScript 7 extension and pick **Use Workspace Version**
from the TypeScript version in the status bar, or put in your
`.vscode/settings.json` (which Git ignores) what `bunx effect-tsgo setup
--vscode` proposes: `"js/ts.experimental.useTsgo": true` and
`"js/ts.tsdk.path": "./node_modules/typescript/bin"`.

`media-cors` puts a CORS rule on the bucket for the web app's origin,
`http://localhost:3001`, and any origins in `TRUSTED_ORIGINS`, and keeps the
bucket's other rules. Run it once per bucket; running it again changes
nothing.

## Development stack

| Service                        | Address                                               | Credentials                                                       |
| ------------------------------ | ----------------------------------------------------- | ----------------------------------------------------------------- |
| Postgres 18                    | `postgres://peal:peal@127.0.0.1:15432/peal`           | user, password and database `peal`                                |
| S3 API (SeaweedFS)             | <http://127.0.0.1:18333>                              | key `peal`, secret `peal-development-secret`, bucket `peal-media` |
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
`packages/peal-docker/.env.example` to `packages/peal-docker/.env`; to run a
second stack beside the first, also set `COMPOSE_PROJECT_NAME`.

```sh
bun nx run peal-docker:logs               # follow the logs
bun nx run peal-docker:down               # stop
bun nx run peal-docker:down -- --volumes  # stop and delete the data
```

The apps you run from source listen on these ports:

| App               | Address                 | Command                      |
| ----------------- | ----------------------- | ---------------------------- |
| Server (API, MCP) | <http://localhost:3000> | `bun nx run peal-server:dev` |
| Web app           | <http://localhost:3001> | `bun nx run peal-web:dev`    |
| Marketing site    | <http://localhost:4321> | `bun nx run peal-site:dev`   |
| Docs              | <http://localhost:4322> | `bun nx run peal-docs:dev`   |

## Develop

Point the server at the stack's Postgres, give it a key for channel tokens,
then run the API and the web app side by side:

```sh
export DATABASE_URL=postgres://peal:peal@127.0.0.1:15432/peal
export PEAL_TOKEN_KEYS="dev:$(openssl rand -base64 32)"   # needed to connect channels
bun nx run peal-server:dev   # http://localhost:3000
bun nx run peal-web:dev      # http://localhost:3001, French under /fr
```

Outside production the server needs nothing else: it sends email to Mailpit,
stores media in SeaweedFS, and takes `http://localhost:3001` as its public
address (`PUBLIC_URL`), which links in emails and the platforms' redirects
point to. It applies pending database migrations when it starts, then listens
on port 3000 (`PORT` changes it). It answers `GET /api/health` (liveness) and
`GET /api/ready` (readiness: 503 while the database is unreachable), and
serves its OpenAPI document at `/openapi.json`.

The web app forwards `/api/*` and the OAuth discovery documents
(`/.well-known/oauth-*`) to `PEAL_API_URL` (default `http://localhost:3000`),
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
docker compose --file packages/peal-docker/compose.yaml exec postgres \
  psql --username peal --dbname peal \
  --command "UPDATE auth.\"user\" SET role = 'admin' WHERE email = 'you@example.test'"
```

The staff console is then at <http://localhost:3001/admin>: the system's
health, accounts, workspaces and the audit log of what staff did. Anyone
else gets the not-found page there.

### Channels

Connecting a channel needs `PEAL_TOKEN_KEYS`, the keys that encrypt the
accounts' tokens. Without it the server starts, and connecting answers "This
server is not set up to connect accounts of this platform". Keep the same keys
from one run to the next: tokens encrypted with a key you drop can no longer
be read, and their channels must be reconnected.

- **Mastodon** works with any instance on the public internet, over HTTPS. The
  server registers itself on each instance the first time a member connects
  an account there. A local server needs no public address for it: the
  instance sends your browser back to
  `http://localhost:3001/connect/mastodon/callback`, and never calls Peal
  itself.
- **Bluesky**, without `BLUESKY_CLIENT_KEYS`, runs the AT Protocol's
  development (loopback) client, whose sessions last two weeks. That client
  sends the browser back to `http://127.0.0.1:3001/connect/bluesky/callback`
  rather than `localhost`, so a connection started on `localhost` cannot
  finish there, and `next dev` does not hydrate pages on `127.0.0.1`. The
  confidential client needs `PUBLIC_URL` on HTTPS without a port, and keys
  from `bun nx run peal-server:bluesky-key`.
- **LinkedIn** and **X** need an app you register on each platform, whose
  redirect is `PUBLIC_URL/connect/<platform>/callback`: set
  `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET`, `X_CLIENT_ID` and
  `X_CLIENT_SECRET`. The docs' self-hosting page says how. Until then,
  **Channels** does not offer them. X refuses `localhost` in redirects: try it
  with `PUBLIC_URL` on `http://127.0.0.1:3001` and the web app's production
  build, or through an HTTPS tunnel. LinkedIn members reconnect every 60 days.
- **Threads**, **Instagram** and **Facebook Pages** need an app in Meta's
  developer dashboard, in development mode with you in its roles, and its ids
  and secrets in `META_APP_ID`, `META_APP_SECRET`, `INSTAGRAM_APP_ID`,
  `INSTAGRAM_APP_SECRET`, `THREADS_APP_ID` and `THREADS_APP_SECRET`; the
  docs' self-hosting page lists its permissions and addresses. Instagram
  connects with Instagram Login (`INSTAGRAM_APP_*`, no Facebook Page
  needed) and through a Facebook Page (`META_APP_*`). Facebook, and
  Instagram through a Page, come back with the accounts the sign-in
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
- **Pinterest** needs an app registered on Pinterest's developer site, in
  `PINTEREST_APP_ID` and `PINTEREST_APP_SECRET`, whose redirect is exactly
  `PUBLIC_URL/connect/pinterest/callback`. Until Pinterest grants the app
  Standard access, set `PINTEREST_SANDBOX=true`: Pins then go to Pinterest's
  Sandbox, where only their creator sees them, and which takes no video.

- **Google Business Profile** needs an OAuth client of the web application
  type in a Google Cloud project that Google gave access to the Business
  Profile APIs (ask with Google's API contact form: until then the project's
  quota is 0), whose redirect is
  `PUBLIC_URL/connect/googleBusiness/callback`, in
  `GOOGLE_BUSINESS_CLIENT_ID` and `GOOGLE_BUSINESS_CLIENT_SECRET`. Members
  connect the verified locations they manage, one channel each.

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
posts only: reconnect them to let Peal read the others.

### Writing assistant

The composer's **Assistant** menu appears once the server has a language
model. Give it one before starting it:

```sh
# Anthropic's API, with claude-opus-5-5 unless PEAL_AI_MODEL names another
export PEAL_AI_PROVIDER=anthropic PEAL_AI_API_KEY=<your key>
# or any OpenAI-compatible server, such as one on this machine
export PEAL_AI_PROVIDER=openai-compatible \
  PEAL_AI_BASE_URL=http://127.0.0.1:8000/v1 PEAL_AI_MODEL=<its model>
```

Each workspace may send it 100 requests per UTC day
(`PEAL_AI_DAILY_REQUESTS`). The text you ask about goes to that provider;
Peal never logs it, nor the suggestion. The server calls the provider
directly, so a model server on this machine or your network works.

Images ("Generate an image" in the media library and the composer's
picker, `peal media generate`, MCP's `generate_image`) need an image model
of their own, on any OpenAI-compatible server that serves
`/images/generations`:

```sh
export PEAL_AI_IMAGE_PROVIDER=openai-compatible \
  PEAL_AI_IMAGE_BASE_URL=http://127.0.0.1:8100/v1 PEAL_AI_IMAGE_MODEL=<its model>
```

An image costs 5 of the day's requests. The tests never call a real
provider: they answer from a loopback fake.

### Billing and captcha

Billing and the captcha are off until the server has their keys. To try
billing, use a Stripe account in test mode, with a monthly and a yearly
EUR price for each paid plan, tax-exclusive, whose lookup keys are
`peal_<plan>_monthly` and `peal_<plan>_yearly` (`peal_starter_monthly`,
`peal_pro_yearly`…), and forward its webhooks with the Stripe CLI:

```sh
stripe listen --forward-to localhost:3001/api/auth/stripe/webhook   # prints the signing secret
export STRIPE_SECRET_KEY=sk_test_... STRIPE_WEBHOOK_SECRET=whsec_...
```

On each workspace's **Billing** page, linked from its card, owners and
admins then tick the box asking to start at once, order a plan or start
the trial through Stripe's checkout, cancel, or withdraw within 14 days,
and manage the subscription in its customer portal. Every workspace starts
on the free plan: 3 channels, 2 members, 30 posts a month, 3 assistant
requests a day and 500 MB of media; the docs' **Plans and billing** page
lists the others.

For the captcha, Cloudflare's test keys pass every check without a real
widget: `TURNSTILE_SITE_KEY=1x00000000000000000000AA` and
`TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA`.

### Telemetry

To send the server's telemetry to the stack, and see it in Grafana:

```sh
OTEL_EXPORTER_OTLP_ENDPOINT=http://127.0.0.1:14318 bun nx run peal-server:dev
```

### Database

```sh
bun nx run peal-server:db:generate   # write a migration from src/*/infrastructure/schema.ts
bun nx run peal-server:db:migrate    # apply pending migrations without starting the server
bun nx run peal-server:auth-schema   # regenerate Better Auth's tables after changing its options
```

Each context keeps its tables in a Postgres schema of its own (`analytics`,
`assistant`, `auth`, `billing`, `channels`, `media`, `notifications`,
`publishing`, `staff`, and `legal`, what the law has a host keep); the job
runner's `cluster_*` tables are in `public`. The server
keeps finished jobs for 30 days (`PEAL_CLUSTER_RETENTION` changes it), and
names itself among the job runners with `HOSTNAME`.

### Command line

```sh
bun nx run peal-cli:run -- health   # from source, against http://localhost:3000
bun nx run peal-cli:run -- login    # sign in: approve the code at http://localhost:3001/device
bun nx run peal-cli:run -- whoami   # who you are signed in as, and your workspaces
bun nx run peal-cli:run -- doctor   # what a run would use: server, credential, workspace
bun nx run peal-cli:run -- mcp      # how to connect an MCP client
bun nx run peal-cli:run -- drafts list --workspace <slug>   # or set PEAL_WORKSPACE
bun nx run peal-cli:run -- account export                   # your data, in a file only you may read
bun nx run peal-cli:run -- logout
bun nx run peal-cli:build           # compile packages/peal-cli/dist/peal
packages/peal-cli/dist/peal --help
```

`--api-url`, then `PEAL_API_URL`, sets the server's URL. `peal health` exits
with 0 when the API answers, and with 1 when it is unreachable (5-second
timeout) or answers with an error. `peal login` saves the sign-in in
`credentials.json`, which only you may read, in `PEAL_CONFIG_DIR`, else
`$XDG_CONFIG_HOME/peal`, `%APPDATA%\peal` or `~/.config/peal`. `peal --help`
lists the commands that act in a workspace (`channels`, `drafts`, `post`,
`posts`, `media`, `analytics`, `billing`, `activity`, `members`,
`invitations`, `webhooks`) and on your account (`account`). For a run nobody
attends, set `PEAL_API_KEY` to a workspace API key and name the workspace by
its id; `--json` prints answers, and failures, as JSON.

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
bun nx run peal-docs:dev   # http://localhost:4322
bun nx run peal-site:dev   # http://localhost:4321
```

Both build without configuration. Optional build-time variables, read from the
environment:

- `DOCS_SITE_URL` and `SITE_URL`: the public origins, for absolute and
  canonical links.
- `SITE_DOCS_URL`: links the marketing site to the docs.
- `SITE_APP_URL`: links the marketing site to the web app's pages to
  cancel a contract and to withdraw from one.
- `DOCS_PLAUSIBLE_DOMAIN` and `SITE_PLAUSIBLE_DOMAIN`: turn on Plausible.
- `DOCS_PLAUSIBLE_HOST` and `SITE_PLAUSIBLE_HOST`: point Plausible at a
  self-hosted instance.

## Settings

The docs' [environment variables](../packages/peal-docs/docs/environment-variables.mdx)
page lists every variable the server, the web app and the command line read.
In development, these are the ones you may want:

| Variable                      | Default                          | What it does                                                           |
| ----------------------------- | -------------------------------- | ---------------------------------------------------------------------- |
| `DATABASE_URL`                | none: required                   | The Postgres database                                                  |
| `PEAL_TOKEN_KEYS`             | unset: channels cannot connect   | `keyId:base64key` entries that encrypt channel tokens                  |
| `BLUESKY_CLIENT_KEYS`         | unset: the loopback client       | Keys of the confidential Bluesky client                                |
| `LINKEDIN_CLIENT_ID`          | unset: LinkedIn is not offered   | The LinkedIn app's client id, with `LINKEDIN_CLIENT_SECRET`            |
| `LINKEDIN_PAGES_CLIENT_ID`    | unset: no LinkedIn company pages | A second LinkedIn app's client id, with `LINKEDIN_PAGES_CLIENT_SECRET` |
| `X_CLIENT_ID`                 | unset: X is not offered          | The X app's OAuth 2.0 client id, with `X_CLIENT_SECRET`                |
| `META_APP_ID`                 | unset: no Facebook nor Instagram | Meta's app, with `META_APP_SECRET`                                     |
| `INSTAGRAM_APP_ID`            | unset: Instagram through a Page  | The app's Instagram id, with `INSTAGRAM_APP_SECRET`                    |
| `THREADS_APP_ID`              | unset: no Threads                | The app's Threads id, with `THREADS_APP_SECRET`                        |
| `TIKTOK_CLIENT_KEY`           | unset: TikTok is not offered     | The TikTok app's client key, with `TIKTOK_CLIENT_SECRET`               |
| `YOUTUBE_CLIENT_ID`           | unset: YouTube is not offered    | The Google OAuth client's id, with `YOUTUBE_CLIENT_SECRET`             |
| `PINTEREST_APP_ID`            | unset: Pinterest is not offered  | The Pinterest app's id, with `PINTEREST_APP_SECRET`                    |
| `PINTEREST_SANDBOX`           | `false`                          | `true` sends Pinterest's calls to its Sandbox (Trial access)           |
| `GOOGLE_BUSINESS_CLIENT_ID`   | unset: no Business Profile       | Its Google client's id, with `GOOGLE_BUSINESS_CLIENT_SECRET`           |
| `PEAL_AI_PROVIDER`            | unset: no writing assistant      | `anthropic` or `openai-compatible`                                     |
| `PEAL_AI_API_KEY`             | unset                            | The provider's key: required for Anthropic                             |
| `PEAL_AI_BASE_URL`            | Anthropic's API                  | The API's base URL: required for an OpenAI-compatible server           |
| `PEAL_AI_MODEL`               | `claude-opus-5-5` with Anthropic | The model: required for an OpenAI-compatible server                    |
| `PEAL_AI_DAILY_REQUESTS`      | `100`                            | Assistant requests each workspace may send per UTC day                 |
| `PEAL_AI_IMAGE_PROVIDER`      | unset: no images                 | `openai-compatible`: the model the assistant makes images with         |
| `PEAL_AI_IMAGE_BASE_URL`      | unset                            | The image API's base URL: required with a provider                     |
| `PEAL_AI_IMAGE_MODEL`         | unset                            | The image model: required with a provider                              |
| `PEAL_AI_IMAGE_API_KEY`       | unset                            | The image provider's key, if it takes one                              |
| `PEAL_ADS`                    | `off`                            | `read` connects Meta ad accounts, `spend` also boosts posts            |
| `STRIPE_SECRET_KEY`           | unset: no billing, no limits     | Bills workspaces through Stripe, with the variables it needs           |
| `TURNSTILE_SITE_KEY`          | unset: no captcha                | With `TURNSTILE_SECRET_KEY`, Turnstile on sign-up and resets           |
| `MCP_DYNAMIC_REGISTRATION`    | `false`                          | Lets MCP clients register themselves                                   |
| `PUBLIC_URL`                  | `http://localhost:3001`          | The origin people open Peal at                                         |
| `TRUSTED_ORIGINS`             | none                             | More origins allowed to send signed-in requests and uploads            |
| `PEAL_API_URL`                | `http://localhost:3000`          | Where the web app and the command line reach the server                |
| `PEAL_S3_KEY_PREFIX`          | none                             | A folder for this checkout's media in a shared bucket (`dev/`)         |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | unset                            | Exports logs, metrics and traces                                       |

## Verify

With the development stack up:

```sh
export DATABASE_URL=postgres://peal:peal@127.0.0.1:15432/peal
bun run check       # generated types, then oxlint and oxfmt
bun run typecheck
bun run test        # the server's tests write to DATABASE_URL
bun run build
```

The server's tests also read the emails they send from Mailpit, store media
in SeaweedFS under `tests/media/`, and check billing against stripe-mock.
`SMTP_URL` and `MAILPIT_URL`, the `PEAL_S3_*` variables and `STRIPE_MOCK_URL`
point them elsewhere. Run the tests on a database of
their own when a dev server uses the stack's: it would run the jobs they leave
behind.

### SDKs

The SDKs in `packages/peal-sdk` are generated from the contract and
committed. After changing the contract, regenerate them, then build them; both
need Docker, which runs Fern's generators and every toolchain but uv's:

```sh
bun run sdk:generate   # rewrite every SDK from the contract
bun run sdk:build      # build each one as its registry would get it, and load it
bun run sdk:check      # what CI runs: fails when the committed SDKs are stale
bun run sdk:test       # each SDK calls a stand-in API, as its users would
```

### End-to-end tests

`packages/peal-e2e` drives a new member's first steps in Chromium: signing
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
docker compose --file packages/peal-docker/compose.yaml exec postgres \
  psql --username peal --dbname peal --command "CREATE DATABASE peal_e2e"
DATABASE_URL=postgres://peal:peal@127.0.0.1:15432/peal_e2e bun nx run peal-e2e:e2e
```

It takes a few seconds once the web app is built. It reads emails from the
stack's Mailpit and points the media store at its SeaweedFS, under `e2e/`
(`MAILPIT_URL`, `SMTP_URL` and `PEAL_S3_*` change them). If Chromium is
missing, install it with
`packages/peal-e2e/node_modules/.bin/e2e-web install chromium`. The report,
and a trace and screenshots of each failed test, are in
`packages/peal-e2e/.e2e/`, with the server's and the web app's output in
`.e2e/logs/app.log`. CI runs the same tests in its `e2e` job, after the other
checks pass.

## Build for production

`bun run build` writes `packages/peal-cli/dist/peal`, `packages/peal-docs/dist`,
`packages/peal-site/dist` and the web app's standalone server.

To run the web app, copy `packages/peal-web/.next/static` to
`packages/peal-web/.next/standalone/packages/peal-web/.next/static`, then, from
`packages/peal-web/.next/standalone`:

```sh
PORT=3001 PEAL_API_URL=http://localhost:3000 node packages/peal-web/server.js
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
bun nx run peal-docker:build-server-image   # tags peal-server:local
docker run --rm --network peal_default -p 127.0.0.1:3000:3000 --stop-timeout 75 \
  -e DATABASE_URL=postgres://peal:peal@postgres:5432/peal \
  -e PUBLIC_URL=http://localhost:3001 \
  -e BETTER_AUTH_SECRET="$(openssl rand -base64 32)" \
  -e MAIL_FROM="Peal <noreply@peal.localhost>" \
  -e SMTP_URL=smtp://mailpit:1025 \
  -e AUTH_IP_HEADERS=x-forwarded-for \
  -e PEAL_S3_ENDPOINT=http://seaweedfs:8333 \
  -e PEAL_S3_BUCKET=peal-media \
  -e PEAL_S3_ACCESS_KEY_ID=peal \
  -e PEAL_S3_SECRET_ACCESS_KEY=peal-development-secret \
  -e PEAL_S3_FORCE_PATH_STYLE=true \
  -e OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318 \
  peal-server:local
```

`AUTH_IP_HEADERS` names the header sign-in rate limits read the client's
address from. Behind a real edge, name the one it sets and overwrites, such
as `cf-connecting-ip` behind Cloudflare. Add `PEAL_TOKEN_KEYS` to connect
channels.

The other production images build the same way, from the repository root:
`build-web-image` (Next's standalone server on Node, as the `node` user, on
port 3001), `build-static-image` (the marketing site and the docs, served by
nginx on ports 8080 and 8081; pass their build-time variables with
`--build-arg`) and `build-postgres-image` (Postgres 18 with pgBackRest), each
a target of `peal-docker`.

## Deploy

[`compose.production.yaml`](../packages/peal-docker/compose.production.yaml)
runs the whole stack: Postgres with pgBackRest, the server, the web app, the
site and docs (profile `static`), the OpenTelemetry Collector, Loki, Tempo,
Prometheus and Grafana with its alert rules and dashboards. Every port
listens on 127.0.0.1, every service restarts when it stops and runs on a
read-only file system, and the server gets 75 seconds to stop.

### Production, behind Cloudflare

Peal's own servers, production and the sandbox, each run on a server at a
European provider and are reachable only through a Cloudflare Tunnel: no
inbound port, SSH included.
Cloudflare Access guards Grafana, SSH, the admin and the whole sandbox;
Grafana's alerts go to a Telegram chat; Postgres is backed up to R2. A third
server, linked to neither, at another provider and in another city, checks
their public endpoints from outside with
Gatus, alerts when production's Grafana stops sending its heartbeat, and
serves the public status page, [status.peal.social](https://status.peal.social).
Ansible in [`packages/peal-infra/ansible`](../packages/peal-infra/ansible/README.md) sets the
servers up and releases a commit: it builds the images on the machine running
it, uploads them over SSH, and starts the new server, which migrates the
database.

```sh
cd packages/peal-infra/ansible
uv sync --locked
uv run ansible-galaxy collection install --requirements-file requirements.yml
uv run ansible-playbook playbooks/site.yml --limit sandbox --check --diff
uv run ansible-playbook playbooks/release.yml --limit sandbox
uv run ansible-playbook playbooks/uptime.yml --check --diff
```

Nothing has been applied yet: the inventory holds placeholders, and every
playbook stops until they are replaced. Its README says what to set up at
Cloudflare first, and
[`runbooks/restore-database.md`](../packages/peal-infra/ansible/runbooks/restore-database.md)
how to restore the database.

### Self-hosting, behind Caddy

[`compose.self-host.yaml`](../packages/peal-docker/compose.self-host.yaml) puts
Caddy in front of the stack, with a Let's Encrypt certificate for your domain:
it alone listens on ports 80 and 443, and its
[`Caddyfile`](../packages/peal-docker/self-host/Caddyfile) sends `/api/*` and
`/.well-known/oauth-*` to the server and the rest to the web app. Fill in a copy
of [`self-host.env.example`](../packages/peal-docker/self-host.env.example)
outside the repository, then, from `packages/peal-docker`:

```sh
docker compose --project-name peal --file compose.production.yaml \
  --file compose.self-host.yaml --env-file /srv/peal/peal.env build
docker compose --project-name peal --file compose.production.yaml \
  --file compose.self-host.yaml --env-file /srv/peal/peal.env up --detach --wait
```

The docs' self-hosting page explains each setting.
