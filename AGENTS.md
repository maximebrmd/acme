# Peal

Peal is a social media scheduling platform: teams write posts once, schedule
them across platforms, and see how they perform, at [peal.social](https://peal.social). The
source is public under the Functional Source License (FSL-1.1-ALv2, in
[`LICENSE.md`](LICENSE.md)), with Peal as its licensor: anyone may self-host
it, and each release becomes Apache-2.0 two years after it ships. Call it
"fair source", not open source. The SDKs (`peal-sdk`) are
Apache-2.0, as `peal-contract` is, which they are generated from, each
with its own `LICENSE` and a `NOTICE` (Copyright 2026 Peal): keep anything an SDK user installs or generates from free of FSL
code, so an SDK never depends on another workspace package but the contract.
Every `package.json` names its licence (SPDX), the repository
(https://github.com/peal-social/peal, with its folder), its homepage and where
issues go; README.md's "Licensing" says which part is under which.

Until its rename, the product carried the placeholder name "acme". That name
is gone from the repository and must not come back, in any case or form; the
one `acme` left is Caddy's ACME certificate issuer, a protocol, in the uptime
role's `Caddyfile.j2`.

Nx projects live directly under `packages/`, but for the SDKs, which have one
per language under `packages/peal-sdk/`:

- `peal-contract`: the HTTP API definition (`Api`: Effect `HttpApi` groups,
  Schemas and the `Authentication` and `WorkspaceAccess` middlewares),
  `OAuthApi` for the Better Auth endpoints Peal's clients call, and
  `peal-contract/post-text`, the text rules clients count with. The server
  implements `Api`; the web app and the CLI derive typed clients from it, and
  the MCP tools reuse its schemas. `nx run peal-contract:openapi` writes
  `openapi.json` for the docs.
- `peal-server`: the Effect server on Bun: the bounded contexts below, Better
  Auth, the MCP endpoint, and the cluster that runs durable jobs and crons.
- `peal-ui`: the design system, shipped as sources that apps compile: shadcn/ui
  on Base UI (Nova style, lucide icons), the Tailwind CSS v4 theme and the
  Geist fonts.
- `peal-web`: the Next.js App Router app, with next-intl, `@effect/atom-react`,
  Better Auth's client and Tiptap.
- `peal-cli`: the `peal` command line, `effect/cli` on Bun, a client of the API
  that signs in with OAuth.
- `peal-docker`: the development compose stack, the production images (the
  server's, with sharp's C++ runtime and a static ffprobe; the web app's;
  the site and docs on nginx; Postgres with pgBackRest), the production stack
  (`compose.production.yaml`) and Caddy in front of it for self-hosters
  (`compose.self-host.yaml`).
- `peal-docs`: the documentation site (Blume), with the API reference rendered
  from the contract's `openapi.json`.
- `peal-site`: the static marketing site (Astro), with the legal pages that
  platforms ask for during app review.
- `peal-e2e`: end-to-end browser tests with the e2e runner (`e2e`,
  `@e2e-dev/web`). Each run starts the server and the web app's production
  build itself (`scripts/serve.ts`).
- `peal-infra`: Ansible for Peal's servers, production and the sandbox, and
  their releases. Python, managed with uv.
- `peal-sdk`: the API's clients in eight languages (`node`, `python`, `go`,
  `ruby`, `java`, `php`, `dotnet`, `rust`), generated from the contract by
  Fern's open-source generators and committed. Each language's folder is an Nx project
  (`peal-sdk-<language>`, tagged `sdk`). Apache-2.0, unlike the rest of the
  repository (see [SDKs](#sdks)).

Work from the repository root unless a command names another directory.

## Work and verify

- Use the Bun version in [`.bun-version`](.bun-version) and the Node version
  in the [CI workflow](.github/workflows/ci.yml). Install with
  `bun install --frozen-lockfile`.
- For code changes, run `bun run check`, `bun run typecheck`, `bun run test`
  and `bun run build`, as CI does. Fix lint findings without inline
  suppressions; `bun run fix` applies what it can. `bun run test` needs the
  development stack's Postgres, Mailpit and SeaweedFS (see
  [Development stack](#development-stack)). It does not run the end-to-end
  tests: run `nx run peal-e2e:e2e` too when a change touches the pages they
  visit (see [End-to-end tests](#end-to-end-tests)).
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
  `packages/peal-cli/scripts/build.ts`.
- Pin every dependency to the exact latest release, and commit `bun.lock` with
  dependency changes, `packages/peal-infra/uv.lock` with Python ones. The
  SDKs' manifests are the exception (see [SDKs](#sdks)).
- A change to the contract regenerates the SDKs in the same change:
  `bun run sdk:generate` (Docker), then `bun run sdk:build`. CI's `sdks` job
  fails while they are stale.
- `bun run test` also runs ansible-lint (production profile),
  `ansible-playbook --syntax-check` and the pytest suite in `tests/` on
  `packages/peal-infra`, through uv (`nx run peal-infra:test`). Its release
  and uptime tests run images in Docker (Postgres's base image, Gatus, Caddy,
  BusyBox), and skip without Docker. Each of its commands reads stdin from
  `/dev/null`: Nx gives every task the same stdin, a Node task reading it
  makes it non-blocking for all of them while it runs, and Ansible then
  refuses to start ("requires blocking IO"), which ansible-lint reports as
  "Unable to find a working copy of ansible executable".
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
and Next.js ships its docs in `packages/peal-web/node_modules/next/dist/docs`.

## Development stack

- Start Postgres, the S3 store (SeaweedFS), Mailpit and the telemetry stack
  with `bun nx run peal-docker:up`, which waits until every service is healthy.
  Stop it with `bun nx run peal-docker:down` (`-- --volumes` also deletes the
  data). The README lists the ports.
- Outside production, the server defaults every outside service to this stack:
  `PEAL_S3_*` to SeaweedFS, `SMTP_URL` to Mailpit, `PUBLIC_URL` to
  `http://localhost:3001`. Only `DATABASE_URL` has no default.
- Browsers upload media straight to the bucket: run
  `bun nx run peal-server:media-cors` once per bucket. It puts the upload CORS
  rule on the bucket `PEAL_S3_*` names, for `PUBLIC_URL` and
  `TRUSTED_ORIGINS`, keeps the bucket's other rules, and changes nothing when
  run again.
- Server tests run against the Postgres that `DATABASE_URL` names, and write to
  it. With the stack up, use
  `DATABASE_URL=postgres://peal:peal@127.0.0.1:15432/peal`. They read the
  emails they send from the stack's Mailpit (`SMTP_URL` and `MAILPIT_URL`
  override it), store media in its SeaweedFS under `tests/media/`
  (`PEAL_S3_*` override it), and call its stripe-mock (`STRIPE_MOCK_URL`
  overrides it). CI runs its own Postgres, Mailpit and stripe-mock, pinned
  by digest, and starts SeaweedFS from `compose.yaml`.
- Tests that share a database with a running dev server share its jobs: leave
  no post scheduled or job waiting when a test ends, or the dev server runs
  it. Give each run its own database or `PEAL_S3_KEY_PREFIX` when several run
  at once.
- To run a second stack beside another, set `COMPOSE_PROJECT_NAME` and the
  `PEAL_*_PORT` overrides listed in `packages/peal-docker/.env.example`.
- In `packages/peal-docker/compose.yaml`, pin every image (image mounts
  included) to an exact version, publish ports on 127.0.0.1 only, give every
  service a health check, and use synthetic credentials.
  `packages/peal-docker/test/compose.test.ts` enforces these rules, and checks
  that the server image uses the Bun in `.bun-version`, runs as nonroot, ships
  ffprobe, and pins every image it builds on or copies from by digest.
- `compose.production.yaml` follows the same rules, pins every image it pulls
  by digest at the version `compose.yaml` runs, gives every service
  `restart: unless-stopped` and the server `stop_grace_period: 75s`, and tags
  the images it builds `${PEAL_VERSION:-local}` (`PEAL_POSTGRES_VERSION` for
  Postgres). It passes optional settings through by name (`NAME:` with no
  value), so one that is unset stays unset rather than empty, which the
  server would read as set, and names every server setting the docs'
  environment variables page lists: a container sees no other. Every service
  runs `read_only` with `no-new-privileges`, writing to its volumes and tmpfs
  mounts only. The same test covers it, the web, static and
  Postgres images (CI's Node, the workspace's Bun, digests, nonroot) and
  `compose.self-host.yaml`, where Caddy alone publishes ports to the world.
- Keep `MP_SMTP_DISABLE_RDNS` on Mailpit, in compose and CI: its reverse DNS
  lookup otherwise stalls each SMTP greeting for about 10 seconds, and the
  email tests time out.

## Server architecture

The server follows DDD and Clean Architecture. Each bounded context in
`packages/peal-server/src/` has four layers, plus a `container.ts` that wires
them:

| Context         | Holds                                                                       |
| --------------- | --------------------------------------------------------------------------- |
| `publishing`    | posts, their channels and media, schedules, attempts, the platform adapters |
| `channels`      | connected accounts, connect flows, encrypted tokens and their renewal       |
| `media`         | uploads, storage, probing, alt text, files handed to platforms              |
| `workspace`     | accounts, workspaces, members, roles, API keys, OAuth                       |
| `notifications` | account emails, in-app notices, their emails, notification preferences      |
| `assistant`     | the writing assistant: prompts, language models, the daily quota            |
| `shared`        | the kernel the others build on                                              |
| `analytics`     | the posts it follows, snapshots of their counts, the hourly collection      |
| `billing`       | plans, subscriptions, entitlements, the billing page's usage                |
| `staff`         | the staff console: what staff read and do, and the audit log of it          |
| `webhooks`      | endpoints, their signing secrets, events, deliveries and the delivery log   |
| `legal`         | what French law has a host keep, and the legal requests that read it        |

- `domain`: entities and rules on Effect's core (`effect`: Schema, DateTime,
  Data). No HTTP, SQL, cluster, workflow, AI, Drizzle or Better Auth.
- `application`: use cases and the ports they need, as `Context.Service`.
  Imports its context's domain and the shared kernel.
- `infrastructure`: adapters behind the ports: Drizzle repositories, Better
  Auth, platform clients, workflows, crons and activities, storage, mail.
- `api`: `HttpApiBuilder` handlers for `peal-contract` groups. They get use
  cases from the context's `container.ts`, never from infrastructure.

`src/app/` is the composition root (`server.ts`, `cluster.ts`, `crons.ts`, the
MCP endpoint in `mcp/`) and `src/main.ts` the entry point. `ServerLive` builds
telemetry, the database pool, the migrations, the cluster, the contexts, then
the HTTP server and the workers; `AppLive` is the routes with their services
and no socket, for tests.

- Folders import each other through `#<context>/<layer>/…` (package.json
  `imports`); `../` imports are refused. `packages/peal-server/oxlint.config.ts`
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
  `PostIdSchema`, `PostTargetIdSchema`, `MediaAssetIdSchema`: branded
  lowercase UUIDv7s;
  `UserIdSchema`, `WorkspaceIdSchema`: the random lowercase UUIDs Better Auth
  issues), the platform list (`PlatformSchema`), the permission vocabulary
  (`access.ts`, `authorize.ts`), locales (`LocaleSchema`: en, fr), IANA zones
  (`TimeZoneIdSchema`), wall-clock time (`LocalDateSchema`, `LocalTimeSchema`,
  `WeekdaySchema`, `fromWallClock`), and how a platform call can end
  (`PublishResult`, `PublishFailure`, and `TokenRejected` for a token the
  platform refused before doing anything).
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
  forwards `/api/*` and `/.well-known/oauth-*` unchanged, so Peal has one
  public origin; `/openapi.json` is reachable on the server only.
- `GET /api/health` is liveness: keep it free of the database.
  `GET /api/ready` is readiness: `SELECT 1` within 2 seconds, otherwise
  `DatabaseUnavailable` (503).
- `Authentication` tries a bearer token (an OAuth access token issued for
  `PUBLIC_URL/api`, or a workspace API key starting with `peal_`), then the
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
- Put the signed-in user's own groups, which span workspaces (notices,
  notification preferences), under `/api/me/…` with `Authentication` alone,
  in `WorkspaceGroupsLive` too. They answer 403 to API keys, which belong to
  a workspace, and to OAuth tokens bound to one workspace. Those that act on
  the account itself (its export, its deletion, connected applications) and
  deleting a workspace answer only the person in their own session:
  `ownSession` (`workspace/domain/own-session.ts`) refuses OAuth tokens and
  staff impersonating them too. The export and the list of connected
  applications also answer Peal's command line (`ownSessionOrCommandLine`:
  the `peal-cli` client, its token bound to no workspace), which saves them
  in the user's files; no MCP tool hands them out, as an MCP client passes
  what it reads to an AI model.
- Handlers turn `CurrentMember` into an `Actor` with `actorOf`
  (`#shared/api/actor.ts`). Use cases that act for someone take that `Actor`
  and check it with `authorize`: permissions are `resource:action`
  (`post:schedule`, `channel:connect`, `media:upload`…).
- Map each use case error to a contract error. A failure of the server's own
  (the database, a bug) is a defect: 500. A handler that maps an outside
  failure to 503 logs it as a warning first.
- The staff console's group (`StaffApi`, under `/api/admin`) has
  `StaffAccess` alone, in `WorkspaceGroupsLive`: staff in their own session,
  from the session cookie read fresh, and a trusted `Origin` for writes.
  Anyone else, an API key, an OAuth token or staff impersonating someone
  included, gets 404 (`HttpApiError.NotFound`), never 401 or 403, so the
  console never tells it is there. `StaffStanding` decides, from the role
  and the ban the database holds now.
- `POST /api/client-errors` (`ClientErrorsApi`, in `src/app/client-errors/`)
  needs no credentials. `ClientErrorIntake` counts 30 reports a minute per
  address (`AUTH_IP_HEADERS`, else the connection's), in this process, and
  reads the body with a 16 KiB limit before it is decoded; the handler
  replaces addresses, ids, keys, tokens and the queries of the links they
  quote, drops control characters, logs at error level with OpenTelemetry's
  attribute names (`event.name` `peal.client_error`) and counts in
  `peal.client_errors`. Never log more of a report than its schema holds.
- Handler tests through `HttpApiTest.groups` provide `securityTest(member)`,
  `anonymousSecurityTest` or `staffSecurityTest(userId)` from
  `#workspace/api/security.ts`: `HttpApiTest` serves every group, so each
  provides every middleware (nobody is staff in the first two, and the
  error report intake lets everything through). The CLI's in-memory test
  server (`packages/peal-cli/test/support.ts`) serves every contract group:
  add new endpoints there too.

### Accounts and access (workspace)

- Better Auth lives only in `src/workspace/infrastructure/auth/`. `makeAuth`
  in `options.ts` is its one configuration, and its routes are under
  `/api/auth`. Every plugin is always on and options that shape tables are
  constants, so every deployment has the same tables, but for two:
  Stripe's, registered only with `STRIPE_SECRET_KEY` (`auth-schema` generates
  its tables anyway, unused without it), and the captcha, which has none.
- Turnstile (Better Auth's captcha plugin) guards `/sign-up/email` and
  `/request-password-reset` when `TURNSTILE_SECRET_KEY` and
  `TURNSTILE_SITE_KEY` are both set; one without the other stops the
  server. `GET /api/captcha` gives clients the site key, and the web app
  shows the widget only then. Tests check tokens with Cloudflare's test keys
  against the fake siteverify in `test/workspace/fakes/fake-turnstile.ts`,
  through `TURNSTILE_VERIFY_URL`.
- Workspaces are Better Auth organizations. The five roles (owner, admin,
  editor, contributor, viewer) and their grants are in
  `workspace/domain/roles.ts`, translated for Better Auth in
  `access-control.ts`. A member holds exactly one role.
- `MembersApi` and `InvitationsApi` (`WorkspaceMembers`, over the
  `WorkspacePeople` port) list a workspace's members to every member in
  person, never an API key, and its pending invitations to those with
  invitation:create (owner invitations to owners only, as an invitation's
  id opens its link), and invite and revoke for a member in person, never
  staff impersonating them. `WorkspacePeopleLive` writes an invitation
  itself, under the workspace's advisory lock, following Better Auth's
  `/organization/invite-member` (one role, owners for owners, never to a
  member, replacing a pending one to the address, the pending limit and the
  plan's room) and sharing its constants and link (`invitationLifetime`,
  `pendingInvitationLimit`, `invitationUrl` in `options.ts`): change both
  together. The web app still invites through Better Auth's route.
- API keys belong to workspaces, never carry more than their creator holds,
  and are created only through `POST /api/workspaces/:workspaceId/api-keys`:
  Better Auth's own key routes are disabled.
- Staff (Better Auth's admin role) act through the staff context's use
  cases only (`StaffActions`): each checks `mayAct`
  (`staff/domain/account-rules.ts`), records an `AuditEvent` in
  `staff.audit_events`, then calls the admin plugin on the server with the
  staff member's cookies (`AccountModeration`). The admin plugin's routes are
  in `disabledPaths` but for `/admin/stop-impersonating`, which the
  impersonation banner calls: add none back. The console reads accounts and
  workspaces through `AccountDirectory`, each workspace's plan, channels and
  posts through `WorkspaceEntitlements`, `ChannelOversight` and
  `PostOversight`: metadata only, never a post's text or media.
- Staff may impersonate a member for an hour. They
  then lose the permissions `withheldWhileImpersonating` lists
  (`workspace/domain/membership.ts`), and Better Auth refuses them every route
  that changes a workspace or the account (name, language, password,
  sessions), grants an OAuth client access or approves a device code
  (`impersonation.ts`). They may write and edit drafts, not schedule or
  publish them: a scheduled post goes out after the impersonation ends, to
  the member's real accounts. What they write keeps the member as its author
  (`author_id`), and the audit log keeps the staff member behind it.
- Every request in an impersonation session goes through
  `ImpersonationGuard` (`workspace/application/impersonation-guard.ts`)
  before its handler, so no handler can skip it: `Authentication` (session
  cookies) for Peal's API, and Better Auth's before hook
  (`guardImpersonatedRequest`, browser requests only: its calls from Peal's
  API carry no request) for its routes. The guard reads the staff member's
  standing fresh on every request, reads included; once they are no longer
  staff or are banned, it deletes every session they impersonate in
  (`ImpersonationSessions`), records each end and answers 401, so removing
  the role in the database works at once. Each change it records
  (`impersonatedChange`) holds the staff member, the account, the
  workspace, the operation (`group.endpoint` from the contract, or
  `auth:/path`) and the ids the path or the body named (`objectIds`, only
  id-shaped values), recorded before the handler runs, refused or not;
  never a body or a query. Reads are not recorded. Stopping
  (`/admin/stop-impersonating`, `/sign-out`) records `stopImpersonating`;
  a ban or a sign-out everywhere that ends impersonations records
  `impersonationEnded` for each (`AccountModeration` answers with them).
  One left to run out is not recorded: it ends an hour after its
  `impersonate` event. The guard reaches the audit log through
  `ImpersonationLog`, which the staff context's `ImpersonationAudit` backs.
  Bearer tokens never carry an impersonation, so MCP tools, the CLI and API
  keys never act for staff. A new route that changes something under a
  cookie session needs nothing more; one outside `Authentication` and
  `/api/auth` must call the guard itself.
- Workspaces and accounts are deleted through Peal's API only
  (`DeleteWorkspace`, `CloseAccount`): Better Auth's `/organization/delete`
  and the admin plugin's `/admin/remove-user` are disabled and its
  `/delete-user` stays off, as they would leave the other contexts' data.
  Both lock the workspaces they read (`AccountStore.standings`, `workspace`)
  before deciding, so closures, joins and deletions take turns. Each context
  hands its records of a workspace or a user to the workspace context
  through an application port (`ChannelRecords`, `PostRecords`,
  `MediaRecords`, `NoticeRecords`, `UsageRecords`, `AnalyticsRecords`,
  `BillingRecords`, `StaffRecords`, `WebhookRecords`, in the shapes of
  `#shared/application/personal-data.ts`),
  which `ContextRecords` reaches. The rows go in one TransactionRunner
  transaction, Better Auth's included (the server's Drizzle on the `auth`
  tables, the Stripe plugin's `subscription` too), and the workspace's media
  folder once it commits. A context that keeps new data about a workspace or
  a user adds it to its records, and its tables to
  `test/workspace/integration/erasure.test.ts`, which fails on a table that
  does not say what becomes of its rows (deleted, left without the user, or
  kept because they name nobody).
- Erasing workspaces takes two steps, as Stripe cannot be rolled back.
  First, outside any transaction, `ContextRecords.settleWorkspaces` checks
  every workspace the deletion erases: it refuses while one of their posts
  goes out (`PostRecords.ensureErasable`), and, without the person's
  agreement (`cancelSubscriptions`, in `DeleteWorkspaceSchema` and
  `DeleteAccountSchema`), while Stripe may bill any of them, listing every
  subscription at once. `BillingRecords.billedBy` finds what may bill
  (`stillBills`, a status the Stripe plugin's `auth.subscription` holds that
  `billsAt` bills, as a checkout can complete before Stripe's events come);
  `settleWorkspace` then expires the workspace's open Checkout Sessions
  (`Checkouts`, which the workspace context's `StripeCheckoutsLive` backs),
  refuses when Stripe itself holds a subscription that may bill
  (`Checkouts.atStripe`, as a checkout completed unseen leaves one) and,
  agreed, cancels each one once (`Checkouts.cancelBilled`, with an
  idempotency key per workspace and subscription), at once,
  `prorate: false` and `invoice_now: false`. `DeleteWorkspace` checks the
  typed name before it. Then the erasure's transaction erases posts first,
  which refuse while one goes out, and billing last, which asks Stripe again
  and refuses while anything still bills, as a checkout completed in between
  would. `DeleteWorkspace` and `CloseAccount` answer `WorkspaceSubscribed`
  (409) with each subscription's workspace, plan and `paidUntil`, which the
  web app's dialogs list (`SubscriptionCancellation`) until the box is
  ticked. The period paid for is not refunded, except where the law gives
  a refund (a consumer who withdraws within 14 days of subscribing): every
  surface that says so says that too. The Stripe customer and its invoices
  stay with Stripe (accounting law keeps invoices 10 years). Stripe's
  event for a cancellation is recorded under the workspace's row
  (`Checkouts.holdWorkspace`, FOR KEY SHARE, in `RecordSubscription`'s
  transaction): one that comes during the erasure waits for it, then finds
  no workspace and is left alone. Stripe not answering is
  `BillingUnavailable` (503). A failure after settling, as the transaction
  failing, leaves the workspaces, on the free plan once Stripe's events
  come, is logged, and answers `DeletionIncomplete` (500, how many
  subscriptions were cancelled; `reportCancelledFirst`) rather than the
  bare failure; deleting them again cancels nothing more. The owner is emailed
  (`AccountMail.workspaceDeleted`, `deleted`), saying what was cancelled,
  and each erasure is logged by id (`event.name` `peal.erasure`). Each is
  also written to the erasure ledger (`ErasureLedger`, `S3ErasureLedger`:
  one JSON object under `erasures/` in the media bucket, or the bucket
  `PEAL_ERASURE_LEDGER_BUCKET` names; never the backups', whose
  credentials the server must not hold), as a restore of the database
  brings erased data back and rewinds whatever the database recorded: ids
  and the time only (`workspace/domain/erasure-ledger.ts`, persisted
  contract), unconfirmed as the last step of the erasure's transaction
  (`recordErasure`: no ledger, no erasure, 503 `MediaStoreUnavailable`),
  confirmed once it commits (`confirmErasure`), discarded when it fails
  (`discardOnFailure`), so no entry names what was not erased.
  `ReplayErasures` (`bun src/replay-erasures.ts`, `nx run
  peal-server:erasures:replay`, in the image too) applies it again after a
  restore, before the server starts: what the ledger names and the
  database still holds, each entry in its own transaction, without
  settling Stripe or emailing anyone, holding a closed account's identity
  as closed at the entry's time, leaving unconfirmed entries unless
  `--apply-unconfirmed`, and failing when one is refused. Run twice, it
  changes nothing more. A new way to erase a workspace or an account goes
  through the ledger; an erasure the ledger does not cover (a platform's
  data deletion callback, a single post) comes back with a restore. The
  `workspace.erasure-ledger-retention` cron drops entries after 42 days,
  longer than backups hold deleted data: keep it so
  (`data-processing.test.ts`). Closing an account leaves the
  posts its user wrote in the workspaces that remain without an author
  (`PostRecords.forgetAuthor`: `author_id` has no foreign key), and drops the
  connections and account choices they had in progress
  (`ChannelRecords.eraseUser`), and the sessions they opened as staff to act
  as someone else. The channels they connected, with the Facebook user a
  Page's token rests on (`granted_by`), stay with their workspaces, which
  erasing deletes. `data_deletions` names nobody, and stays. In the staff
  audit log (`StaffRecords.forgetUser`), the events about the account lose
  its id, the reason given (a ban's or unban's keeps it, with a keyed
  pseudonym of the account's email instead of its id, `target_pseudonym`,
  until the same 5-year cutoff), their workspace and object ids, and its id
  leaves the object ids of every other event; the events its user made as staff keep
  their id, a legitimate interest: the operator answers for what staff did
  to other people's accounts; their workspace, operation and object ids
  stay too. The log keeps an event 12 months, impersonation records
  included, a ban or unban 5 years (art. 2224 Code civil: the time to sue over it) or 12 months past a longer ban's end, a
  ban until lifted as long as it holds: 12 months past a later unban, or
  once its account is closed (`staff/domain/audit-retention.ts`); the `staff.audit-retention` cron
  (`PurgeAuditLog`) deletes the rest daily, the log's one deletion besides
  `forgetUser`. YouTube's upload journal goes with its
  publication calls, and `publishing.quota_usage`, the server's daily
  units, names nobody.
- Peal Cloud is a host under French law (loi n° 2004-575, art. 6, I, 2
  now names the DSA's hosting services, which store what users give them,
  public or not), so it keeps what identifies whoever contributed content
  (art. 6, V, A; décret n° 2021-1362), in the `legal` context and its own
  Postgres schema, which no other code reads. `ConnectionJournal`
  (`workspace/application`, backed by `LegalRecords`) keeps each request
  that changes posts or media and succeeds, whatever authenticated it
  (`Authentication`, both paths, and `mcpAuthentication` for the MCP tools
  that change posts, which `app/mcp/server.ts` names from their
  annotations): when, the address as Better Auth reads it (full IPv6), the
  protocol of `PUBLIC_URL` and how it signed in, never what it carried, 1
  year. `CloseAccount` reads `AccountStore.identification` (name, email,
  each sign-in method's account id, never a password or its hash, the Stripe
  customers of the account and of the workspaces it deletes) before it
  erases anything, and keeps it (`ContextRecords.holdIdentification`) in
  the same transaction, last: no account closes without it, and nothing
  else of it stays. The `legal.retention` cron (`PurgeLegalRecords`) empties
  how they signed in and paid after 1 year, deletes the rest after 5, each
  connection after 1, and each answer to a legal request after 5
  (`legal/domain/legal-retention.ts`). Only `LegalRequests` reads them,
  for staff who also hold the legal role (`legal` beside `admin` in Better
  Auth's comma-separated `role`, `LegalOfficers` from `StaffStanding`;
  other staff get 404 too) (`POST /api/admin/legal-requests`, `LegalApi`,
  StaffAccess), recording the answer (staff, authority, reference, legal
  basis, subject, what it covers, counts) in the transaction that reads
  it, and in the staff audit log (`legalDisclosure`, through the staff
  context's `LegalDisclosureAudit`), so the rest of staff see it. A
  request names what it asks for (`covers`: identity, signIn, payments,
  connections, and the connections' period), and the answer holds nothing
  else (`disclosedOf`, `legal/domain/legal-scope.ts`): a category not
  covered is null. `GET …/legal-requests` lists the answers given, never
  what was handed over, and `…/standing` tells the console who answers
  them. The export carries the user's connections
  and what closing would leave (`legalHold`). The software keeps none of
  it unless `PEAL_LEGAL_RETENTION=true`: only an operator the law obliges
  may hold it (GDPR minimisation), so the default is off
  (`LegalRecords.layerOff`: nothing is written to the `legal` schema, and
  `legalHold` is null), and `peal-infra` turns it on for Peal's servers
  (`peal_legal_retention`). A server that turns it off after it was on
  keeps what it holds until its term: the purge cron and `LegalRequests`
  run whatever the setting, and `legalHold` still lists the connections
  held. A new way to change content (a group, a tool) goes through the
  journal too.
- `AccountData` exports what is tied to the user, the posts they wrote in
  the workspaces they share (`exportAuthored`), and the content of the
  workspaces where they are the only member, with their analytics and
  billing state (plan and subscription statuses, never a card or Stripe's
  ids): those `CloseAccount` deletes. Posts come with each target's
  platform options and whether YouTube kept the video private, and the
  export lists what staff did to the account (action, time, reason, and
  for changes made as it the operation, workspace and object ids),
  without who did it. Sessions staff opened to impersonate
  the user are left out, as Better Auth's own list leaves them out: their
  browser and address are staff's. Each media file the store holds comes
  with a link that downloads it for 7 days (`downloadUrl`), and each export
  is emailed to the account (`AccountMail.exported`, saying web or command
  line), so a copy taken with a stolen session or a phished device code is
  noticed. Closing an account is refused while its
  user alone owns a workspace others use (`planClosure`), and its
  confirmation is emailed in their language. `PasswordCheck` checks a
  password three times within 10 seconds per account at most, as Better
  Auth's own routes do.
- The export carries what GDPR Article 15(1) lists (`about`): each
  category's purposes, legal basis, retention and source, the recipients,
  the rights and how to exercise them, in the account's language. It is
  written (`workspace/api/about.ts`) from one registry,
  `peal-contract/data-processing` (`processingRegister`,
  `retentionPeriods`), which the privacy policy's retention table
  (peal-site, en and fr, row for row: `test/privacy-retention.test.ts`),
  the docs' figures (`{{keep-…}}` variables, `retention-variables.ts`) and
  the production stack (`peal-docker/test/retention.test.ts`) follow too;
  `test/workspace/api/data-processing.test.ts` compares each period with
  the rule that enforces it. Change a period in its rule and the registry
  together, then the policy's table; a new kind of personal data gets a
  category there. What only the operator knows (controller, policy URL,
  sub-processors, supervisory authority, its own logs' and backups'
  retention) comes from the JSON file `PEAL_PRIVACY_DECLARATION_FILE`
  names (`PrivacyDeclaration`, `workspace/domain/operator-declaration.ts`),
  null in the export until declared: never write a provider on a guess,
  in the software, the policy or `peal_privacy_declaration` (peal-infra).
- Better Auth is also the OAuth authorization server for the CLI (device
  grant, the `peal-cli` public client registered at startup) and MCP clients
  (authorization code with PKCE, and dynamic registration when
  `MCP_DYNAMIC_REGISTRATION=true`). Access tokens are JWTs that last 15
  minutes and are checked locally; refresh tokens rotate, and one sent again
  within 30 seconds gets the same answer, while later reuse revokes that user
  and client's refresh tokens.
- An MCP token is bound to the workspace the user picked (`workspace_id`
  claim). Access tokens must carry a workspace scope
  (`workspace/domain/oauth-grant.ts`): `workspace:read` (reading only),
  `workspace:write` (what the role allows, but what puts posts out) or
  `workspace:publish` (reading, and `publishingPermissions`: post:schedule,
  post:approve, post:publish, so scheduling, moving, publishing, reposting,
  cancelling, unscheduling and confirming). Publishing is a grant of its
  own: the consent page lets the person leave it out, a token issued before
  it existed publishes nothing, and `scopeFor` names the scope a permission
  takes. Never fold it back into `workspace:write`.
- When `PUBLIC_URL` is neither HTTPS nor a loopback host, the server runs the
  plain OAuth provider without the MCP resource: the CLI signs in, the MCP
  endpoint refuses every request, and startup logs a warning.
- Better Auth's tables live in the Postgres schema `auth`, in
  `src/workspace/infrastructure/auth-schema.generated.ts`, which
  `nx run peal-server:auth-schema` writes from the real options. Rerun it after
  changing those options or upgrading Better Auth, then `db:generate`.
  `auth-schema-check`, a dependency of the server's tests, fails when the file
  is stale.

### Channels

- Channel tokens are encrypted with AES-256-GCM through `Aead`: a keyring read
  with `Config.Redacted("PEAL_TOKEN_KEYS")` (comma-separated `keyId:base64key`
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
  when the server has a client for it, LinkedIn and X when the operator set
  their app (`<PLATFORM>_CLIENT_ID` and `_CLIENT_SECRET`, read by
  `oauthClientConfig`; one half alone stops the server), Facebook Pages and
  Instagram through a Page with `META_APP_ID`/`META_APP_SECRET`, Instagram
  through Instagram Login with `INSTAGRAM_APP_ID`/`INSTAGRAM_APP_SECRET`,
  Threads with
  `THREADS_APP_ID`/`THREADS_APP_SECRET`, TikTok with
  `TIKTOK_CLIENT_KEY`/`TIKTOK_CLIENT_SECRET` (`oauthClientConfig`'s
  `idSuffix`), YouTube with `YOUTUBE_CLIENT_ID` and `_CLIENT_SECRET` (a
  Google OAuth client). A platform without its settings is in
  `unconfigured`. Each declares its `TokenPolicy`, data in
  `channels/domain/token-policy.ts`, which the refresh sweep and the
  reconnect warnings follow: LinkedIn's tokens are not renewed and expire
  after 60 days, X's last two hours and rotate on refresh, as TikTok's do
  (`expires_in` decides; refresh tokens end 180 days after sign-in),
  Google's last an hour and do not rotate, Threads' and Instagram Login's
  (`instagramLogin`) last 60 days and renew themselves a week ahead. A
  refreshable policy's `sweep` renews tokens `beforeExpiry` (`ahead` of it)
  or keeps them alive (`keepAlive`: only once `unused` that long past their
  expiry, the access being renewed when a call needs it, through
  `ChannelAccess`). X's, TikTok's and YouTube's keep alive after 30 days,
  rather than being renewed ahead of every expiry: a hours-long token is
  never swept `beforeExpiry`, which would refresh every channel a dozen
  times a day (a test lists each policy's sweep).
- `RefreshChannelTokens.sweep` (every 10 minutes) and
  `WarnChannelsNeedingReconnect` (daily) page through what is due by
  cursor (`dueForRefresh`, `needingReconnect`: `after`), never with a cap,
  which would leave the same channels behind at every run. The sweep takes
  the tokens about to lapse before the keep-alives, three channels at a
  time (one channel lock stays free for a post's renewal), and stops
  starting refreshes at its budget (8 minutes): it then logs a warning and
  sets `peal.channels.token_sweep.left` (with `.duration` and
  `.unfinished`). No publish depends on it: `ChannelAccess` renews an
  expired refreshable token however long ago it ran out.
- TikTok's Login Kit for Web takes no PKCE (TikTok asks it of desktop and
  mobile apps only): the state, bound to member and workspace, guards the
  callback, and a token answer naming an `error` is a refusal whatever its
  status. A `PlatformAuthorizer` may have `revoke` (TikTok's guidelines ask
  for it; Google takes it), which `DisconnectChannel` calls once the
  channel is deleted and no other channel, in any workspace, connects the
  same account (`ChannelRepository.accountInUse`), waiting 10 seconds at
  most and logging any failure.
- `platformRegistrations` (`infrastructure/platforms/platform-addresses.ts`)
  lists every address a platform is given or reads (redirect URIs, Meta's
  data deletion and deauthorize callbacks, Bluesky's documents), from the
  authorizers' callback paths and the contract's routes;
  `nx run peal-server:platform-addresses` prints it, in the image too. A
  platform that gains a sign-in or a route its servers call joins it, with
  the settings that hold its app: `test/channels/container.test.ts` and
  `platform-addresses.test.ts` fail otherwise, and the infra's
  `test_cloudflared.py` when the sandbox's `peal_access_bypass_paths`
  would stop one. Docs point at the command rather than list addresses.
- `GET …/channels/platforms` (`ConnectChannel.connectable`, channel:connect)
  lists the platforms the server has an authorizer for, every platform's
  through the one registry; the web app's connect forms offer only those.
  Map a platform's own denial codes (LinkedIn's `user_cancelled_*`) to
  `AuthorizationDenied` in `connect-channel.ts`.
- Facebook Pages and Instagram share Facebook Login
  (`infrastructure/platforms/meta/facebook-login.ts`): a long-lived user
  token lists the user's Pages with their tokens, which never expire; an
  Instagram professional account posts with its Page's token. Their
  `complete` answers an `AccountChoice`: `ConnectChannel.complete` connects a
  single account at once, reconnects a channel's own, or keeps the accounts
  encrypted (`connect_choices`, `choice:<selection>`, 15 minutes, used once)
  for `choose`, which puts a choice back when it fails before connecting
  any account. `IssuedTokens.grantedBy` keeps the Facebook user a Page token
  rests on, in `channels.granted_by`. Threads has its own OAuth: a 60-day
  long-lived token that renews itself. Every Graph call through Facebook
  Login carries `appsecret_proof`
  (`#shared/infrastructure/platforms/meta-graph.ts`).
- Instagram has two ways in, one platform with a connection kind
  (`InstagramConnectionSchema` in `#shared/domain/instagram-connection.ts`,
  copied by the contract): `instagramLogin`, the default, and
  `facebookLogin`, through a Page. Channels, attempts and choices keep it
  (`connection`, null on other platforms; an Instagram row without one
  came through Facebook Login, `storedConnection`), and it picks the
  authorizer (`PlatformAuthorizers.for(platform, connection)`; for a new
  account without one, the first of `instagramConnections`, Instagram
  Login when configured), the token policy, the refresh, the publishing
  host and the insights scope. Everything else (text and media rules,
  options, analytics' list) is the platform's, so a channel can move
  between the two: connecting an account the workspace has through the
  other way reconnects its channel there. Instagram Login
  (`meta/instagram-login-authorizer.ts`, Business Login for Instagram:
  `www.instagram.com/oauth/authorize` with `force_reauth`, the code on
  `api.instagram.com`, then `ig_exchange_token` and `ig_refresh_token` on
  `graph.instagram.com`) needs `instagram_business_basic` and
  `instagram_business_content_publish` and asks for
  `instagram_business_manage_insights`, which a member may decline; its
  account id is `/me`'s `user_id`, and its `grantedBy` the app-scoped `id`,
  read again before each refresh so the renewed token keeps it. Its calls
  carry no `appsecret_proof`: the token is the Instagram app's.
- YouTube connects through Google's OAuth 2.0 web server flow
  (`infrastructure/platforms/youtube/youtube-authorizer.ts`): PKCE, offline
  access, `prompt=select_account consent`, and the scopes `youtube.upload`
  and `youtube.readonly` only; a sign-in that withheld one is
  `AuthorizationDenied`. The token is the channel's the owner picked on
  Google's chooser (brand accounts too), so `complete` answers the channels
  `channels.list?mine=true` lists as an `AccountChoice`: one connects at
  once, none is `NoAccountsToConnect`.
- Meta's data deletion callbacks (`POST /api/data-deletion/:app`, no sign-in)
  check the `signed_request` HMAC with the app's secret (`SignedRequests`),
  delete the channels the user granted or owns in every workspace, and the
  account choices their sign-in offers (`connect_choices.granted_by`), record
  only the code, counts and the SHA-256 of the signed request
  (`data_deletions`), and answer the status page
  `PUBLIC_URL/data-deletion/<code>`. The same signed request sent again
  answers its first receipt and deletes nothing more. Each app (`facebook`,
  `instagram`, `threads`) answers for the channels it signs in
  (`channelsSignedInWith`): an Instagram Login channel only to `instagram`,
  which may name it by its grant or its account id. Their deauthorization
  callbacks (`POST /api/data-deletion/:app/deauthorize`,
  `DeauthorizePlatformUser`) mark those channels `refreshNeeded` under
  their locks and tell their workspaces; a channel changed after the
  request's `issued_at` is left alone, so a replay marks nothing reconnected
  since.
- `ConnectChannel` stores each attempt under the SHA-256 of its state, bound
  to the member, the workspace and the platform, for 15 minutes, completed
  once. One channel per platform account per workspace: connecting an account
  again reconnects its channel. Reconnecting adds no channel, so no plan
  limit refuses it, and its contract lists none.
- No route turns a channel off or back on (`disable` and `enable` are domain
  rules only), and reconnecting leaves a channel turned off as it is: notices
  and docs tell members to disconnect it and connect the account again.
- Any request to a host a user chose (a Mastodon instance, the servers a
  Bluesky DID names) goes through `publicHttpClient` or `publicFetch` from
  `#shared/infrastructure/platforms`: HTTPS on the default port only,
  addresses that are public after DNS resolution, no redirects, answers cut
  off past 1 MiB, 20-second timeout, no trace context. Tests swap the
  `OutboundGuard` for an open one only to reach loopback fakes.
- The AT Protocol OAuth client runs on Bun only with the handle resolver built
  on Peal's guarded fetch; its default one needs Node's undici.
- Refresh a channel's tokens only inside `ChannelLocks.withLock` (Postgres
  advisory locks). A process holds at most four at once, each on a pool
  connection, so never nest `withLock`. Bluesky and X refresh tokens work
  once.
- Other contexts get a working token only from `ChannelAccess`
  (`channels/application/channel-access.ts`). `withToken` decrypts it,
  renews it under the channel's lock when it is due or the platform refused
  it once (reusing a token another call renewed meanwhile), and runs the call
  outside the lock, so never call it inside `withLock`. When renewing fails
  for good, or the renewed token is refused too, it marks the channel
  `refreshNeeded` and tells the workspace through `ChannelNotices`.
- A platform failure is temporary (`PlatformUnavailable`) when any server on
  the way answered 5xx or 429; only the platform's own refusal marks a channel
  `refreshNeeded`.
- A platform that refuses the server's app until its operator pays (X: 402
  once its pay-per-use credits are used up, `usage-capped` at its spending
  cap) is the operator's problem, never the post's or the account's: the
  adapter fails with `PlatformUnavailable` and a code of
  `operatorRefusalCodes` (`#publishing/domain/own-refusals.ts`), and the
  policy keeps the target waiting, retried every 30 minutes until 24 hours
  after its scheduled time (`operatorRefusal`), then fails it as
  `appBillingLimit`. These attempts use none of an outage's retries
  (`earlierRefusalsOf`). `publishAttemptRun` tells `OperatorAlerts` of
  each: `LoggedOperatorAlerts` counts it (`peal.publishing.app_refusals`)
  and logs an error (`event.name` `peal.app_refused`) at the first, then
  once an hour per code, never per post, which Grafana's `peal-app-refused`
  rule reports. A refresh answered so leaves the channel's token alone.

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
  `test/publishing/infrastructure/fixtures/persisted` and
  `test/notifications/infrastructure/fixtures/persisted` decoding.
- `PublishPostV1` sleeps durably until the instant, claims the post for its
  schedule revision, runs one `PublishTargetV1` per channel, then finishes the
  post. Each attempt writes and commits its journal row
  (`publishing.publication_calls`) before calling the platform.
- A post whose outcome is unknown is marked unconfirmed, never retried blindly:
  the user checks the platform before reposting.
- Erasing a workspace's posts (`PostRecords`) stops its scheduled jobs in the
  same transaction, and is refused while one of its posts is publishing.
- A post keeps how it was created and last scheduled (`PostAttribution`,
  `#publishing/domain/post-origin.ts`): in the web app, with an API key or
  through an OAuth application (`Actor.subject.clientId`), with the key's or
  the application's id and the name it had then (`PostOrigins`, backed by
  the workspace context's `CredentialNames`), and which member scheduled it
  (`scheduled_by`). `created_via` and `scheduled_via` are JSON the domain
  decodes: persisted contract (`fixtures/persisted/posts/origins.json`).
  The post view shows it, the export holds it without who, `forgetAuthor`
  clears `scheduled_by`, and no adapter is handed any of it.
- `PostScheduling.send` (`posts.send`, `create_post`, `peal post`) creates
  and schedules in one call; "now" is the current instant, through every
  rule a later time goes through. With an `Idempotency-Key`
  (`IdempotencyKeys`, `publishing.idempotency_keys`: SHA-256 of the key and
  of the request's canonical JSON, per workspace, never either), the same
  key and body within 24 hours (`idempotencyKeyLifetime`) answer the first
  post, checked before anything else so a retry after the post went out is
  not told its time passed; another body is `IdempotencyKeyReused`. The key
  is claimed in the transaction that saves the post, so requests sent
  together make one. The `publishing.idempotency-retention` cron purges.
- Scheduling answers every violation at once: the platforms' rules and the
  accounts' own (`AccountRules`) in one `PostContentRejected`.
- A post's author is the member who created it (`authorId`, none for an API
  key). Drafts are listed newest first (`PostQueries.listDrafts`) and
  discarded by deleting them, which needs post:delete, or post:update for
  their author (`mayDiscard`). `PostScheduling.unschedule` takes a scheduled
  post back to draft: its revision goes up and its job is interrupted. A job
  that wakes for a post or target since deleted, by a member or by erasure, is
  superseded.
- `PostFollowUp` reposts a failed or unconfirmed target, in its next round:
  a `PublishTargetV1` with no parent (`PublicationScheduler.repost`), which
  reopens a finished post; the last target to settle finishes its post, in
  `recordTargetRun`, or cancelling it does when nothing is left to send. A
  repost's rate-limit deadline counts from the repost. `confirm` records
  what a member found for an unconfirmed target and revises the outcome.
  Both call `PublicationOutcomes.resolved`.
- Refusals Peal makes itself, before any platform call (a channel
  disconnected or turned off, media deleted), carry the codes of
  `#publishing/domain/own-refusals.ts`; the policy maps them to their own
  failure reasons (`failureReasonOf`). Add a reason to the domain, the
  contract, the notices' events, the email catalogues and the web strings
  together.
- Platform calls go through the `PlatformPublisher` port, one at a time per
  channel through `ChannelGate`, whose calls are volatile: post content never
  lands in the cluster tables. The gates run `RoutedPlatformPublisher`, which
  reads the post, takes its text on the channel and hands it to the
  platform's `PlatformClient`; tests use `FakePlatformPublisher`. A whole
  publish runs inside the gate: uploads, processing waits, token renewal,
  the post and its confirmation.
- Platform adapters live in `publishing/infrastructure/platforms/<platform>/`
  (Mastodon, Bluesky, LinkedIn, X, TikTok and YouTube, and Threads,
  Instagram and Facebook Pages in `meta/`), beside `ChannelGate`, and implement the steps of
  `publishing/application/publication-steps.ts`, which `sequenced` runs:
  `prepare` uploads the media (safe to repeat: media alone shows nowhere),
  `poll` waits while the platform processes it (15 minutes at most),
  `commit` is the one request that makes the post live (fail with
  `OutcomeUnknown` when it may have), and `confirmation` says how to read the
  post back: `lookUp` by a key chosen before the commit (Bluesky's record
  key) or by what `prepare` made when the run still has it (a Meta
  container, published once at most: `PUBLISHED` found, `FINISHED` absent),
  or by a search that answers `found` or `unknown`, never `absent`, so the
  post is never sent again (X's recent posts, by text, links and files;
  Facebook Pages', by text, as they keep no key); `resend` with the
  attempt's idempotency key within the window the platform keeps it
  (Mastodon: 50 minutes of its hour); or `none`, unconfirmed at once
  (LinkedIn members' posts cannot be read back).
- YouTube's adapter (`platforms/youtube/`) uploads with the resumable
  protocol, in parts of a multiple of 256 KiB from the media stream
  (`fromByte` skips what YouTube already has). It journals the session URL
  (`UploadSessions`, `publishing.upload_sessions`, keyed by the call's
  idempotency key and cascading with it) and commits it before any byte,
  marks `final_part_sent` before the part holding the last byte, and
  records the video id once made, clearing the URL. Its `lookUp` reads that
  journal and asks the session (`bytes */size`): 308 or no row is `absent`
  (the commit then resumes from the `Range`), 200/201 `found`, an expired
  session `absent` only while no last part left, and a journal it cannot
  read, or a status YouTube refused for the moment (a rate limit),
  `unknown`. After the upload only YouTube's `failed`/`rejected` refuse the
  post: nothing that could make a retry upload twice. Each upload first spends a unit of the server-wide
  ledger (`PlatformQuota`, `publishing.quota_usage`, by Pacific day,
  `YOUTUBE_DAILY_UPLOADS`); past it, or on `quotaExceeded` and
  `uploadLimitExceeded`, it fails as `RateLimited` with that code
  (`dailyLimitCodes`) until Pacific midnight, which the policy ends as
  `quotaExceeded`. A video YouTube made private against the options is
  `Published.keptPrivate`, kept on the target and shown on its page.
- No adapter holds a whole file: large uploads go in parts read one at a
  time from the media stream (`inParts` in `platforms/byte-parts.ts`:
  LinkedIn's video parts, X's 4 MiB appends, TikTok's and YouTube's
  chunks), and a file a platform takes in one request is streamed with
  `streamedBody` (`#shared/infrastructure/platforms/public-http.ts`), in a
  form with `multipartBody` (Mastodon), never `Stream.mkUint8Array` or
  `FormData` (only Bluesky's images, 2 MB at most, are read whole).
  `streamedBody` names the length, which the public client's fetch sends
  as Content-Length: Effect's fetch client drops that header, and a body
  sent chunked is refused by some servers. `limitedUploads`
  (`publishing/infrastructure/upload-slots.ts`) opens so many files above
  16 MiB at once (`PEAL_MAX_CONCURRENT_UPLOADS`, by default one per GiB of
  memory, 2 to 8); the others wait inside their gate, where no timeout
  runs before the upload begins. LinkedIn calls name `Linkedin-Version`
  (`LINKEDIN_API_VERSION`, a default a test keeps within ten months), and
  send the member's token to LinkedIn's hosts only.
- Meta's adapters hand Meta public media URLs (`MediaForPublishing.publicUrl`,
  two hours), check the daily publishing quota before Threads and Instagram
  containers (Instagram's on the host its channel's connection names, from
  `PublishingAccount.connection`, the same container flow on both), and read Graph refusals with
  `#shared/infrastructure/platforms/graph-refusal.ts`, whose rate limits wait
  as long as `X-Business-Use-Case-Usage` says.
- Derive whatever an adapter sends from the request's `idempotencyKey` and
  `startedAt`, which every run of an attempt shares.
- An adapter whose publish is several requests that the `sequenced` steps
  cannot model implements `PlatformClient` itself and journals its progress
  on the call's row (`PublicationProgress`, `publication_calls.progress`:
  ids and states, never content), committed before each request that can
  make the post live; a resumed run reads it. TikTok's
  (`platforms/tiktok/`): a FILE_UPLOAD goes live only with its last 10 MB
  chunk, so `uploading` starts over and `finishing` polls status/fetch; a
  PULL_FROM_URL init is the commit, so `pulling` without an answer is
  unconfirmed, `pulled` polls. Its steps (`TikTokProgressSchema`) are
  persisted contract (`fixtures/persisted/publication-calls`). TikTok's
  post ids are int64s: read them from the answer's text, never as JSON
  numbers. A post only its creator sees has no public id: it is published
  under its `publish_id`, without a permalink.
- Scheduling asks `AccountRules` what each channel's own account refuses
  (TikTok's creator info: audiences, interactions, longest video; photos on
  a server without `TIKTOK_MEDIA_URL_PREFIX`), and lets the post through
  when the platform cannot say: the adapter checks again. Tests that need
  none pass `AccountRules.none`, `publishingWith`'s default.
- Adapters get tokens only through `PlatformCredentials`, which
  `ChannelAccess` backs (`ChannelAccessCredentials`), and media only through
  `MediaForPublishing`, which the media context's `MediaForPlatforms` backs:
  ready assets of the post's workspace. Fail with `TokenRejected` only when
  the platform refused the token before doing anything: the token is renewed
  and the call made once more. Mastodon's adapter takes a 401 or 403 as a
  refused token only with Mastodon's JSON error; without it, a proxy on the
  way answered, and the call is `PlatformUnavailable`.
- Adapters reach platforms only through `publicHttpClient`, or
  `publicHttpClientWith({ timeout })` for uploads. Test them against the
  loopback fakes in `test/publishing/fakes/` (and the sign-in flows against
  `test/channels/fakes/`).
- A journal row found in flight is resumed (`PlatformPublisher.resume`, the
  gate's `Resume`), never sent again blindly: Bluesky looks the record up and
  creates it only when absent, Mastodon resends under the same key while its
  window holds, checked again just before the post goes out, X searches the
  account's recent posts, and an adapter that cannot tell (LinkedIn) answers
  unconfirmed. A resume refuses a post only when nothing can have gone live,
  and a target whose cancel was requested is never resumed.
- Tell how each target ended through `PublicationOutcomes`, once, in the
  transaction that settles it (`recordTargetRun`, and `claimPostRun` for
  missed targets). `NotifiedPublicationOutcomes` keys the notice by target and
  round, and a bug in telling is logged, never stops publishing.
- A post's text and media are checked against each platform with
  `#publishing/domain/text-length.ts`, `content-rules.ts` and
  `platform-rules.ts` when it is scheduled, never while it is a draft.
  `peal-contract/post-text` is the clients' copy, kept equal by
  `test/publishing/api/contract.test.ts`: change both together. Compare video
  durations in whole milliseconds, as the media API shows them.
- X's weighted count, `countLinks` and X's search for a lost post find links
  as twitter-text's `extractUrlsWithIndices` does, ported in
  `#publishing/domain/x-links.ts` (copied, identical, in
  `peal-contract/src/x-links.ts`): with or without a scheme, on a top-level
  domain of its list, so `peal.social` is a link and `localhost` is not. Its
  patterns are Unicode-aware, so it reads the long s and the Kelvin sign as
  letters that fold onto no ASCII one, and starts a bare domain after a
  character outside the Basic Multilingual Plane as twitter-text's UTF-16
  units do. `test/publishing/domain/x-links.test.ts` runs twitter-text's
  conformance cases (`x-conformance.ts`); an emoji counts 2 by Unicode's
  current list (`RGI_Emoji`), longest first. The twitter-text package is not
  a dependency: the domain cannot import it, and it pulls core-js 2 and a
  2019 emoji list.
- A post's target carries options only its channel's platform knows
  (`TargetOptionsSchema`, `#publishing/domain/target-options.ts`), tagged by
  `platform`, in `publishing.post_targets.options` (JSON the domain decodes;
  null on rows from before options and on platforms that take none). A
  platform's options are one `Schema.Class` in its own file
  (`youtube-options.ts`, `tiktok-options.ts`): every field optional, so a
  draft holds them unfinished, a `platform: Schema.tag(...)`, and a
  `problems()` method listing what the platform would refuse (`missing`,
  `tooLong`, `invalid`, by field). Adding a platform's options is adding its
  class to that union, its copy to `peal-contract/src/target-options.ts`
  (kept equal by `test/publishing/api/contract.test.ts`), its fields to the
  web app's `#posts/target-options.ts`, and their strings to the
  `Posts.Options` catalogues. Drafts refuse only options of another platform
  or channel; scheduling refuses what `problems()` lists
  (`optionMissing`, `optionTooLong`, `optionInvalid`). Options change only
  with the draft, and an update replaces them all. Adapters read their own
  from `OutgoingPost.options`, with
  `post.options.pipe(Option.filter(Schema.is(YouTubeOptions)))`; keep stored
  options decoding (`fixtures/persisted/post-targets/options.json`).
- Posts show only ready media of the workspace: `LibraryAttachableMedia`
  reads each asset through the media context's `MediaLibrary`, and anything
  else answers `UnknownMedia` when a draft is saved or scheduled.
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
- On a server that bills, `createUpload` checks the declared size against
  the plan's media storage (`StorageAllowance`) before the store opens an
  upload, and again as the asset is recorded (`MediaAssets.insertWithin`,
  under the workspace's advisory lock): `PlanLimitReached`
  `mediaStorage`. Rejected files count for nothing, pending ones until
  their URLs expire.
- Storage keys are `media/<workspace id>/<asset id>.<ext>` under
  `PEAL_S3_KEY_PREFIX`, and never change. Keep presigned URLs out of logs and
  errors.
- The S3 adapter uses the AWS SDK v3 (Bun's client cannot presign parts).
  Keep its checksums at `WHEN_REQUIRED`: the default puts an empty-body CRC32
  in presigned URLs, which stores refuse.
- Members reach media through `MediaLibrary`, which checks their
  permissions; publishing jobs through `MediaForPlatforms`, which checks
  none, as they act for the workspace once a post is scheduled, and hands out
  only ready assets of that workspace (`MediaNotPublishable` otherwise).
- `POST …/media/import` (`importMedia`, media:upload) fetches a file through
  `RemoteMedia` (`HttpRemoteMedia`: `publicHttpClientWith`, so the
  OutboundGuard checks the address and each of three redirects at most, no
  credentials, never logging the address), reads its format from its first
  bytes (`sniffContentType`), never the host's content type, counts bytes as
  they arrive against the kind's limit and the plan's storage, stores them
  in parts (`MediaStorage.store`, one part in memory), records the asset
  under the workspace's lock, then completes and probes it as an upload.
  The whole import has `importTimeout` (90 seconds, under the proxy's 120).
  Tests reach a loopback host with `mediaWith` and an open guard.
- Deleting an asset asks the `MediaUsage` port first, which publishing's
  `MediaInPosts` backs (`PublishingMediaUsage`; the composition root
  provides `MediaInPostsLive`): a post scheduled or publishing that shows it
  refuses the deletion (`MediaInUse`, listing the posts), and drafts lose
  the attachment in one transaction. `GET …/media/:id/usage` tells clients
  beforehand.

### Notifications

- Emails go through the `Mailer` port: Resend when `RESEND_API_KEY` is set,
  otherwise SMTP at `SMTP_URL`, from `MAIL_FROM`. Requests never wait for
  them.
- Render every email from `notifications/domain/english.ts` and `french.ts`,
  in the reader's locale. Account emails go through `SendAuthEmail`.
- Notices are events, not sentences: the context stores what happened as
  typed data (`NoticeEventSchema`: a post published, failed with its reason,
  or unconfirmed; a channel to reconnect now or soon), the web app writes it
  from its catalogues, and emails are rendered when they go out. Add members
  and fields to an event; never rename or remove one, since notices are
  stored with it.
- Other contexts tell people through `Notify`, with a key that names the
  event, such as `post-target:<id>:<round>`: a key seen before
  (`notifications.sent_notices`) notifies nobody. Keys hold ids and instants,
  never content. Notify runs in a TransactionRunner transaction that joins
  the caller's, so the key, the notices and the start of `DeliverNoticeV1`,
  which emails them after the commit, go together. Publishing calls it
  through `PublicationOutcomes`, the channels context through
  `ChannelNotices`.
- Who hears about an event is `recipientsOf`: for a channel, the members who
  can act on it (`audienceOf`: `channel:connect`); for a post, its author
  (`NoticeRequest.author`), whatever their role, and the members with
  `post:schedule` who chose `everyPost`, off by default; for a post without
  an author, or whose author left the workspace, every member with
  `post:schedule`; for billing, every member with `billing:manage`. Every
  notice reaches the app; `NotificationPreferences` say which are also
  emailed (failed and unconfirmed posts and channels to reconnect by
  default, not published posts; billing's always, as no preference covers
  them). A preferences change writes only what it names.
- `Notify.resolve(key)` says an event was dealt with: its notices are marked
  read for everyone and its pending emails skipped. Publishing resolves a
  round once a member confirms or reposts it.
- `DeliverNoticeV1` is persisted contract: its tag, its payload (`key`), its
  activities `send/<n>` and `abandon`, its clocks `retry/<n>`. It retries a
  transport that refuses for now over about five hours, and skips readers who
  left the workspace (or, for a channel, may no longer connect channels:
  `readerPermissionOf`) or turned the email off meanwhile.
- The inbox belongs to a user, and `authorizeInbox` decides who acts on it:
  the user, or an OAuth client not bound to a workspace, with
  `workspace:read` to read and `workspace:write` to change; staff
  impersonating the user only read.

### Writing assistant

- The assistant suggests a change to a post's text (rewrite in a tone,
  shorten to fit a platform, translate, suggest hashtags) through the
  `WritingModel` port: Anthropic (`@effect/ai-anthropic`) or any
  OpenAI-compatible endpoint that serves `/chat/completions`
  (`@effect/ai-openai-compat`: `@effect/ai-openai` calls `/responses`
  only), as `PEAL_AI_PROVIDER` says. It calls the provider directly, not
  through the outbound guard: the operator, not a member, names it. Unset,
  `UnavailableWritingModelLive` turns it off, and the status answers
  `available: false`.
- Drafts are data, never instructions. The system message depends on the
  action alone (`assistant/domain/writing-prompt.ts`); the draft goes in the
  user message as the single field of a JSON document. Never put a draft's
  text, or anything a member typed, in the instructions.
- The model answers in a shape Schema decodes, and the domain checks it
  (`suggestion.ts`) before anyone sees it. Answers are returned whole, never
  streamed, so nobody reads unchecked text.
- Never log or trace a prompt, a draft or an answer, nor a provider's error,
  which can quote them. The adapter turns effect/ai's and the HTTP client's
  spans off around the call, sends the provider no trace context, and
  records only the provider, the model, token counts and the kind of
  failure; `WritingFailed` carries no cause. `assistant.daily_usage` holds
  counts only.
- Every use case checks `assistant:use` (owners, admins, editors and
  contributors; not viewers, nor read-only OAuth clients) and works in the
  actor's workspace only.
- The quota is per workspace and UTC day: `AssistantAllowance` gives the
  limit (the workspace plan's on a server that bills, otherwise
  `PEAL_AI_DAILY_REQUESTS`, 100), and `AssistantUsage.claim` counts a request in one conditional
  upsert before the call, so requests sent together never pass it. Give a
  request back only when the provider never ran it (`unreachable`); a
  timeout, a refusal or an unusable answer counts.
- The model has 90 seconds to answer (`answerTimeout`). Anything between the
  browser and the server must wait longer: the web app's `/api` proxy waits
  120 seconds (`experimental.proxyTimeout` in `next.config.ts`).
- The assistant reads platforms' text limits through its `PlatformLimits`
  port, from `publishing/application/platform-text-limits.ts`. Its tones and
  languages are listed in its domain and copied in the contract, kept equal
  by `test/assistant/api/contract.test.ts`.

### Billing

- Billing is on when `STRIPE_SECRET_KEY` is set
  (`#shared/infrastructure/stripe-settings.ts`, read by the billing context
  and by Better Auth). Off, every workspace is `unmetered`: no plan, no
  limit, and the assistant keeps `PEAL_AI_DAILY_REQUESTS`. Keep it so: a
  self-hosted server limits nothing, and its billing routes answer
  `BillingNotEnabled`.
- Plans are priced by connected channels, in tiers: free, starter, pro,
  business, agency, each a monthly and a yearly price (ten months). Their
  allowances are `billing/domain/plans.ts` and their prices, euro cents
  excluding VAT, `prices.ts`; their ids (`#shared/domain/plan.ts`), the
  limits' names (`plan-limit.ts`: channels, members, scheduledPosts,
  assistantRequests, mediaStorage in decimal bytes), `PlanLimitReached`
  and `roomFor`/`roomForOneMore`/`withinAllowance` (`allowance.ts`) are in
  the shared kernel, since every context checks a limit. The contract
  copies them, with the catalogue (`planCatalogue`, `trialOffer`,
  `displayVatRate` in `peal-contract/src/billing-plans.ts`, exported as
  `peal-contract/billing-plans`), kept equal by
  `test/billing/api/contract.test.ts`. The site's pricing page
  (`peal-site/src/pricing.ts`) and the docs' variables
  (`peal-docs/pricing-variables.ts`, `{{starter-month-en}}`…) read that
  catalogue: never write a price by hand. `GET …/billing` answers it too.
- Each paid tier must stay strictly cheaper than the comparable tier of
  the per-account schedulers Peal is measured against, monthly and yearly,
  with or without VAT, by a margin a 25% move of the EUR/USD rate does not
  undo; recheck before any price change. The comparison lives outside the
  repository: never name another product here.
- Stripe prices are tax-exclusive EUR prices found by lookup key,
  `<prefix>_<plan>_monthly` and `_yearly` (`STRIPE_LOOKUP_KEY_PREFIX`,
  `peal`), never by id: Better Auth's plans carry `lookupKey` and
  `annualDiscountLookupKey`, and `planOf` reads the plan and interval from
  the event's `price.lookup_key`. Their amounts must equal `prices.ts`.
- Each context checks its own limit when something is added, through a port
  of its own backed by the billing context's `WorkspaceEntitlements`:
  `ChannelAllowance` (connecting a new account: on start, and again before
  the channel is added; accounts chosen together need room for all of them,
  checked before the choice is taken; an Instagram connection that may move
  a channel the workspace has the other way in is checked only once its
  account is known, as moving adds none), `PostAllowance` (a post scheduled or
  moved into a month, UTC: drafts and cancelled posts are left out, and a
  repost adds nothing, as `countGoingOut` counts posts, not rounds; and a
  workspace with more channels than its plan allows, as after a trial,
  schedules nothing: `PostAllowance.channels`, with the channels context's
  `ChannelUsage`; both are checked again when a target is about to go out,
  in `RoutedPlatformPublisher.publish`, as a trial or a larger plan may have
  ended since: over its channels, nothing goes out, and of a month's posts
  only the first the plan allows, by time then id
  (`PostRepository.countGoingOutBefore`); the others fail as `planLimit`,
  nothing sent; a resumed run is not checked), `AssistantAllowance`, `StorageAllowance` (an upload's
  declared size against the bytes stored, pending uploads younger than
  their URLs included: `MediaAssets.insertWithin`, under the workspace's
  advisory lock), and members in Better Auth's organization hooks
  (`workspace/infrastructure/auth/billing.ts`: pending invitations count when
  inviting, and members again when an invitation is accepted). Channels
  and posts are counted and added under a transaction's advisory lock
  (`ChannelRepository.addingTo`, `PostRepository.claimMonth`), so requests
  sent together never pass a limit. Better Auth's routes count, then write,
  without a lock: `AuthRoutesLive` runs `/organization/invite-member`,
  `/accept-invitation` and `/create` one at a time per workspace or account
  (`makeTurns` in `auth/turns.ts`: a session advisory lock on a reserved
  connection, the invitations' key shared with `WorkspacePeopleLive`, four
  held at once at most). A route of Better Auth's that adds to a limit
  joins `counted` in `routes.ts`. An upload completed after its room lapsed
  (`partUploadExpiry`) is counted again (`MediaAssets.updateWithin`), its
  file deleted when the plan has no room. "Never above the plan" is the
  invariant: a new path that adds to a limited resource checks under a
  lock, with a test that sends requests together. Each context also counts
  for the billing
  page (`ChannelUsage`, `PostUsage`, `WorkspaceSeats`, `AssistantRequests`,
  `MediaStorageUsage`), so `BillingOverviewLive` is built after the
  contexts it reads.
- A refusal tells every client the way out. The domain's
  `PlanLimitReached` carries `limit`, `allowed`, `used` and `needed`;
  `UpgradePaths` (`#shared/application/upgrade-paths.ts`, backed by
  billing's `PlanUpgradePathsLive`) gives the plan, the smallest larger
  plan with room (`planWithRoom` in `plans.ts`; none on the largest) and
  the billing page under `PUBLIC_URL`. Handlers answer the contract's
  `PlanLimitReached` through `limitRefusal` (`#shared/api/limit-reached.ts`,
  built with the group: handlers take services when the group is built,
  never per request), the assistant's `AssistantQuotaExceeded` carries the
  same plan fields (null on a server that does not bill), Better Auth's
  `MEMBER_LIMIT_REACHED` and `FREE_WORKSPACE_LIMIT_REACHED` bodies too
  (`memberUpgrade`, `freeWorkspace` hooks), MCP tools refuse with
  `planRefusal` (`app/mcp/refusals.ts`) and the CLI explains with
  `planLimitReason`. Change them together. `securityTest` provides
  `UpgradePaths.layerTest`.
- A plan can shrink under a workspace (a trial ends, a subscription is
  cancelled or unpaid): nothing is deleted, and `excessesOf`
  (`billing/domain/standing.ts`) lists what it holds beyond the plan
  (channels, members, media). Over its channels or members (`mustReduce`),
  it schedules and publishes nothing (`PostAllowance.channels` and
  `.members`, at scheduling and again in `RoutedPlatformPublisher`); posts
  already scheduled fail when due as `planLimit` and are reposted
  afterwards, never moved to drafts. `GET …/billing/standing`
  (`WorkspaceStanding`) tells every member; `POST …/billing/reduction`
  (`ReduceWorkspace`, in `billingActions`) keeps the channels and members a
  manager chose: the whole choice is checked first, members go before
  channels (`WorkspaceMembers.keepOnly`, `membersToRemove`: whoever chooses
  stays, only an owner removes an owner, pending invitations are revoked),
  and channels go through `DisconnectChannel`, with its revocations. Only
  what is over is touched. Over its media, a workspace only uploads
  nothing. The `TrialEnding` notice lists `over` the free plan.
- `PlaceOrder` refuses a plan that does not hold what the workspace has
  (`PlanTooSmall`, with what to remove first and the plan that holds it):
  an order never puts a workspace above its plan, moving down included.
  The trial is one per email address too: `trialOffered` (the billing page
  and `PlaceOrder`) checks the pseudonym of the member's address
  (`MemberAddresses`), as checkout does with the session's.
- A server that bills checks Stripe's prices when it starts
  (`StripePricesCheckedLive`, in `ServerLive` only: `AppLive` serves tests
  against stripe-mock, whose one price is none of Peal's): each lookup key
  must name an active price at the amount, currency and interval of
  `prices.ts`, tax-exclusive, or the server stops listing what differs
  (`StripePricesMismatch`). Stripe not answering is a warning, and the
  server starts.
- An account owns one workspace on the free plan at most: Better Auth's
  `beforeCreateOrganization` (`checkFreeWorkspace`) refuses another with
  402 `FREE_WORKSPACE_LIMIT_REACHED` while one it owns is on the free plan
  or in its trial, which ends on it.
- Billing counts the posts each workspace makes on platforms that bill the
  server per post (`meteredPlatforms` in `billing/domain/metered-posts.ts`:
  X, where a post with a link costs about 13 times more), and those with a
  link, by calendar month (UTC), in `billing.metered_posts` (`MeteredPosts`),
  on a server that does not bill too. Publishing reports each target that
  went out through `meteredOutcomes`
  (`publishing/infrastructure/metered-publication-outcomes.ts`), which wraps
  `PublicationOutcomes` in the transaction that settles it, with whether its
  text on the channel holds a link (`countLinks`); an unconfirmed post found
  later is not counted. No plan limits them yet; the counts go with the
  workspace's export and erasure (`BillingRecords`).
- Entitlements come only from `billing.subscriptions`, which
  `RecordSubscription` keeps from Stripe's `customer.subscription.*` events:
  Better Auth's webhook checks their signature, then its `onEvent` finds the
  workspace by its Stripe customer and the plan and interval by the price's
  lookup key, with the start, the period's bounds, the trial's end and the
  member who checked out (`metadata.userId`). An event is recorded once
  (`billing.stripe_events`), never over a newer one; Stripe dates events to
  the second, so of two in the same second the one further along the
  subscription's life wins (`lifecycleStage`). A failure answers the
  webhook an error, so Stripe sends it again. Active, trialing and past due
  subscriptions give their plan.
- Ordering takes two steps. `POST …/billing/orders` (`PlaceOrder`) records
  the order in `billing.orders`: plan, interval or the trial, the member,
  and their request to start at once knowing their right to withdraw
  (`startNow: true`, the unticked box of the billing page;
  `consentVersion` names its words, change it with them). Then Better
  Auth's `/subscription/upgrade` with `metadata.orderId`: its
  `getCheckoutSessionParams` (`checkoutParams`) takes the order once,
  within 30 minutes, for the same member, plan and interval
  (`CheckoutOrders`), or refuses `CHECKOUT_ORDER_REQUIRED`. That hook runs
  only when Better Auth opens a Checkout Session: for a workspace with an
  active or trialing subscription, which it would change in place (Stripe's
  API or a portal `subscription_update_confirm`), the plugin's before hook
  on `/subscription/upgrade` (`orderedChange`) takes the order first, refuses
  a request naming a `subscriptionId`, and, during the trial, opens a
  Checkout Session of its own for the paid plan (`checkoutDuringTrial`), as
  the trial must not change in place. The trial runs until the paid
  subscription is recorded: `RecordSubscription` then ends it
  (`orderedDuringTrial`). The Stripe portal has plan switching and
  cancellation turned off (the self-hosting docs say so): plans change and
  end on the billing page only.
- The trial: Pro for 14 days (`trialPlan`, `trialDays`), once per account
  and per workspace (`billing.trials`; a workspace that ever had a
  subscription has none), through Checkout with
  `payment_method_collection: "if_required"`,
  `trial_settings.end_behavior.missing_payment_method: "cancel"` and a
  35-minute `expires_at`. `CheckoutOrders.take` holds the trial at once
  (`Trials.reserve`, a row without a subscription the unique indexes keep
  to one, for `trialReservationMinutes`), and the trialing event takes the
  hold; a second trial of the account or the workspace that still gets
  through is ended (`duplicateTrial`). Before recording a trialing event,
  `RecordSubscription` sets `cancel_at` to the trial's end
  (`StripeContracts.endAtTrialEnd`), so a card added in the portal never
  turns it into a charge; such a trial is not "cancelled" for the billing
  page. Closing the account keeps a keyed pseudonym of its email address on
  its trial (`Pseudonyms`, HMAC under `BETTER_AUTH_SECRET`) for
  `trialMemory` (2 years), which checkout refuses a trial to. Pause would
  leave a subscription that may still bill.
- `billingActions` (`/orders`, `/cancellation`, `/withdrawal`) answer only
  members with billing:manage in their own session: never an API key, an
  OAuth client or staff impersonating them (403; the use cases refuse an
  impersonated actor too, `PersonRequired`). The SDKs leave the group out
  (`ownSessionTags`).
- Cancelling (`CancelSubscription`, French law's few clicks: the button,
  then the confirmation) sets `cancel_at_period_end`, or ends a trial at
  once. Withdrawing (`Withdraw`, CRD art. 11a: **Withdraw from contract
  here**, then **Confirm withdrawal**) is open 14 days from the contract's
  start (`mayWithdraw`), cancelled or not, refused to a customer with a
  verified `eu_vat` id (`StripeContracts.isBusiness`), and refunds each
  paid invoice since the start for the part of its own period not
  supplied, to the second (`refundOf`), through a credit note on each
  (`StripeContracts.credit`), so the invoice and Stripe Tax's report match:
  the withdrawal is recorded first (`billing.withdrawals`), then credited,
  computed at the time recorded, and ended under idempotency keys, so
  trying again refunds the same amounts once.
- Billing tells the members with billing:manage through `BillingNotices`
  (`Notify`), in the app and by email whatever their email choices
  (`emailKindOf` is none for these): `SubscriptionStarted`, the contract's
  confirmation; `SubscriptionCancelled`; `SubscriptionWithdrawn`, with its
  date and time; and, from the hourly `billing.reminders` cron
  (`SendBillingReminders`), `TrialEnding` three days before and
  (with what the workspace holds beyond the free plan) and
  `SubscriptionRenewing` 45 days before a yearly plan renews (Code de la
  consommation L215-1). Each once, by key. A confirmation and a renewal
  quote what Stripe charges, VAT included (the first paid invoice, the
  next invoice's preview, `StripeContracts.upcomingTotal`), never the
  catalogue: one Stripe cannot price yet waits for the next run.
- Better Auth's subscription routes take `customerType: "organization"` and
  the workspace as `referenceId` only, for members with `billing:manage`,
  never staff impersonating them. Checkout always sends Stripe Tax's
  parameters: prices are tax-exclusive at Stripe and shown VAT included
  everywhere, so a server that bills needs Stripe Tax. A workspace Stripe may still bill
  (`billsAt`: any status but cancelled or incomplete, unpaid and paused
  included, in `billing.subscriptions` or the plugin's `auth.subscription`)
  is deleted only once the person agrees to cancel its subscriptions, which
  `BillingRecords` then does at Stripe at once, without proration (see
  Accounts and access); it also expires its open checkouts. Better Auth's
  `/organization/delete` is disabled, so its hook refuses nothing. Erasing
  a workspace deletes the orders no contract followed; those of a
  workspace that had a subscription, and its withdrawals, stay without
  it, by their Stripe customer and subscription (`erased_at`), for
  `contractRetention` (5 years, Code civil art. 2224), then the daily
  `billing.contract-retention` cron (`PurgeContractRecords`) deletes them,
  and the trial pseudonyms past `trialMemory`. A user's orders and
  withdrawals are in their export (`contracts`, `ContractRecords`).
  Erasing leaves the trial to the account; closing an account leaves
  orders, trials and withdrawals without the user
  (`Subscriptions.forgetUser`).
- Never call Stripe in tests: checkout and the portal run against
  stripe-mock, billing's own calls (`StripeContractsLive`) against a
  stand-in server, and webhooks post the payloads in
  `test/billing/fixtures/webhooks`, signed in the test. The app's engine
  in tests runs no workflow, so what notifies (cancelling, withdrawing) is
  tested at the use cases and with `NoticesTest`.

### Analytics

- Analytics follows the targets that publishing's `PublishedTargets`
  (`publishing/application`) lists, from the latest one it follows (see
  below), in `analytics.tracked_posts`, and keeps each reading in
  `analytics.metric_snapshots`: ids and counts, never content. A workspace's
  go with it (`AnalyticsRecords`), and a reading saved after its post was
  erased keeps nothing (`saveReading` updates the post first). Erasing
  records the workspace's id in `analytics.erased_workspaces`, and `track`
  passes those over, under a transaction advisory lock erasures share and
  following holds alone, so a run that listed a workspace's posts before
  it was erased follows none of them after.
- TikTok reads public posts' counts with the Display API's video query, 20
  ids a call, with the channel's token when its scopes include
  `video.list`; a post known by its `publish_id` (not digits) is missing
  without a call.
- Instagram reads each post's media insights (`views`, `likes`,
  `comments`, `shares`), one call a post, on the connection's host, when the
  channel's scopes include its insights permission
  (`instagram_business_manage_insights`, or `instagram_manage_insights`
  through a Page), `paused` otherwise. Code 100 is missing; a rate limit
  halts; any other refusal, the token's included, fails the post and
  halts, so analytics never marks a channel to reconnect for insights it
  may not read.
- Platforms without a reader (LinkedIn, X, Threads and Facebook Pages so
  far) answer
  `ChannelUnreadable` `unsupported`: their posts end at their first turn,
  with no warning, and the reports leave them out. The platforms with one
  are `countedPlatforms` (`analytics/domain/counted-platforms.ts`), which
  the contract copies, kept equal by `test/analytics/api/contract.test.ts`,
  so a post's page says the others have no counts. A platform that gains a
  reader joins that list in the same change, or the reader is never asked.
- `CollectMetrics` runs on the `analytics.collect-metrics` cron, hourly at
  minute 7: a post is read every hour for 48 hours, then every day until it
  is 30 days old (`analytics/domain/collection-schedule.ts`), each next read
  counted from the run's scheduled time (`ClusterCron.CurrentScheduledTime`).
- Counts are likes, reposts, replies, and quotes and impressions as Options:
  none, where a platform does not give one, is not zero. A count is at most
  2^31 − 1 (`maxCount`), what its column holds: a server saying more fails
  to decode, rather than fail the run's insert.
- Reads go through the `MetricsReader` port. `GatedMetricsReader` sends each
  one, 25 posts at most, through the channel's `ChannelGate` (`ReadMetrics`),
  whose handler runs the readers in `analytics/infrastructure/platforms/`:
  reads take turns with publishing. `publishingWorkers` takes the readers;
  publishing's tests get `UnreadMetrics`.
- Mastodon reads one status at a time, with the channel's token from
  `ChannelAccess` when its scopes include `read:statuses` (asked since
  analytics; an app registered without it is registered again), without one
  otherwise. A read stops at 429, 60 requests left or 30 seconds, or at a
  post it failed on (an error, no answer, or one that does not decode). Only
  a 401 or 403 with Mastodon's JSON error refuses the token: a proxy's page
  must not mark the channel to reconnect, which stops its publishing.
  Bluesky reads the public AppView's `getPosts` without the session, whose
  scope stays what posting needs. YouTube reads `videos.list` statistics,
  50 ids a call, with the channel's token (`youtube.readonly`): views are
  impressions, comments replies, reposts 0; only a 401 with Google's JSON
  error refuses the token, and a 403 (quota) or 429 halts the read.
- A halted read leaves the rest due for the next run; a missing post, one a
  read `failed` on (so one the server cannot show never stays first due),
  or a channel off or to reconnect, waits for its next turn; a disconnected
  channel's posts, and a post still unread a day past its window, end.
- Each run follows the publications after the latest one it follows, then
  looks back 15 minutes for those that settled late, 20 pages of 500 each
  at most, so it moves on however many went live together. It then reads
  every post due, with no cap: a page of 500 channels at a time, those
  whose post waited longest first and each channel once a run
  (`TrackedPosts.dueChannels`, then `dueOn`: 1,000 posts a channel at
  most), so a channel put off, or a platform that is down, never holds the
  others back. `CollectionPaceRef` paces it: 16 channels at once
  (`PEAL_ANALYTICS_CONCURRENCY`), each one call at a time through its
  gate, and no read starts later than 50 minutes after the run's scheduled
  time. What a read found is saved in one statement a table
  (`saveReadings`, `saveSchedules`), never a transaction a post. A run
  sets `peal.analytics.collection.duration` and `.left`, and one out of
  time logs a warning and counts in `.unfinished`.
- Summaries take the posts published over a range of days in an IANA zone:
  the domain computes each day's start with `fromWallClock`, and Postgres
  buckets snapshots with those instants (`width_bucket`), never its zones.
- Test `CollectMetrics` on the in-memory store
  (`test/analytics/fakes/memory-tracked-posts.ts`). Postgres tests write under
  a workspace of their own, at instants no other suite uses, and delete it
  after (`forgetWorkspace`): the collection reads every row that is due.
  Run it on Postgres on the real clock, at an instant earlier than every
  other suite's (`collection-scale.test.ts`): a virtual clock set decades
  back replays every tick of the pool's timers and never returns.

### Webhooks

- A workspace's endpoints (`WebhookEndpoints`, `WebhookDeliveries`) hear
  what happens in it: reading needs `webhook:read`, changing
  `webhook:manage` (owners and admins; API keys and OAuth clients follow
  the permission; staff impersonating a member only read). 10 endpoints a
  workspace, whatever the plan and on a server that does not bill
  (`delivery-policy.ts`, counted under `EndpointStore.addingTo`'s advisory
  lock). The contract copies the vocabulary and the limits, kept equal by
  `test/webhooks/api/contract.test.ts`, which also decodes every example of
  the docs' Webhooks page, en and fr: change them together.
- Events (`#webhooks/domain/webhook-event.ts`, `WebhookPayloadSchema` in the
  contract) are public contract, stored until delivered: add a type or a
  field, never rename or remove one; a change receivers could not read is a
  new `version` sent beside the old. They carry ids, states, codes, instants
  and permalinks, never a post's text, a file, a handle or a name: the
  receiver reads those through the API. Keep
  `fixtures/persisted/events/stored.json` decoding.
- Contexts publish through `WebhookEvents.publish({ event, key })`, which
  joins the caller's transaction (as `Notify` does): the event, one delivery
  per endpoint that is on and subscribes, and the start of each job commit
  with the fact, or not at all, once per key (ids and instants, never
  content). A workspace where nobody listens keeps nothing. Publishing
  tells through `PostEvents` (schedule, unschedule, cancel, confirm, in
  `PostScheduling`'s and `PostFollowUp`'s transactions) and
  `webhookOutcomes` around `PublicationOutcomes`; channels through
  `ChannelEvents` (connect, reconnect, disconnect, in
  `ChannelRepository.addingTo`'s transaction) and `webhookChannelNotices`
  (reconnect needed, which the daily check tells again); media through
  `webhookMediaAssets`, around `MediaAssets.update`. A bug in telling is
  logged and never stops the fact; the database failing rolls both back.
  A new event is told from the transaction that records its fact.
- Deliveries follow the Standard Webhooks specification
  (`#webhooks/domain/signature.ts`): `webhook-id` is the event's id, the
  same on every attempt and on "send again", `webhook-timestamp` the
  attempt's time, `webhook-signature` one `v1,<base64 HMAC-SHA256>` per
  secret over `<id>.<timestamp>.<body>`, the body being `bodyOf`'s text
  byte for byte. Order is not guaranteed and deliveries repeat: the docs
  say so.
- Secrets are `whsec_` and 32 random bytes, issued and used behind
  `EndpointSecrets`, on the channels context's `TokenCipher`
  (`webhook:<endpoint id>`), so without `PEAL_TOKEN_KEYS` creating an
  endpoint answers `WebhooksNotConfigured` (503). The plain secret leaves
  once, in the answer to create or rotate; a rotated one signs beside the
  new one for 24 hours. Never log one, nor an endpoint's URL, whose path
  or query may hold the receiver's secret: logs, notices and the staff
  console name an endpoint by id and host.
- `WebhookTransport` sends through `publicHttpClient` only (HTTPS on 443,
  public addresses checked before every request, no redirect followed, no
  trace context), with its spans off and 15 seconds for the whole exchange.
  Any 2xx is success; of another answer the log keeps the status and
  `excerptOf` its body (one cleaned line, 256 characters), nothing else.
- `DeliverWebhookV1` (payload `deliveryId`, activities `attempt/<n>`, clocks
  `retry/<n>`, results `retry` or `settled`) is persisted contract, with
  fixtures in `test/webhooks/infrastructure/fixtures/persisted`. It makes 8
  attempts over about a day (`retryDelays`), each recorded by
  `DeliverWebhook.attempt` with its number, so one made twice counts once.
  `410 Gone` fails the delivery and turns the endpoint off; so do 5 days of
  failed attempts (`failing_since`, cleared by a success or by turning it
  back on). Turning off happens once (`EndpointStore.disable`), and tells
  the members with `webhook:manage` through the `WebhookEndpointDisabled`
  notice, always emailed. A delivery whose endpoint is off fails without a
  request.
- The log keeps a delivery 30 days (`webhooks.delivery-retention` cron,
  `PurgeDeliveries`), and an event while a delivery refers to it: the docs
  say 30 days, change them together. Tests of the purge set the clock long
  before any other suite's rows.
- Tests use `WebhooksTest` (`test/webhooks/support.ts`): Postgres, real
  secrets with the synthetic keyring, `FakeTransport` (hosts ending in
  `.internal.example` are not public, `.invalid` unknown), `StartedJobs`
  and `ToldNotices`; `eventsSentTo` reads what an endpoint was sent. The
  transport itself is tested against a loopback receiver
  (`fakes/fake-receiver.ts`).

### MCP endpoint

- `src/app/mcp/` serves effect/ai's `McpServer.layerHttp` at `/api/mcp`
  (Streamable HTTP; revisions 2026-07-28, 2025-11-25 and 2025-06-18, whose
  sessions live in memory and end with `DELETE`).
- Tools are `Tool.make` with Effect Schema inputs and outputs, declare
  `CurrentMember`, and reach contexts through their use cases.
  `McpAuthenticationLive` (`#workspace/api/mcp-authentication.ts`) provides
  the member from the request's OAuth token: 401 with an RFC 9728 challenge
  without a working token, 403 without a workspace scope or membership.
- The use cases' permission checks refuse a client the user let read only.
  Tools answer with the views the API handlers answer
  (`#<context>/api/*-view.ts`). Each area has its toolkit (`posts-tools.ts`,
  `media-tools.ts`, `reports-tools.ts`, `people-tools.ts`, `webhooks-tools.ts`)
  and its handlers beside it, merged
  into `PealTools`. Annotate every tool with `reading`, or
  `changing({ destructive, idempotent, openWorld })` from `annotations.ts`,
  and say in its description what it changes. `list_members` answers
  members' email addresses only with `includeEmails`: hand an AI model no
  more personal data than the task needs. Refusals are `ToolRefused`,
  with a message the user can act on (`refusals.ts`): `notAllowed` names
  the scope the client lacks and how the user grants it, or says the role
  refuses; a refused post lists every violation as JSON. Tools that put
  posts out (`schedule_post`, `publish_post`, `reschedule_post`,
  `create_post`, `repost_target`) are `openWorld`, say in their description
  that what goes out is public and cannot be taken back, and check
  post:schedule before reading the post. Instants are
  `Schema.DateTimeUtcFromString` in tool parameters. The tools of
  `PostTools` and `MediaTools` that change something are `contentTools`,
  whose calls the ConnectionJournal keeps. The account's own
  data (its export, its applications) has no tool.
- What the web app's composer sends, the CLI and the tools send too: a
  draft's per-channel `options` (`create_draft`, `update_draft`, `peal
  drafts save --options`), and TikTok's creator before a TikTok post
  (`get_tiktok_creator`, `peal channels tiktok`). The API's update replaces
  a draft's options; `update_draft` and `peal drafts save` keep those of the
  channels it keeps unless told otherwise, so a rewrite never drops them.
  Every failure reason has its words in the CLI (`posts.ts`
  `failureReasons`, typed by the contract) and in `get_post`'s
  description: add a reason there with the others. Both schedule and
  publish (`schedule_post`, `publish_post`, `create_post`; `peal posts
  schedule|publish|reschedule|cancel`, `peal post`), for a sign-in that
  holds `workspace:publish`: `peal post` takes `--at` or `--now`, never a
  default.

### Database

- The server reads `DATABASE_URL` (required) with `Config.Redacted`.
  `DatabaseLive` in `#shared/infrastructure/database.ts` provides `PgClient`,
  Effect's `SqlClient` and the `Drizzle` service on one pool, which the
  cluster shares. Better Auth runs on a small pool of its own
  (`AUTH_DB_POOL_MAX`). Repositories use `Drizzle`, or `SqlClient` for raw
  SQL.
- Each context keeps its tables in a Postgres schema named after it
  (`publishing`, `channels`, `media`, `notifications`, `assistant`,
  `analytics`, `billing`, `staff`, `legal`, `webhooks`; the workspace
  context's are Better Auth's, in `auth`). Effect creates its `cluster_*`
  tables in `public`; drizzle-kit never manages them.
- Declare a context's tables in `src/<context>/infrastructure/schema.ts`, then
  run `nx run peal-server:db:generate`, which writes a migration folder under
  `packages/peal-server/drizzle/`. Commit the folder as drizzle-kit wrote it;
  never edit a migration that has shipped.
- A query on a hot path (the calendar, a job that scans every workspace)
  gets its plan read on a database of the size it will meet:
  `packages/peal-server/scripts/seed-scale.ts` fills an empty, migrated
  database whose name ends in `scale` with synthetic rows for so many users
  (10,000 by default: 40,000 channels, 900,000 posts, 2.25 million targets).
  A job that takes "everything due" pages by cursor and says what it left;
  it never stops at a fixed count.
- The server applies pending migrations before it listens, under an advisory
  lock, so servers starting together take turns. `nx run peal-server:db:migrate`
  applies them without starting the server.

## Self-hosting

Every outside service sits behind a port with a self-hostable default, so a
self-hoster needs only Postgres and an S3-compatible store:

- storage: any S3 API (R2 in production, SeaweedFS in development), with the
  upload CORS rule that `media-cors` writes;
- email: Resend or SMTP (Mailpit in development);
- billing: Stripe, off when no key is set (no plan limits);
- captcha: Turnstile, off when no key is set;
- AI: an Anthropic key, or any OpenAI-compatible endpoint that serves
  `/chat/completions`; the writing assistant is off until `PEAL_AI_PROVIDER`
  is set;
- telemetry: OTLP export of logs, metrics and traces only when
  `OTEL_EXPORTER_OTLP_ENDPOINT` is set (`src/app/observability.ts` defaults
  each `OTEL_<SIGNAL>_EXPORTER` to `otlp`; set one to `none` to turn that
  signal off). Traces are head-sampled as `OTEL_TRACES_SAMPLER` and
  `OTEL_TRACES_SAMPLER_ARG` say (`src/app/trace-sampling.ts`): one in ten
  in production, all elsewhere. Whatever the ratio, the spans in
  `alwaysSampledSpans` (each publishing attempt) are sampled, and a span of
  an unsampled trace is still exported when it ended in a defect, when the
  server failed the request (5xx) or when it lasted `slowSpan` (10 s), with
  its parents (`SampledSpan`). Never alert or count on spans, which are a
  sample: count in a metric (`peal.http.requests`, which the request alerts
  read) or a log.

- Images read `PORT` and plain environment variables and run anywhere.
- Self-hosters run `compose.production.yaml` with `compose.self-host.yaml`:
  Caddy (`self-host/Caddyfile`) terminates TLS, routes as below and waits 150
  seconds for an answer. `self-host.env.example` lists what to set.
- Route `/api/*` and `/.well-known/oauth-*` to the server, or let the web app
  forward them, and everything else to the web app.
- Document every setting a package reads in the docs' environment variables
  page, in English and French, in the same change.

## Web front

- Build screens from `peal-ui` components and Tailwind classes; add no other
  stylesheet.
- Add a shadcn component by running `bunx shadcn add <name>` in
  `packages/peal-ui`, which reads its `components.json`. Point the component's
  `cn` import (the CLI writes `"cn"`) at `../lib/utils` and its sibling imports
  at `./`, rewrite function components as arrow functions, take every
  user-facing string (labels such as a dialog's close button) as a prop, then
  run `bun run fix`.
- Use theme tokens (`text-muted-foreground`, not `text-gray-500`) and
  component variants and sizes rather than restyling a component; the
  `@shadcn/lint` rules check pages against peal-ui. Dark mode follows the
  operating system (`prefers-color-scheme`).
- Pages live under `src/app/[locale]/`: the auth pages (`sign-up`, `sign-in`,
  `verify-email`, `forgot-password`, `reset-password`, `invitations/[id]`),
  the OAuth pages (`device`, `oauth/workspace`, `oauth/consent`), the
  platforms' redirect URI `connect/[platform]/callback` (which shows the
  account picker when a sign-in reached several accounts), Meta's data
  deletion status `data-deletion/[code]`, and the signed-in
  app: `app` (workspaces), `app/notices`, `app/notices/preferences`,
  `app/account`, `app/[workspaceId]/channels`, `…/media`, `…/calendar`,
  `…/analytics`, `…/drafts`, `…/posts/new`, `…/posts/[postId]`, which opens
  a draft or a scheduled post in the composer, and shows a post that went
  out in `PostDetail` (each channel's status, attempts and reasons, with
  repost and confirm, and its analytics), `…/settings` (with `members`,
  `invitations`, `api-keys` and `webhooks`) and `…/billing`. The staff console is
  `admin` (the system's health), `admin/users`, `admin/users/[userId]`,
  `admin/workspaces`, `admin/workspaces/[workspaceId]`, `admin/audit` and
  `admin/legal`: its layout and pages read the staff endpoints with the
  visitor's cookies through `staffRead` (`#staff/server.ts`), which shows
  the not-found page for any 404, and its actions are mutations from
  `#staff/atoms.ts`. `admin/legal` (legal requests, `legalRead`) is linked
  and served for staff with the legal role only (`answersLegalRequests`):
  its form (`LegalRequestForm`, `#staff/legal-request.ts`) sends nothing
  without the authority, the reference, the legal basis and what the
  request covers, `LegalAnswerView` shows what came back, and the page
  says before anything is entered that each answer is recorded, as staff
  must be told (Code du travail, art. L1222-4): keep that notice.
  `ImpersonationBanner`, in `AppShell`, shows while staff act as someone.
- The web app reports its errors to `POST /api/client-errors`:
  `src/instrumentation-client.ts` (uncaught errors, unhandled rejections),
  `app/[locale]/error.tsx` and `app/global-error.tsx` (the error pages, in
  the reader's language), and `src/instrumentation.ts` (`onRequestError`).
  Build reports with `reportOf` (`#errors/report.ts`), which cuts each field
  to the contract's limits and keeps no query, id or address; browsers send
  them without cookies, each error once, ten a page at most. The release
  comes from `PEAL_RELEASE`, through the locale layout's `peal-release`
  meta tag.
- Pages fetch through the client derived from `peal-contract`, with
  `@effect/atom-react`: query atoms come from `PealApi` in `src/api/client.ts`.
  Browsers call `/api`; server code calls `PEAL_API_URL`.
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
- Settings pages read Better Auth's members, invitations and sessions in
  atoms (`#settings/atoms.ts`), decoding each answer with `authCall`, and
  offer only the role changes its routes accept (`#settings/member-rules.ts`).
  Invitations go through `invite` (`#settings/invite.ts`): Better Auth's
  client types roles from its own defaults. Sign-in opens `next` in the
  language the account keeps (`landingLocale`), which account settings save
  with `updateUser`.
- Client components call Better Auth through `authClient` (`#auth/client.ts`).
  During an OAuth authorization it sends the page's signed query with every
  POST, and Better Auth resumes the authorization after any call that sets
  the session cookie; calls that must not resume it, such as setting the
  active workspace, go through `workspaceClient`. Better Auth error codes map
  to `Auth.errors` in the catalogues.
- Keep the OAuth pages' views (`WorkspacePickerView`) apart from their state,
  so tests render each state: peal-web has no DOM test environment. A view
  under test imports nothing from `#i18n/navigation.ts`, which needs Next to
  run: take links as props or children (`DraftItemView`,
  `MediaUsageNotice`).
- Show dates in the reader's time zone. next-intl's server provider hands the
  client the server's zone (UTC in the image): `ViewerTimeZone`
  (`components/viewer-time-zone.tsx`), in the locale layout, sets the
  browser's on the shared provider once the page has hydrated, so every
  page's dates follow it. `InTimeZone` (`components/notices/in-time-zone.tsx`)
  sets a given zone on part of a page.
- The header's `NotificationBell`, beside the account menu, polls
  `GET /api/me/notices/unread` every 30 seconds while the tab is visible and
  when it is shown again (`useRefreshWhileVisible`), and announces arrivals
  in a status region. Polling works through any proxy and needs nothing
  shared between servers; keep it. Write notices from their events with
  `src/notices/notice-text.ts`.
- The composer's options come from `TargetOptionsSection`
  (`components/posts/target-options-panel.tsx`), which renders the fields
  `#posts/target-options.ts` describes for each selected channel's platform
  (text, tags, choice, yes or no, toggle; `initial`, `inverted` and `within`
  for TikTok's boxes), turns them into the contract's `TargetOptions` with
  Schema, and shows each `option*` violation under its field. On a TikTok
  channel, `TikTokChannelOptions` reads `GET …/channels/:id/tiktok-creator`
  and limits the fields by the creator (`#posts/tiktok-account.ts`): their
  nickname, their audiences, interactions they turned off (and set off),
  no Duet or Stitch on photo posts, "Only me" closed to branded content,
  the disclosure's label, and TikTok's consent line, as its content sharing
  guidelines require.
- The composer's attachments come from `MediaPicker` (ready media of the
  workspace) or `MediaUploader` (`onUploaded` attaches ready uploads).
  `#posts/attachments.ts` keeps the list: order, alt text seeded from the
  library description, `maxMediaPerPost` at most. `#posts/media-fit.ts`
  checks it against the contract's platform rules, so Schedule waits until
  nothing would be refused. Keep `MediaUploader` mounted while the post is
  editable and pass `disabled` while it is busy: unmounting it cancels the
  uploads in flight.
- Charts use peal-ui's `chart` (recharts) and come with the same figures as
  a table, behind **Chart** and **Table** tabs; the chart itself is
  `aria-hidden`. Write calendar days, such as a summary's, in UTC
  (`#analytics/report.ts` `dayDate`), and instants in the reader's zone.
- `AssistantMenu` sits in the composer's text section and works on the text
  for all channels. Render it only for members with `assistant:use`, and
  only while `GET …/assistant` answers `available`; refresh that status after
  every request, which can change the requests left. Show each suggestion in
  a preview the person accepts or discards: never apply one unasked.
- A plan's refusal opens the one upgrade dialog (`UpgradeDialog`, its view
  `UpgradeView`): the limit with usage and plan, the smallest plan with
  room priced with VAT first (`offerOf`, from the contract's catalogue),
  the consent and the order button of the billing page, then checkout
  (`useCheckout`), back to the page the person was on; who can order, for
  a member who cannot; how to ask for more on the largest plan
  (`PEAL_CONTACT_URL`). `UpgradePrompts` puts it around a workspace's pages
  (`app/[workspaceId]/layout.tsx`), the workspaces list and the connect
  callback. A place that sends something a plan can refuse calls
  `useOfferUpgrade()(exit)` (`useOfferAuthUpgrade` for Better Auth's
  errors), or renders `OfferUpgrade` with the failure it keeps in state,
  beside its own message: add it to every new such place. The same layout's
  `PlanGate` shows `OverPlanScreen` instead of the page, billing's aside,
  while the workspace must come back within its plan
  (`standingOfWorkspace`, read with the visitor's cookies). The billing
  page orders smaller plans too, and lists what a `PlanTooSmall` names.
- The billing page shows `GET …/billing` (`BillingView` renders each state,
  `BillingStep` the cancellation and withdrawal steps) with prices
  including VAT first and excluding VAT beside them, a monthly and yearly
  switch, the unticked box asking to start at once, and **Order with
  obligation to pay**; it places the order (`#billing/api.ts`), then opens
  Stripe's checkout and customer portal through `billingClient`
  (`#auth/billing-client.ts`, Better Auth's Stripe client), with
  `disableRedirect` and the page as the way back. It links the terms of
  service at `PEAL_TERMS_URL`. Explain a `PlanLimitReached`, and Better
  Auth's `MEMBER_LIMIT_REACHED`, wherever they surface, from the `Billing`
  catalogue and `Auth.errors`.
- The sign-up and password reset pages read the Turnstile site key at
  request time (`captchaSiteKey()`, `GET /api/captcha`); `useCaptcha` shows
  the widget only with one, sends its token as `x-captcha-response`, and
  resets it after every call, since a token works once.
- `src/proxy.ts` rewrites `/api/*` and `/.well-known/oauth-*` to
  `PEAL_API_URL`, read per request. Keep it there, not in `next.config.ts`:
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
- Folders in `peal-web` import each other through `#…` (package.json
  `imports`); `#messages/*` points at the catalogues.

## Command line

- `peal-cli` reaches the server only over HTTP, through `PealApi`
  (`src/api.ts`), the client derived from `peal-contract`, and `OAuthApi` for
  Better Auth's endpoints. Its oxlint config refuses `peal-server` imports,
  and `@effect/platform-bun` outside `src/main.ts`.
- The API URL comes from `--api-url`, then `PEAL_API_URL`, then
  `http://localhost:3000`.
- `peal login` signs in with the device grant; `whoami`, `logout`, `mcp` and
  `health` are the other commands, with `channels`, `drafts`, `posts`,
  `post`, `media`, `analytics`, `billing`, `members`, `invitations` and
  `webhooks`, which act in the
  workspace `--workspace`, then `PEAL_WORKSPACE`, names by slug or id
  (`inWorkspace`, `src/workspace.ts`; a user's only workspace otherwise),
  and `account`, which exports the user's data to a file only they may read
  and lists their connected applications (an exclusive create, never
  through a link or over a file made meanwhile). `runWith` and `run` print
  through `printableConsole` (`src/print.ts`), which shows control
  characters as U+FFFD, since what the server holds was written by others. Turn a request's failure into
  what the user reads with `explain` (`src/explain.ts`). Positional
  arguments are read in the order of their config's keys, which the linters
  sort: name the keys so the order reads right. Commands that act as the
  user take a token from `accessToken` (`src/session.ts`), which renews it
  with the refresh token. `CredentialStore` (`src/credentials.ts`) saves sign-ins by API URL in
  `credentials.json` (0600, in a 0700 folder). Keep tokens `Redacted`, and
  never print one.
- Test commands with `runWith` from `src/cli.ts` against the in-memory server
  in `test/support.ts` (the contract served by test handlers) and the
  authorization server in `test/authorization-server.ts`, never against a
  running server. The workspace groups answer from the synthetic studio in
  `test/studio.ts`, which checks the member's permissions and records each
  change; `signedIn` (`test/signed-in.ts`) signs the command line in to it.

## SDKs

- Every SDK is generated from `packages/peal-sdk/openapi.json`, which
  `peal-sdk:spec` (`scripts/spec.ts`) writes from the contract's: the
  operations a bearer token can call (an API key or an OAuth access token),
  and the health checks, with the schemas they use. It leaves out the groups
  that answer only the person in their own session (`ownSession`: `account`,
  `connectedApps`, `workspaces`); add a group like those to `ownSessionTags`.
  It names Effect's encoding of non-finite numbers `NonFiniteNumber`, and
  stops on any other enum inline in an `anyOf` or `oneOf`: give it a schema
  of its own in the contract. It writes each tagged union (Effect's `anyOf`
  of objects with a one-value `_tag`) as Fern reads one: a `oneOf` with a
  discriminator mapping each tag to a schema, a member written inline
  becoming `<Schema><Tag>` (`ChannelStatusDisabled`); the SDKs that rename
  properties call `_tag` `type`, as Fern refuses a leading underscore. Each
  operation's SDK group and method come from its operationId
  (`posts.schedule`), and no POST or PATCH is retried
  (`x-fern-retries`): the first may have created what a retry would create
  again.
- Never edit a generated file: change the contract, the scripts or the
  generator's options, then `bun run sdk:generate`. Fern replaces each
  language's folder with what it writes, so nothing stale stays, and keeps
  only the files its `.fernignore` names, which are ours: `project.json`, the
  smoke test, Ruby's `custom.gemspec.rb`, .NET's `Peal.Custom.props` (the
  metadata the generated gemspec and project load) and PHP's
  `.gitattributes`. `generate.ts` copies `LICENSE` and `NOTICE` in after it.
- `sdk:generate` depends on `peal-sdk:spec` through the tag `sdk-spec`, never
  the name: Nx resolves a name in `dependsOn` to the npm package of that name
  first, and the Node SDK's package is `peal-sdk`. `.nxignore` keeps the
  SDKs' builds out of the project graph (`cargo package` unpacks a copy of
  the Rust SDK, `project.json` included). `generate.ts` refuses to run
  without `openapi.json`, which only Nx writes before it. The Node SDK's
  `package.json` sets `nx.includedScripts` to none: Nx would otherwise run
  Fern's `test` and `build` scripts (vitest and pnpm) with the workspace's.
- `scripts/languages.ts` holds each language's Fern generator (image,
  version, the digest that pins it, its options), version and build, and pins
  every toolchain image by digest, as `compose.yaml` does. A release bumps
  that language's version there. `generate.ts` pulls the generator by digest
  and tags it with the name Fern runs, writes a Fern workspace for the
  language under `.cache/sdk/fern` (paths relative, as Fern wants), and runs
  the workspace's `fern-api` with `--local` and its telemetry, upgrade check
  and version redirection off. `--generate-tests` makes Fern write whole
  projects (manifests, build files, its own tests), not the source alone.
  Generation is deterministic: `sdk:check` compares two runs' output through
  Git. Upgrade Fern (the CLI or a generator) on purpose, then regenerate and
  read the diff.
- `scripts/finish.ts` fills what the generators' options cannot set (PyPI's
  `peal-sdk` name and the README's install line, Composer's license and no
  `version`, Rust's TLS feature and links, npm's `NOTICE`), removes Fern's
  badge and CI workflows (the PHP mirror would run them), and writes Java's
  Maven `pom.xml` from the dependencies of Fern's Gradle build, which it
  deletes (OkHttp's JVM artifact is `okhttp-jvm` to Maven). Each replacement
  fails when its text is missing, so a generator upgrade that changes its
  output stops there: update the replacement.
- The SDKs' manifests keep the generator's dependency ranges, and their lock
  files (`Gemfile.lock`, `composer.lock`, `Cargo.lock`) stay out of Git: a
  library leaves its dependencies' versions to the projects that install it.
- `sdk:build` builds each SDK as its registry would get it, then loads it:
  Python with the workspace's uv, the others in their image
  (`scripts/container.ts`: as the calling user, with their downloads cached in
  `.cache/sdk`). Node's compiles with TypeScript 5.9 and Node 20's types, as
  its tsconfig expects (TypeScript 7 removed its module resolution). Rust's
  crate uses rustls, which needs no OpenSSL. Go's module is
  `github.com/peal-social/peal/packages/peal-sdk/go`.
- Each SDK is released alone, by a tag `sdk-<language>-v<version>` on a
  commit whose `scripts/languages.ts` gives that version
  (`scripts/release.ts` refuses another). `sdk-release.yml` builds it from
  that commit and publishes it in the `sdk-release` environment: trusted
  publishing (OIDC) for npm, PyPI, RubyGems, NuGet and crates.io, no token
  stored; Maven Central's portal token and signing key from secrets (the
  `release` profile of the pom `finish.ts` writes: BouncyCastle signing and
  Sonatype's plugin); a tag `packages/peal-sdk/go/v<version>` for Go; a
  tag `v<version>` on `peal-social/peal-php` for Packagist. That repository
  is a read-only copy of `packages/peal-sdk/php` (`git subtree split`), which
  `sdk-php-mirror.yml` updates from `main` with the deploy key in
  `PHP_MIRROR_DEPLOY_KEY` (`.github/scripts/push-php-mirror.sh`); never
  commit to it.
- `sdk:test` (after `sdk:build`, uncached) runs each SDK's smoke test, a file
  of ours in its folder (`test/smoke.mjs`, `smoke.py`, `smoke_test.go`,
  `smoke.rb`, `src/test/java/…/SmokeTest.java`, `smoke.php`, `smoke/`,
  `examples/smoke.rs`), against the stand-in API `scripts/test.ts` serves:
  the health check, then `GET /api/me` with the bearer token `peal_test`,
  whose answer holds nulls and an enum, then with a refused token, which
  must raise the SDK's 401 error. Keep every test calling both, and checking
  what it decodes; the run fails when the stand-in did not see both calls.
  Containers reach it as `host.docker.internal`; Ruby's client sends plain
  HTTP to localhost alone, so its test forwards from its container's
  loopback. Fern's own tests (Go's call WireMock) do not run.
- What each package ships is chosen, not found: npm's `files`, Ruby's
  gemspec (`lib/`, the README, the license: `finish.ts`), Rust's `exclude`,
  PHP's `.gitattributes` (`export-ignore`, for Composer's downloads), the
  .NET project alone with its README (ours: the generator's says nothing).
  Java uses OkHttp with Gson, the generator's default: its `native` library
  has no authentication, though its docs show `HttpBearerAuth`.
- The SDKs are Apache-2.0 (`packages/peal-sdk/LICENSE`, copied into each
  language's folder: Go would otherwise take the repository's FSL), and every
  manifest says so. What they call is public API: renaming or removing an
  operation, a field or a schema in the contract breaks their users.

## End-to-end tests

- Run them with the development stack up and a database of their own:
  `DATABASE_URL=postgres://peal:peal@127.0.0.1:15432/peal_e2e bun nx run peal-e2e:e2e`.
  The target builds the web app first and is never cached. Like the
  server's tests, a run writes to the database `DATABASE_URL` names; Mailpit,
  SMTP and SeaweedFS (under `e2e/`) default to the stack, and `MAILPIT_URL`,
  `SMTP_URL` and `PEAL_S3_*` override them.
- `scripts/serve.ts` starts the server and `next start` on free ports, with
  the synthetic secrets in `e2e.config.ts`, and stops both when either exits.
  It passes `next start` no `--hostname`: bound to 127.0.0.1, every page
  redirects to itself.
- Install Chromium with `e2e-web install chromium`, from
  `packages/peal-e2e/node_modules/.bin`; CI adds `--with-deps` for the
  system libraries it needs.
- Write steps with exact locators (`screen`, `expect`) only, so tests need no
  model and run in CI. Find elements by role and label, and scope to `main`,
  `banner` or a named `navigation` when a name repeats.
- Sign up a new synthetic user each run (`member+<uuid>@example.test`, from
  `credentials.member`), and read its emails through Mailpit's API
  (`tests/support/mailpit.ts`). Accounts a test acts on rather than as sign
  up through the API with `confirmedAccount`, and `makeStaff`
  (`tests/support/accounts.ts`) gives one the staff role in the database, as
  self-hosters do; it signs in again afterwards.
- The run's server bills, against a stand-in for Stripe that lists Peal's
  prices (`scripts/stripe.ts`): a new workspace is on the free plan, so a
  journey stays within three channels, two members and one workspace per
  account, or tests the refusal (`upgrade-prompt.e2e.ts`). No test pays.
- No platform can be connected in a run, so a test that needs a channel
  inserts a synthetic one with `seedChannel` (`tests/support/channels.ts`).
  Update it when `channels.channels` changes. Publish nothing, and cancel any
  post a test schedules, through the UI.
- CI's `e2e` job runs after `verify`, with its own Postgres and Mailpit and
  SeaweedFS from `compose.yaml`. After a failure, read the report, traces and
  screenshots under `packages/peal-e2e/.e2e/` (CI uploads it for 7 days), and
  the server's and the web app's output in `.e2e/logs/app.log`.

## Docs and marketing site

- Docs pages live in `packages/peal-docs/docs/`: English at the root, French in
  `docs/fr/` under the same file names. Pin each heading's anchor with `[#id]`
  so links work in both languages, and order pages with `sidebar.order`.
- Every docs target depends on `peal-contract:openapi`, so the reference
  matches the contract. `nx run peal-docs:test` runs `blume validate --strict`.
- Do not run `blume build` or `blume check` while `blume dev` runs in the same
  package: they share the generated runtime in `.blume/` (typecheck uses
  `--isolated` for that reason). Leave Blume's own TypeScript 6 alone.
- The site's pricing page (`src/pages/[...locale]/pricing.astro`, its
  logic in `src/pricing.ts`) and the docs' **Plans and billing** page
  (`docs/billing.mdx`, with the variables of `pricing-variables.ts`) show
  the contract's catalogue; the legal pages' plans section follows it.
- Site strings live in `packages/peal-site/src/i18n/messages.ts`, legal
  documents in `src/content/legal/<locale>/<document>.md`. Keep a legal
  document `draft: true` (banner and noindex) until legal review approves it,
  and never replace a [bracketed placeholder] with a guess.
- The privacy policy's retention table is the registry's
  (`peal-contract/data-processing`), which `nx run peal-site:test` checks
  in both languages: change the registry, then the table.
- TypeScript 7 does not read `.astro` files, and `astro check` refuses it: keep
  page logic in typed `.ts` modules and `.astro` files thin. Name files in
  kebab-case.
- `nx run peal-docs:build` and `nx run peal-site:build` write each package's
  `dist/`, cached. Their settings are optional, and unset or empty turns the
  feature off: docs `DOCS_SITE_URL`, `DOCS_PLAUSIBLE_DOMAIN`,
  `DOCS_PLAUSIBLE_HOST`; site `SITE_URL`, `SITE_DOCS_URL`,
  `SITE_PLAUSIBLE_DOMAIN`, `SITE_PLAUSIBLE_HOST`. Nx hashes them from the
  process environment only, not `.env` files: export them, or build with
  `--skip-nx-cache`.
- The site serves `/.well-known/security.txt` (`public/.well-known/`) for
  peal.social, with `security@peal.social`: move its `Expires` a year ahead
  before it passes.
- Run the site with `nx run peal-site:dev`: it sets `ASTRO_DEV_BACKGROUND=0`,
  because Astro otherwise detaches `astro dev` when an agent runs it.

## Environments

- `dev`: local, with the compose stack from `peal-docker`.
- `sandbox`: pre-production, with its own database, R2 bucket, Stripe sandbox
  and platform redirect URIs.
- `production`.

## Infrastructure

- Production runs on a server at a European provider, managed with Ansible
  from `peal-infra`, reachable only through a Cloudflare Tunnel: no inbound
  ports, SSH included. No provider is chosen yet, and the repository names
  none: each group's `hosting_provider` and `hosting_location` (a city) are
  placeholders `peal_preflight` refuses, and the infra README's "Choosing a
  provider and a size" says what the stack needs of any of them.
  Cloudflare Zero Trust Access guards Grafana, the admin (`/api/auth/admin`,
  the staff console's `/api/admin`, `/admin`, `/en/admin` and `/fr/admin`) and the
  sandbox, and cloudflared checks the Access token on those routes too. Caddy fronts the
  stack for self-hosters.
- Staff have full access to Grafana: in production, Grafana signs in whoever
  its Access application lets through (the staff) as an organisation Admin,
  from the Access token (`GF_AUTH_JWT_ROLE_ATTRIBUTE_PATH` in
  `compose.production.yaml`), and sets the role again at each sign-in. Who
  gets in is the Access policy's business; do not grant roles in Grafana by
  hand.
- Change the servers only through the playbooks in `packages/peal-infra`; SSH
  is for reading (`sudo peal-compose ps`). Run `site.yml` with `--check
  --diff` before applying it, and keep every task idempotent: a second run
  reports no change. The inventory holds placeholders that `peal_preflight`
  refuses; nothing has been applied yet.
- `bootstrap.yml` logs in as `bootstrap_user`, the account a server's image
  lets in: root, or the image's own (then with sudo), which the `ssh` role
  removes once `ops` works. Where cloud-init rewrites `/etc/hosts`
  (`manage_etc_hosts`), the `system` role turns it off in
  `cloud.cfg.d/zz-peal.cfg` and writes its line in cloud-init's template
  too, as a provider's own settings at boot override files on the server.
- Keep check mode working on a new server: a task that needs what an earlier
  one would make (a folder, a package, a unit) skips in check mode when that
  one reports a change.
- Docker Engine and its plugins are pinned exactly (`docker_packages` in the
  docker role, held by an apt pin); the role's defaults say how to bump them.
- Containers publish ports on 127.0.0.1 only, and the tunnel reaches them
  there; Docker's own rules would otherwise bypass ufw.
- Telemetry goes through an OpenTelemetry Collector to Loki, Tempo, Prometheus
  and Grafana; alerts go to a Telegram bot. Grafana's alert rules
  (`config/production/grafana/alerting/rules.yaml`) and dashboards
  (`config/production/grafana/dashboards/`) are provisioned from
  `peal-docker`; the web app's error reports have an alert and a dashboard
  of their own, and the server's error-log alert leaves them out. The
  heartbeat rule (`alerting/heartbeat.yaml`) is apart: it always fires, to
  its own contact point, never to Telegram.
- A separate server checks uptime (`uptime.yml`, inventory group
  `uptime`), at another provider and in another city than production and
  the sandbox, which the `uptime` role refuses to run without and
  `tests/test_hosting.py` checks: Gatus, its configuration generated from the inventory, checks
  the public endpoints of production and the sandbox and alerts on a
  Telegram bot of its own; Caddy is its only public entry, for the heartbeat
  production's Grafana posts every few minutes, on `uptime_hostname`, and
  for the public status page, on `uptime_status_hostname`
  (status.peal.social, `uptime_public_status: true`). It shares no secret,
  tunnel or network with them: it generates the heartbeat token, which
  production holds as a credential (`PEAL_HEARTBEAT_TOKEN`). Keep
  `uptime_environments` equal to each environment's host names. Gatus
  publishes its dashboard on 127.0.0.1 only. The status page is a Gatus of
  its own (`status`, `status-config.yaml.j2`) that checks the
  customer-facing endpoints of the environments marked `public`
  (production; never one behind Access), with no alert or secret, and
  hides URLs, conditions and errors; Caddy serves it by GET and HEAD alone
  (`status.caddy`), and the heartbeats never go through its name. Both names have DNS
  records Cloudflare does not proxy (the infra README's "The status page").
- Secrets are generated on the server and stay there. Do not copy them, print
  them, or give the server's credentials to other systems, GitHub included:
  `release.yml` builds the images on the machine running Ansible and uploads
  them. Credentials outside services issue come from a Git-ignored vault or
  are written on the server, and Ansible checks them by name only.
- Telemetry keeps logs 31 days (Loki), traces 14 days
  (`config/production/tempo.yaml`, whose `block_retention` is set for both
  the backend scheduler and worker) and metrics 30 days, as the privacy
  policy says: change both together.
- Postgres archives its write-ahead log and is backed up to R2 with
  pgBackRest; the backup passphrase is the one secret kept outside the server
  too. R2 buckets are in its EU jurisdiction (`<account>.eu.r2…`).
  `peal_runtime` refuses an R2 endpoint without `.eu.`; any other S3 store in
  the EU does, with its region in `peal_settings`. A restore
  brings back deletions made since its point in time:
  `runbooks/restore-database.md` restores the database, then replays the
  erasure ledger before the stack starts. The ledger stays in the media
  bucket while nothing serves that bucket publicly; `peal_runtime` refuses
  `PEAL_MEDIA_PUBLIC_BASE_URL` without `peal_erasure_ledger_bucket`. The server migrates when it
  starts, so write migrations that the previous release can still run
  against, and roll back by releasing the previous commit.
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
