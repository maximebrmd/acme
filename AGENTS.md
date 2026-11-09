# Acme

Acme is a social media scheduling platform: teams write posts once, schedule
them across platforms, and see how they perform. "Acme" is a working name. The
source is public under the Functional Source License (FSL-1.1-ALv2, in
[`LICENSE.md`](LICENSE.md)): anyone may self-host it, and each release becomes
Apache-2.0 two years after it ships. Call it "fair source", not open source.

Nx projects live directly under `packages/`:

- `acme-contract`: the HTTP API definition (`Api`: Effect `HttpApi` groups,
  Schemas and the `Authentication` and `WorkspaceAccess` middlewares),
  `OAuthApi` for the Better Auth endpoints Acme's clients call, and
  `acme-contract/post-text`, the text rules clients count with. The server
  implements `Api`; the web app and the CLI derive typed clients from it, and
  the MCP tools reuse its schemas. `nx run acme-contract:openapi` writes
  `openapi.json` for the docs.
- `acme-server`: the Effect server on Bun: the bounded contexts below, Better
  Auth, the MCP endpoint, and the cluster that runs durable jobs and crons.
- `acme-ui`: the design system, shipped as sources that apps compile: shadcn/ui
  on Base UI (Nova style, lucide icons), the Tailwind CSS v4 theme and the
  Geist fonts.
- `acme-web`: the Next.js App Router app, with next-intl, `@effect/atom-react`,
  Better Auth's client and Tiptap.
- `acme-cli`: the `acme` command line, `effect/cli` on Bun, a client of the API
  that signs in with OAuth.
- `acme-docker`: the development compose stack and the server's production
  image (with sharp's C++ runtime and a static ffprobe).
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
  suppressions; `bun run fix` applies what it can. `bun run test` needs the
  development stack's Postgres, Mailpit and SeaweedFS (see
  [Development stack](#development-stack)).
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
- `layer(...)` from `@effect/vitest` builds its layers once for the block, and
  `Layer.fresh` rebuilds only the outer layer: a test that needs a layer
  configured differently (a probe without ffprobe, a store that answers
  nothing) goes in a `layer(...)` block of its own.
- Server test helpers shared between folders import through `#test/*`
  (`test/<context>/support.ts`); production code never does, which the lint
  rules refuse.
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

Effect 4, Drizzle 1.0, Better Auth, the AT Protocol OAuth client, Tiptap, Blume
and Astro move faster than any training data. `bun run references` clones each
one's source, at the version this workspace installs, into
`.local/references/<name>` (ignored by Git, Nx and the linters). Read the code,
tests and docs there before using an API, and rerun the command after an
upgrade. Effect also ships agent docs in `.local/references/effect/ai-docs`,
and Next.js ships its docs in `packages/acme-web/node_modules/next/dist/docs`.

## Development stack

- Start Postgres, the S3 store (SeaweedFS), Mailpit and the telemetry stack
  with `bun nx run acme-docker:up`, which waits until every service is healthy.
  Stop it with `bun nx run acme-docker:down` (`-- --volumes` also deletes the
  data). The README lists the ports.
- Outside production, the server defaults every outside service to this stack:
  `ACME_S3_*` to SeaweedFS, `SMTP_URL` to Mailpit, `PUBLIC_URL` to
  `http://localhost:3001`. Only `DATABASE_URL` has no default.
- Browsers upload media straight to the bucket: run
  `bun nx run acme-server:media-cors` once per bucket. It puts the upload CORS
  rule on the bucket `ACME_S3_*` names, for `PUBLIC_URL` and
  `TRUSTED_ORIGINS`, keeps the bucket's other rules, and changes nothing when
  run again.
- Server tests run against the Postgres that `DATABASE_URL` names, and write to
  it. With the stack up, use
  `DATABASE_URL=postgres://acme:acme@127.0.0.1:15432/acme`. They read the
  emails they send from the stack's Mailpit (`SMTP_URL` and `MAILPIT_URL`
  override it), and store media in its SeaweedFS under `tests/media/`
  (`ACME_S3_*` override it). CI runs its own Postgres and Mailpit, and starts
  SeaweedFS from `compose.yaml`.
- Tests that share a database with a running dev server share its jobs: leave
  no post scheduled or job waiting when a test ends, or the dev server runs
  it. Give each run its own database or `ACME_S3_KEY_PREFIX` when several run
  at once.
- To run a second stack beside another, set `COMPOSE_PROJECT_NAME` and the
  `ACME_*_PORT` overrides listed in `packages/acme-docker/.env.example`.
- In `packages/acme-docker/compose.yaml`, pin every image (image mounts
  included) to an exact version, publish ports on 127.0.0.1 only, give every
  service a health check, and use synthetic credentials.
  `packages/acme-docker/test/compose.test.ts` enforces these rules, and checks
  that the server image uses the Bun in `.bun-version`, runs as nonroot, ships
  ffprobe, and pins every image it builds on or copies from by digest.
- Keep `MP_SMTP_DISABLE_RDNS` on Mailpit, in compose and CI: its reverse DNS
  lookup otherwise stalls each SMTP greeting for about 10 seconds, and the
  email tests time out.

## Server architecture

The server follows DDD and Clean Architecture. Each bounded context in
`packages/acme-server/src/` has four layers, plus a `container.ts` that wires
them:

| Context         | Holds                                                      |
| --------------- | ---------------------------------------------------------- |
| `publishing`    | posts, their channels, schedules, publication attempts     |
| `channels`      | connected accounts, connect flows, encrypted tokens        |
| `media`         | uploads, storage, probing, alt text                        |
| `workspace`     | accounts, workspaces, members, roles, API keys, OAuth      |
| `notifications` | account emails and channel notices                         |
| `shared`        | the kernel the others build on                             |
| `analytics`     | per-platform metrics (planned: in the lint rules, no code) |
| `billing`       | plans, subscriptions, entitlements (planned, likewise)     |

- `domain`: entities and rules on Effect's core (`effect`: Schema, DateTime,
  Data). No HTTP, SQL, cluster, workflow, AI, Drizzle or Better Auth.
- `application`: use cases and the ports they need, as `Context.Service`.
  Imports its context's domain and the shared kernel.
- `infrastructure`: adapters behind the ports: Drizzle repositories, Better
  Auth, platform clients, workflows, crons and activities, storage, mail.
- `api`: `HttpApiBuilder` handlers for `acme-contract` groups. They get use
  cases from the context's `container.ts`, never from infrastructure.

`src/app/` is the composition root (`server.ts`, `cluster.ts`, `crons.ts`, the
MCP endpoint in `mcp/`) and `src/main.ts` the entry point. `ServerLive` builds
telemetry, the database pool, the migrations, the cluster, the contexts, then
the HTTP server and the workers; `AppLive` is the routes with their services
and no socket, for tests.

- Folders import each other through `#<context>/<layer>/…` (package.json
  `imports`); `../` imports are refused. `packages/acme-server/oxlint.config.ts`
  enforces the layer rules. Never loosen a rule to make an import pass; move
  the code. A new context goes into that file's `contexts` list.
- Contexts talk through ports: an adapter in one context may call another
  context's `application` layer, never its domain or infrastructure.
  Publishing lists channels through `ListedWorkspaceChannels`, which calls the
  channels context's `ListChannels`.
- Domain and application code never touches `Date`, `crypto`, `process` or
  `Bun`: time comes from `DateTime` and `Clock` (tests use `TestClock`), ids
  and randomness from ports, configuration from `Config`.
- Read every setting with `Config` in infrastructure. A setting production
  must be given, and that defaults to the development stack elsewhere, goes
  through `requiredInProduction` (`#shared/infrastructure/environment.ts`);
  `NODE_ENV=production`, which the image sets, decides. Read settings when the
  server starts, so a malformed value stops it there.
- The shared kernel holds the ids several contexts use (`ChannelIdSchema`,
  `PostIdSchema`, `MediaAssetIdSchema`: branded lowercase UUIDv7s;
  `UserIdSchema`, `WorkspaceIdSchema`: the random lowercase UUIDs Better Auth
  issues), the platform list (`PlatformSchema`), the permission vocabulary
  (`access.ts`, `authorize.ts`), locales (`LocaleSchema`: en, fr), IANA zones
  (`TimeZoneIdSchema`), wall-clock time (`LocalDateSchema`, `LocalTimeSchema`,
  `WeekdaySchema`, `fromWallClock`), and how a platform call can end
  (`PublishResult`, `PublishFailure`).
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
- Domain transitions are pure functions that take `now` and return a
  `Result`. `Effect.gen` cannot yield a `Result`, so use cases bridge with
  `yield* Effect.fromResult(…)`.
- Errors are `Schema.TaggedError`. Platform failures are typed (rate limited,
  token expired, media rejected, unavailable, bad request) so workflows handle
  each one.
- Use `effect/crypto` (`Aead`, `SecureRandom`, `Digest`) and `effect/encoding`
  (`Base64`, `Base64Url`) rather than calling Web Crypto or Node's byte APIs
  directly.

### HTTP API and middlewares

- Every route the server answers starts with `/api`, apart from `/openapi.json`
  and the OAuth discovery documents under `/.well-known/oauth-*`. The web app
  forwards `/api/*` and `/.well-known/oauth-*` unchanged, so Acme has one
  public origin; `/openapi.json` is reachable on the server only.
- `GET /api/health` is liveness: keep it free of the database.
  `GET /api/ready` is readiness: `SELECT 1` within 2 seconds, otherwise
  `DatabaseUnavailable` (503).
- `Authentication` tries a bearer token (an OAuth access token issued for
  `PUBLIC_URL/api`, or a workspace API key starting with `acme_`), then the
  session cookie, and provides `CurrentPrincipal`. A cookie request that
  changes something needs an `Origin` of `PUBLIC_URL` or `TRUSTED_ORIGINS`,
  and reads the session fresh from the database.
- `WorkspaceAccess` reads `:workspaceId` and provides `CurrentMember`. A
  workspace the caller does not belong to answers 404, a banned user 403.
  Membership and bans are read on every request (`MemberDirectory`), so they
  apply at once.
- Put workspace groups under `/api/workspaces/:workspaceId/…`, with
  `.middleware(WorkspaceAccess).middleware(Authentication)` (Authentication
  runs first), and add them to `WorkspaceGroupsLive` in `src/app/server.ts`.
- Handlers turn `CurrentMember` into an `Actor` with `actorOf`
  (`#shared/api/actor.ts`). Use cases that act for someone take that `Actor`
  and check it with `authorize`: permissions are `resource:action`
  (`post:schedule`, `channel:connect`, `media:upload`…).
- Map each use case error to a contract error. A failure of the server's own
  (the database, a bug) is a defect: 500. A handler that maps an outside
  failure to 503 logs it as a warning first.
- Handler tests through `HttpApiTest.groups` provide `securityTest(member)` or
  `anonymousSecurityTest` from `#workspace/api/security.ts`. The CLI's
  in-memory test server (`packages/acme-cli/test/support.ts`) serves every
  contract group: add new endpoints there too.

### Accounts and access (workspace)

- Better Auth lives only in `src/workspace/infrastructure/auth/`. `makeAuth`
  in `options.ts` is its one configuration, and its routes are under
  `/api/auth`. Every plugin is always on and options that shape tables are
  constants, so every deployment has the same tables.
- Workspaces are Better Auth organizations. The five roles (owner, admin,
  editor, contributor, viewer) and their grants are in
  `workspace/domain/roles.ts`, translated for Better Auth in
  `access-control.ts`. A member holds exactly one role.
- API keys belong to workspaces, never carry more than their creator holds,
  and are created only through `POST /api/workspaces/:workspaceId/api-keys`:
  Better Auth's own key routes are disabled.
- Staff (Better Auth's admin role) may impersonate a member for an hour. They
  then lose the permissions `withheldWhileImpersonating` lists
  (`workspace/domain/membership.ts`), and Better Auth refuses them every route
  that changes a workspace, grants an OAuth client access or approves a
  device code (`impersonation.ts`).
- Better Auth is also the OAuth authorization server for the CLI (device
  grant, the `acme-cli` public client registered at startup) and MCP clients
  (authorization code with PKCE, and dynamic registration when
  `MCP_DYNAMIC_REGISTRATION=true`). Access tokens are JWTs that last 15
  minutes and are checked locally; refresh tokens rotate, and one sent again
  within 30 seconds gets the same answer, while later reuse revokes that user
  and client's refresh tokens.
- An MCP token is bound to the workspace the user picked (`workspace_id`
  claim). Access tokens must carry `workspace:read` (reading only) or
  `workspace:write` (what the role allows).
- When `PUBLIC_URL` is neither HTTPS nor a loopback host, the server runs the
  plain OAuth provider without the MCP resource: the CLI signs in, the MCP
  endpoint refuses every request, and startup logs a warning.
- Better Auth's tables live in the Postgres schema `auth`, in
  `src/workspace/infrastructure/auth-schema.generated.ts`, which
  `nx run acme-server:auth-schema` writes from the real options. Rerun it after
  changing those options or upgrading Better Auth, then `db:generate`.
  `auth-schema-check`, a dependency of the server's tests, fails when the file
  is stale.

### Channels

- Channel tokens are encrypted with AES-256-GCM through `Aead`: a keyring read
  with `Config.Redacted("ACME_TOKEN_KEYS")` (comma-separated `keyId:base64key`
  entries; the first encrypts, all decrypt), a random IV per value, stored as
  `<keyId>.<iv>.<ciphertext>`, and the channel id as additional authenticated
  data. `encryptSecret` and `decryptSecret` bind other secrets to
  `connect:<state>` or `app:<origin>` the same way.
- The keyring is optional: unset or blank, the server starts, encrypting fails
  with `MissingTokenKey` (connecting answers `ConnectFailed` `notConfigured`)
  and decrypting with `UnknownTokenKey`. A malformed keyring stops the server
  at startup. `token_key_id` records which key encrypted a row.
- Channels have their own OAuth flows and token tables. Better Auth's social
  providers are for signing in only.
- Platform sign-in goes through one `PlatformAuthorizer` per platform
  (`channels/application/platform-authorizer.ts`); Mastodon always, Bluesky
  when the server has a client for it. Each declares its `TokenPolicy`, data
  in `channels/domain/token-policy.ts`, which the refresh sweep and the
  reconnect warnings follow.
- `ConnectChannel` stores each attempt under the SHA-256 of its state, bound
  to the member, the workspace and the platform, for 15 minutes, completed
  once. One channel per platform account per workspace: connecting an account
  again reconnects its channel.
- Any request to a host a user chose (a Mastodon instance, the servers a
  Bluesky DID names) goes through `publicHttpClient` or `publicFetch` from
  `#shared/infrastructure/platforms`: HTTPS on the default port only,
  addresses that are public after DNS resolution, no redirects, answers cut
  off past 1 MiB, 20-second timeout, no trace context. Tests swap the
  `OutboundGuard` for an open one only to reach loopback fakes.
- The AT Protocol OAuth client runs on Bun only with the handle resolver built
  on Acme's guarded fetch; its default one needs Node's undici.
- Refresh a channel's tokens only inside `ChannelLocks.withLock` (Postgres
  advisory locks). A process holds at most four at once, each on a pool
  connection, so never nest `withLock`. Bluesky and X refresh tokens work
  once.
- A platform failure is temporary (`PlatformUnavailable`) when any server on
  the way answered 5xx or 429; only the platform's own refusal marks a channel
  `refreshNeeded`.
- `ChannelGate` stays in `publishing/infrastructure` until the publishing
  adapters move to channels: moving it alone would make the two contexts
  depend on each other.

### Publishing and the cluster

- Publishing runs as Effect Workflows, and token refresh, reconnect warnings
  and retention as `ClusterCron`s, stored in Postgres. There is no Redis.
- `src/app/cluster.ts` builds a `SingleRunner` with SQL message and runner
  storage on the same pool as Drizzle, so `TransactionRunner`
  (`shared/application`) saves rows and starts a workflow in one transaction.
  The runner's name comes from `HOSTNAME`, never `HOST` or `PORT`; shards are
  held with session advisory locks, storage is polled every 2 seconds, and
  shutdown waits up to 60 seconds for platform calls in flight.
- Register crons in `src/app/crons.ts`. Workflow tags, payloads, idempotency
  keys, activity and clock names, result schemas and cron names are persisted
  contract: add a payload field with a decoding default or a union member,
  never rename or remove one, and for a breaking change add a V2 beside V1 and
  drain it. Keep the fixtures in
  `test/publishing/infrastructure/fixtures/persisted` decoding.
- `PublishPostV1` sleeps durably until the instant, claims the post for its
  schedule revision, runs one `PublishTargetV1` per channel, then finishes the
  post. Each attempt writes and commits its journal row
  (`publishing.publication_calls`) before calling the platform.
- A post whose outcome is unknown is marked unconfirmed, never retried blindly:
  the user checks the platform before reposting.
- Platform calls go through the `PlatformPublisher` port, one at a time per
  channel through `ChannelGate`. The server runs
  `UnsupportedPlatformPublisher`, which refuses every call, until real
  adapters exist; tests use `FakePlatformPublisher`.
- A post's text is checked against each platform with
  `#publishing/domain/text-length.ts` and `platform-rules.ts` when it is
  scheduled, never while it is a draft. `acme-contract/post-text` is the
  clients' copy, kept equal by `test/publishing/api/contract.test.ts`: change
  both together.
- Workflow tests (`test/publishing/infrastructure/harness.ts`): set `TestClock`
  before building a cluster (`onServerAt`); wait until a job is parked
  (`isSuspended`, `isTargetWaiting`) before moving time; count calls with
  `callsOn` for your own channels. `test/publishing/posts-server.ts` runs the
  use cases and workflows on an in-memory cluster. `AppLive` gives publishing
  an engine that runs no job, so scheduling through it fails. Only
  `test/app/cluster.test.ts` runs a SQL runner.

### Media

- Clients upload straight to the store with presigned PUTs, so files never
  pass through the API: one request up to 16 MiB, 8 MiB parts above that.
  Single PUTs sign `content-type`, `content-length` and `if-none-match: *`;
  never use presigned POST, which R2 lacks.
- `POST …/media/:id/complete` lists and joins the parts, checks the stored
  size and type, then probes the file at once: sharp for images (real format
  checked against the declared one), ffprobe for videos. `ready` means probed;
  an `uploaded` asset carries its probe state (`pending`, `unavailable`, or why
  the probe failed).
- Accepted media: JPEG, PNG, GIF and WebP images up to 16 MiB; MP4 and
  QuickTime videos up to 1 GiB (`media/domain/media-format.ts`). Publishing
  checks per-platform limits when a post is scheduled.
- Storage keys are `media/<workspace id>/<asset id>.<ext>` under
  `ACME_S3_KEY_PREFIX`, and never change. Keep presigned URLs out of logs and
  errors.
- The S3 adapter uses the AWS SDK v3 (Bun's client cannot presign parts).
  Keep its checksums at `WHEN_REQUIRED`: the default puts an empty-body CRC32
  in presigned URLs, which stores refuse.

### Notifications

- Emails go through the `Mailer` port: Resend when `RESEND_API_KEY` is set,
  otherwise SMTP at `SMTP_URL`, from `MAIL_FROM`. Requests never wait for
  them.
- Render every email from `notifications/domain/english.ts` and `french.ts`,
  in the reader's locale. Account emails go through `SendAuthEmail`; channel
  notices through `SendChannelNotice`, once per event key
  (`notifications.sent_notices`), to members who hold `channel:connect`.

### MCP endpoint

- `src/app/mcp/` serves effect/ai's `McpServer.layerHttp` at `/api/mcp`
  (Streamable HTTP; revisions 2026-07-28, 2025-11-25 and 2025-06-18, whose
  sessions live in memory and end with `DELETE`).
- Tools are `Tool.make` with Effect Schema inputs and outputs, declare
  `CurrentMember`, and reach contexts through their use cases.
  `McpAuthenticationLive` (`#workspace/api/mcp-authentication.ts`) provides
  the member from the request's OAuth token: 401 with an RFC 9728 challenge
  without a working token, 403 without a workspace scope or membership.

### Database

- The server reads `DATABASE_URL` (required) with `Config.Redacted`.
  `DatabaseLive` in `#shared/infrastructure/database.ts` provides `PgClient`,
  Effect's `SqlClient` and the `Drizzle` service on one pool, which the
  cluster shares. Better Auth runs on a small pool of its own
  (`AUTH_DB_POOL_MAX`). Repositories use `Drizzle`, or `SqlClient` for raw
  SQL.
- Each context keeps its tables in a Postgres schema named after it
  (`publishing`, `channels`, `media`, `notifications`; the workspace context's
  are Better Auth's, in `auth`). Effect creates its `cluster_*` tables in
  `public`; drizzle-kit never manages them.
- Declare a context's tables in `src/<context>/infrastructure/schema.ts`, then
  run `nx run acme-server:db:generate`, which writes a migration folder under
  `packages/acme-server/drizzle/`. Commit the folder as drizzle-kit wrote it;
  never edit a migration that has shipped.
- The server applies pending migrations before it listens, under an advisory
  lock, so servers starting together take turns. `nx run acme-server:db:migrate`
  applies them without starting the server.

## Self-hosting

Every outside service sits behind a port with a self-hostable default, so a
self-hoster needs only Postgres and an S3-compatible store:

- storage: any S3 API (R2 in production, SeaweedFS in development), with the
  upload CORS rule that `media-cors` writes;
- email: Resend or SMTP (Mailpit in development);
- billing: Stripe, off when no key is set (no plan limits);
- captcha: Turnstile, off when no key is set;
- AI: any OpenAI-compatible endpoint, or an Anthropic key;
- telemetry: OTLP export of logs, metrics and traces only when
  `OTEL_EXPORTER_OTLP_ENDPOINT` is set (`src/app/observability.ts` defaults
  each `OTEL_<SIGNAL>_EXPORTER` to `otlp`; set one to `none` to turn that
  signal off).

Billing, captcha and AI are not built yet.

- Images read `PORT` and plain environment variables and run anywhere.
- Route `/api/*` and `/.well-known/oauth-*` to the server, or let the web app
  forward them, and everything else to the web app.
- Document every setting a package reads in the docs' environment variables
  page, in English and French, in the same change.

## Web front

- Build screens from `acme-ui` components and Tailwind classes; add no other
  stylesheet.
- Add a shadcn component by running `bunx shadcn add <name>` in
  `packages/acme-ui`, which reads its `components.json`. Point the component's
  `cn` import (the CLI writes `"cn"`) at `../lib/utils` and its sibling imports
  at `./`, rewrite function components as arrow functions, take every
  user-facing string (labels such as a dialog's close button) as a prop, then
  run `bun run fix`.
- Use theme tokens (`text-muted-foreground`, not `text-gray-500`) and
  component variants and sizes rather than restyling a component; the
  `@shadcn/lint` rules check pages against acme-ui. Dark mode follows the
  operating system (`prefers-color-scheme`).
- Pages live under `src/app/[locale]/`: the auth pages (`sign-up`, `sign-in`,
  `verify-email`, `forgot-password`, `reset-password`, `invitations/[id]`),
  the OAuth pages (`device`, `oauth/workspace`, `oauth/consent`), the
  platforms' redirect URI `connect/[platform]/callback`, and the signed-in
  app: `app` (workspaces), `app/[workspaceId]/channels`, `…/media`,
  `…/calendar`, `…/posts/new` and `…/posts/[postId]`.
- Pages fetch through the client derived from `acme-contract`, with
  `@effect/atom-react`: query atoms come from `AcmeApi` in `src/api/client.ts`.
  Browsers call `/api`; server code calls `ACME_API_URL`.
- Server Components read the signed-in user with `currentUser()` from
  `#auth/session.ts` (GET /api/me with the request's cookies, once per
  request); the header uses `currentUserOrNone()`, so pages stay up when the
  API is down. Gate a page by the permissions `/api/me` lists for the
  workspace.
- To render a query on the server, give it a `serializationKey`, run
  `prefetch([…])` from `src/api/prefetch.ts` in an async Server Component
  after `await connection()`, and wrap the client component in
  `HydrationBoundary`. `prefetch` does not forward the visitor's cookies, so a
  query that needs them, and anything that depends on the browser (its time
  zone, the current time), renders after hydration (`useHydrated`,
  `useMounted`). Tiptap editors set `immediatelyRender: false`.
- Client components call Better Auth through `authClient` (`#auth/client.ts`).
  During an OAuth authorization it sends the page's signed query with every
  POST, and Better Auth resumes the authorization after any call that sets
  the session cookie; calls that must not resume it, such as setting the
  active workspace, go through `workspaceClient`. Better Auth error codes map
  to `Auth.errors` in the catalogues.
- Keep the OAuth pages' views (`WorkspacePickerView`) apart from their state,
  so tests render each state: acme-web has no DOM test environment.
- `src/proxy.ts` rewrites `/api/*` and `/.well-known/oauth-*` to
  `ACME_API_URL`, read per request. Keep it there, not in `next.config.ts`:
  Next resolves config rewrites at build time and writes the URL into the
  build.
- `next dev` serves its scripts only to `localhost`: open the app at
  `http://localhost:3001`; on `127.0.0.1` pages never hydrate.
- English is the default language and French the second. Write no user-facing
  string outside the message catalogues, notifications and emails included:
  store events, render them in the reader's language. Give each feature its
  own namespace (`ChannelsPage`, `Posts`, `Media`, `OAuth`…).
- `messages/en.json` is the reference: every other catalogue has exactly its
  keys, which a test and the types check. Use ICU arguments rather than
  building sentences in code.
- English has no prefix (`/`) and French is under `/fr`. Navigate with the
  helpers in `src/i18n/navigation.ts`, not `next/link`.
- Folders in `acme-web` import each other through `#…` (package.json
  `imports`); `#messages/*` points at the catalogues.

## Command line

- `acme-cli` reaches the server only over HTTP, through `AcmeApi`
  (`src/api.ts`), the client derived from `acme-contract`, and `OAuthApi` for
  Better Auth's endpoints. Its oxlint config refuses `acme-server` imports,
  and `@effect/platform-bun` outside `src/main.ts`.
- The API URL comes from `--api-url`, then `ACME_API_URL`, then
  `http://localhost:3000`.
- `acme login` signs in with the device grant; `whoami`, `logout`, `mcp` and
  `health` are the other commands. Commands that act as the user take a token
  from `accessToken` (`src/session.ts`), which renews it with the refresh
  token. `CredentialStore` (`src/credentials.ts`) saves sign-ins by API URL in
  `credentials.json` (0600, in a 0700 folder). Keep tokens `Redacted`, and
  never print one.
- Test commands with `runWith` from `src/cli.ts` against the in-memory server
  in `test/support.ts` (the contract served by test handlers) and the
  authorization server in `test/authorization-server.ts`, never against a
  running server.

## Docs and marketing site

- Docs pages live in `packages/acme-docs/docs/`: English at the root, French in
  `docs/fr/` under the same file names. Pin each heading's anchor with `[#id]`
  so links work in both languages, and order pages with `sidebar.order`.
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
