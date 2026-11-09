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
- `acme-ui`: the design system, shipped as sources that apps compile: shadcn/ui
  on Base UI (Nova style, lucide icons), the Tailwind CSS v4 theme and the
  Geist fonts.
- `acme-web`: the Next.js App Router app, with next-intl and
  `@effect/atom-react`.
- `acme-cli`: the `acme` command line, `effect/cli` on Bun, a client of the API.
- `acme-docker`: the development compose stack and the server's production
  image.
- `acme-docs`: the documentation site (Blume), with the API reference rendered
  from the contract's `openapi.json`.
- `acme-site`: the static marketing site (Astro), with the legal pages that
  platforms ask for during app review.

Planned: `acme-infra` (Ansible).

Work from the repository root unless a command names another directory.

## Work and verify

- Use the Bun version in [`.bun-version`](.bun-version) and the Node version
  in the [CI workflow](.github/workflows/ci.yml). Install with
  `bun install --frozen-lockfile`.
- For code changes, run `bun run check`, `bun run typecheck`, `bun run test`
  and `bun run build`, as CI does. Fix lint findings without inline
  suppressions; `bun run fix` applies what it can. `bun run test` needs
  Postgres (see [Development stack](#development-stack)).
- Linters and formatters are as strict as they go: Ultracite's oxlint presets
  (core and anti-slop everywhere, plus the preset for each package's framework)
  with type-aware rules, and oxfmt. Each package has its own
  `oxlint.config.ts`. Parse values with Effect Schema rather than asserting
  types or checking `typeof`.
- Type-aware lint reads generated types, so a package with a generator
  (`next typegen`, `astro sync`) gets a `typegen` target: `bun run check` runs
  every `typegen` first, and the package's `typecheck` depends on it.
- A schema and its type cannot share a name: name a non-class schema `XSchema`,
  with `export type X = typeof XSchema.Type`. Entities and value objects are
  `Schema.Class`, which is both.
- One class per file: give each error its own file, named after the class.
- Write `x.pipe(Effect.map(f))`, not `Effect.map(x, f)`, which
  `unicorn/no-array-method-this-argument` mistakes for an array `thisArg`.
- Tests run under vitest on Node, so code under test cannot use `Bun.*`. Inside
  `it.effect`, assert with `assert` from `@effect/vitest` (the lint rules
  report `expect` there as outside a test); in plain `it`, use `expect`.
- `bun build --compile` leaves a `.<hash>.bun-build` copy of Bun (about 90 MB)
  in the working directory when Bun is read-only, as Homebrew installs it.
  Compile through a script that deletes it, like
  `packages/acme-cli/scripts/build.ts`.
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

## Development stack

- Start Postgres, the S3 store (SeaweedFS), Mailpit and the telemetry stack
  with `bun nx run acme-docker:up`, which waits until every service is healthy.
  Stop it with `bun nx run acme-docker:down` (`-- --volumes` also deletes the
  data). The README lists the ports.
- Server tests run against the Postgres that `DATABASE_URL` names, and write to
  it. With the stack up, use
  `DATABASE_URL=postgres://acme:acme@127.0.0.1:15432/acme`. CI runs its own.
- To run a second stack beside another, set `COMPOSE_PROJECT_NAME` and the
  `ACME_*_PORT` overrides listed in `packages/acme-docker/.env.example`.
- In `packages/acme-docker/compose.yaml`, pin every image (image mounts
  included) to an exact version, publish ports on 127.0.0.1 only, give every
  service a health check, and use synthetic credentials.
  `packages/acme-docker/test/compose.test.ts` enforces these rules, and checks
  that the server image uses the Bun in `.bun-version` and runs as nonroot.

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
- The shared kernel holds the ids several contexts use (`ChannelIdSchema`,
  `PostIdSchema`: branded lowercase UUIDv7s; `UserIdSchema`,
  `WorkspaceIdSchema`: the random lowercase UUIDs Better Auth issues), IANA
  zones (`TimeZoneIdSchema`) and wall-clock time (`LocalDateSchema`,
  `LocalTimeSchema`, `WeekdaySchema`, `fromWallClock`).
- Take ids from the `Ids` port: `yield* newId(PostIdSchema)`. Tests provide
  `Ids.layerTest`, which issues `00000000-0000-7000-8000-000000000001`, then
  `…002`, from each build of the layer.
- A scheduled instant is stored in UTC with the IANA zone it was scheduled in.
  Recurring posts and calendars compute in `DateTime.Zoned`, so daylight saving
  is handled.
- Turn wall-clock times into instants with `fromWallClock`, never
  `DateTime.makeZoned`'s default: a time the clocks skip moves to the moment
  they jump (02:30 becomes 03:00, not 03:30), and a repeated time takes the
  earlier offset, so it happens once. Keep zone ids as the user wrote them, and
  refuse offsets such as `+01:00`.
- Domain transitions are pure functions that return a `Result`. `Effect.gen`
  cannot yield a `Result`, so use cases bridge with
  `yield* Effect.fromResult(…)`.
- Errors are `Schema.TaggedError`. Platform failures are typed (rate limited,
  token expired, media rejected, unconfirmed) so workflows handle each one.
- Publishing, token refresh and analytics pulls run as Effect Workflow and
  Cluster jobs stored in Postgres. There is no Redis.
- A post whose outcome is unknown is marked unconfirmed, never retried blindly:
  the user checks the platform before reposting.
- Use `effect/crypto` (`Aead`, `SecureRandom`) and `effect/encoding` (`Base64`,
  `Base64Url`) rather than calling Web Crypto or Node's byte APIs directly.
- Channel tokens are encrypted with AES-256-GCM through `Aead`: a keyring read
  with `Config.Redacted("ACME_TOKEN_KEYS")` (comma-separated `keyId:base64key`
  entries; the first encrypts, all decrypt), a random IV per value, stored as
  `<keyId>.<iv>.<ciphertext>`, and the channel id as additional authenticated
  data.
- Channels have their own OAuth flows and token table. Better Auth's social
  providers are for signing in only.

### Database

- The server reads `DATABASE_URL` (required) with `Config.Redacted`.
  `DatabaseLive` in `#shared/infrastructure/database.ts` provides `PgClient`,
  Effect's `SqlClient` and the `Drizzle` service on one pool. Repositories use
  `Drizzle`, or `SqlClient` for raw SQL.
- Declare a context's tables in `src/<context>/infrastructure/schema.ts`, then
  run `nx run acme-server:db:generate`, which writes a migration folder under
  `packages/acme-server/drizzle/`. Commit the folder as drizzle-kit wrote it;
  never edit a migration that has shipped.
- The server applies pending migrations before it listens, under an advisory
  lock, so servers starting together take turns. `nx run acme-server:db:migrate`
  applies them without starting the server.
- `GET /api/health` is liveness: keep it free of the database.
  `GET /api/ready` is readiness: `SELECT 1` within 2 seconds, otherwise
  `DatabaseUnavailable` (503).

## Self-hosting

Every outside service sits behind a port with a self-hostable default, so a
self-hoster needs only Postgres and an S3-compatible store:

- storage: any S3 API (R2 in production, SeaweedFS in development);
- email: Resend or SMTP (Mailpit in development);
- billing: Stripe, off when no key is set (no plan limits);
- captcha: Turnstile, off when no key is set;
- AI: any OpenAI-compatible endpoint, or an Anthropic key;
- telemetry: OTLP export of logs, metrics and traces only when
  `OTEL_EXPORTER_OTLP_ENDPOINT` is set (`src/app/observability.ts` defaults
  each `OTEL_<SIGNAL>_EXPORTER` to `otlp`; set one to `none` to turn that
  signal off).

Images read `PORT` and plain environment variables and run anywhere.

## Web front

- Build screens from `acme-ui` components and Tailwind classes; add no other
  stylesheet.
- Add a shadcn component by running `bunx shadcn add <name>` in
  `packages/acme-ui`, which reads its `components.json`. Point the component's
  `cn` import (the CLI writes `"cn"`) at `../lib/utils` and its sibling imports
  at `./`, rewrite function components as arrow functions, then run
  `bun run fix`.
- Use theme tokens (`text-muted-foreground`, not `text-gray-500`) and
  component variants and sizes rather than restyling a component; the
  `@shadcn/lint` rules check pages against acme-ui. Dark mode follows the
  operating system (`prefers-color-scheme`).
- Pages fetch through the client derived from `acme-contract`, with
  `@effect/atom-react`: query atoms come from `AcmeApi` in `src/api/client.ts`.
  Browsers call `/api`; server code calls `ACME_API_URL`.
- To render a query on the server, give it a `serializationKey`, run
  `prefetch([…])` from `src/api/prefetch.ts` in an async Server Component
  after `await connection()`, and wrap the client component in
  `HydrationBoundary`.
- `src/proxy.ts` rewrites `/api/*` to `ACME_API_URL`, read per request. Keep
  it there, not in `next.config.ts`: Next resolves config rewrites at build
  time and writes the URL into the build.
- English is the default language and French the second. Write no user-facing
  string outside the message catalogues, notifications and emails included:
  store events, render them in the reader's language.
- `messages/en.json` is the reference: every other catalogue has exactly its
  keys, which a test and the types check. Use ICU arguments rather than
  building sentences in code.
- English has no prefix (`/`) and French is under `/fr`. Navigate with the
  helpers in `src/i18n/navigation.ts`, not `next/link`.
- Folders in `acme-web` import each other through `#…` (package.json
  `imports`); `#messages/*` points at the catalogues.

## Command line

- `acme-cli` reaches the server only over HTTP, through `AcmeApi`
  (`src/api.ts`), the client derived from `acme-contract`. Its oxlint config
  refuses `acme-server` imports, and `@effect/platform-bun` outside
  `src/main.ts`.
- The API URL comes from `--api-url`, then `ACME_API_URL`, then
  `http://localhost:3000`.
- Test commands with `runWith` from `src/cli.ts` against the in-memory server
  in `test/support.ts` (the contract served by test handlers), never against a
  running server.

## Docs and marketing site

- Docs pages live in `packages/acme-docs/docs/`: English at the root, French in
  `docs/fr/` under the same file names. Pin each heading's anchor with `[#id]`
  so links work in both languages.
- Every docs target depends on `acme-contract:openapi`, so the reference
  matches the contract. `nx run acme-docs:test` runs `blume validate --strict`.
- Do not run `blume build` or `blume check` while `blume dev` runs in the same
  package: they share the generated runtime in `.blume/` (typecheck uses
  `--isolated` for that reason). Leave Blume's own TypeScript 6 alone.
- Site strings live in `packages/acme-site/src/i18n/messages.ts`, legal
  documents in `src/content/legal/<locale>/<document>.md`. Keep a legal
  document `draft: true` (banner and noindex) until legal review approves it,
  and never replace a [bracketed placeholder] with a guess.
- TypeScript 7 does not read `.astro` files, and `astro check` refuses it: keep
  page logic in typed `.ts` modules and `.astro` files thin. Name files in
  kebab-case.
- `nx run acme-docs:build` and `nx run acme-site:build` write each package's
  `dist/`, cached. Their settings are optional, and unset or empty turns the
  feature off: docs `DOCS_SITE_URL`, `DOCS_PLAUSIBLE_DOMAIN`,
  `DOCS_PLAUSIBLE_HOST`; site `SITE_URL`, `SITE_DOCS_URL`,
  `SITE_PLAUSIBLE_DOMAIN`, `SITE_PLAUSIBLE_HOST`. Nx hashes them from the
  process environment only, not `.env` files: export them, or build with
  `--skip-nx-cache`.
- Run the site with `nx run acme-site:dev`: it sets `ASTRO_DEV_BACKGROUND=0`,
  because Astro otherwise detaches `astro dev` when an agent runs it.

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
