# Acme

Acme is a social media scheduling platform: teams write posts once, schedule
them across platforms, and see how they perform. "Acme" is a working name. The
source is public under the Functional Source License (FSL-1.1-ALv2, in
[`LICENSE.md`](LICENSE.md)): anyone may self-host it, and each release becomes
Apache-2.0 two years after it ships. Call it "fair source", not open source.

Nx projects live directly under `packages/`:

- `acme-contract`: the HTTP API definition, Effect `HttpApi` groups and
  Schemas. The server implements it; the web app, CLI and MCP server derive
  typed clients from it; `nx run acme-contract:openapi` writes `openapi.json`
  for the docs.
- `acme-server`: the Effect server on Bun, with the bounded contexts below,
  the MCP endpoint and the cluster runner.

Planned, in this order: `acme-ui` (shadcn/ui and the Tailwind CSS v4 theme,
shipped as sources), `acme-web` (Next.js with `@effect/atom-react`),
`acme-docker` (images and the development compose stack), `acme-cli`
(`effect/cli`), `acme-docs` (Blume), `acme-site` (the Astro marketing site),
`acme-infra` (Ansible).

Work from the repository root unless a command names another directory.

## Work and verify

- Use the Bun version in [`.bun-version`](.bun-version) and the Node version
  in the [CI workflow](.github/workflows/ci.yml). Install with
  `bun install --frozen-lockfile`.
- For code changes, run `bun run check`, `bun run typecheck` and `bun run test`.
  Fix lint findings without inline suppressions; `bun run fix` applies what it
  can.
- Linters and formatters are as strict as they go: Ultracite's oxlint presets
  (core and anti-slop everywhere, plus the preset for each package's framework)
  with type-aware rules, and oxfmt. Each package has its own
  `oxlint.config.ts`. Parse values with Effect Schema rather than asserting
  types or checking `typeof`.
- Pin every dependency to the exact latest release, and commit `bun.lock` with
  dependency changes.
- Define Nx target defaults in [`nx.json`](nx.json) and package targets in
  `project.json`. Declare build dependencies and cache outputs there. Keep
  tests uncached.

## Read the sources, not memory

Effect 4, Drizzle 1.0, Better Auth, Tiptap, Blume and Astro move faster than
any training data. `bun run references` clones each one's source, at the
version this workspace installs, into `.local/references/<name>` (ignored by
Git, Nx and the linters). Read the code, tests and docs there before using an
API, and rerun the command after an upgrade. Effect also ships agent docs in
`.local/references/effect/packages/effect/ai-docs`, and Next.js ships its docs
in `node_modules/next/dist/docs`.

## Server architecture

The server follows DDD and Clean Architecture. Each bounded context in
`packages/acme-server/src/` has four layers, plus a `container.ts` that wires
them:

| Context         | Holds                                          |
| --------------- | ---------------------------------------------- |
| `publishing`    | posts, schedules, publication attempts         |
| `channels`      | connected accounts, credentials, token refresh |
| `media`         | uploads, storage, processing                   |
| `workspace`     | organisations, members, roles                  |
| `analytics`     | per-platform metrics                           |
| `billing`       | plans, subscriptions, entitlements             |
| `notifications` | in-app and email notices                       |
| `shared`        | the kernel the others build on                 |

- `domain`: entities and rules on Effect's core (`effect`: Schema, DateTime,
  Data). No HTTP, SQL, cluster, workflow, AI, Drizzle or Better Auth.
- `application`: use cases and the ports they need, as `Context.Service`.
  Imports its context's domain and the shared kernel.
- `infrastructure`: adapters behind the ports: Drizzle repositories, Better
  Auth, platform clients, workflows and activities, storage, mail.
- `api`: `HttpApiBuilder` handlers for `acme-contract` groups. They get use
  cases from the context's `container.ts`, never from infrastructure.

`src/app/` is the composition root and `src/main.ts` the entry point.

- Folders import each other through `#<context>/<layer>/…` (package.json
  `imports`); `../` imports are refused. `packages/acme-server/oxlint.config.ts`
  enforces the layer rules. Never loosen a rule to make an import pass; move
  the code. A new context goes into that file's `contexts` list.
- Contexts talk through ports: an adapter in one context may call another
  context's `application` layer, never its domain or infrastructure.
- Domain and application code never touches `Date`, `crypto`, `process` or
  `Bun`: time comes from `DateTime` and `Clock` (tests use `TestClock`), ids
  and randomness from ports, configuration from `Config`.
- A scheduled instant is stored in UTC with the IANA zone it was scheduled in.
  Recurring posts and calendars compute in `DateTime.Zoned`, so daylight saving
  is handled.
- Errors are `Schema.TaggedError`. Platform failures are typed (rate limited,
  token expired, media rejected, unconfirmed) so workflows handle each one.
- Publishing, token refresh and analytics pulls run as Effect Workflow and
  Cluster jobs stored in Postgres. There is no Redis.
- A post whose outcome is unknown is marked unconfirmed, never retried blindly:
  the user checks the platform before reposting.
- Channel tokens are encrypted with AES-256-GCM through Web Crypto: a keyring
  read with `Config.redacted`, a key id and random IV per value, and the channel
  id as additional authenticated data.
- Channels have their own OAuth flows and token table. Better Auth's social
  providers are for signing in only.

## Self-hosting

Every outside service sits behind a port with a self-hostable default, so a
self-hoster needs only Postgres and an S3-compatible store:

- storage: any S3 API (R2 in production, SeaweedFS in development);
- email: Resend or SMTP (Mailpit in development);
- billing: Stripe, off when no key is set (no plan limits);
- captcha: Turnstile, off when no key is set;
- AI: any OpenAI-compatible endpoint, or an Anthropic key;
- telemetry: OTLP export only when `OTEL_EXPORTER_OTLP_ENDPOINT` is set.

Images read `PORT` and plain environment variables and run anywhere.

## Web front

- Build screens from `acme-ui` components and Tailwind classes; add no other
  stylesheet. Add a shadcn component to `acme-ui` with the shadcn CLI, then point
  its `cn` import at `../lib/utils` and its sibling imports at `./`.
- Pages fetch through the client derived from `acme-contract`, with
  `@effect/atom-react`.
- English is the default language and French the second. Write no user-facing
  string outside the message catalogues, notifications and emails included:
  store events, render them in the reader's language.

## Environments

- `dev`: local, with the compose stack from `acme-docker`.
- `sandbox`: pre-production, with its own database, R2 bucket, Stripe sandbox
  and platform redirect URIs.
- `production`.

## Infrastructure

- Production runs on a Hetzner server managed with Ansible from `acme-infra`,
  reachable only through a Cloudflare Tunnel: no inbound ports. Cloudflare Zero
  Trust Access guards Grafana, the admin and the sandbox. Caddy fronts the
  stack for self-hosters.
- Telemetry goes through an OpenTelemetry Collector to Loki, Tempo, Prometheus
  and Grafana; alerts go to a Telegram bot. A separate server checks uptime.
- Secrets are generated on the server and stay there. Do not copy them, print
  them, or give the server's credentials to other systems, GitHub included.
- Changing a server's size or adding any paid resource needs the owner's
  explicit approval.

## Public repository

- Everything committed is published: synthetic data only in tests and
  fixtures; no secrets, tokens or customer content in source, logs or test
  artifacts.
- Never name a competitor or another product in this field, in code,
  comments, docs, commits, pull requests or issues. Describe the behaviour
  instead.

## Maintain this guide

Keep agent instructions here and setup steps in the [README](README.md). Keep
[`CLAUDE.md`](CLAUDE.md) as `@AGENTS.md` so both clients share these
instructions.
