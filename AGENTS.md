# Peal

Peal is a social media scheduling platform: teams write posts once, schedule
them across platforms, and see how they perform, at [peal.social](https://peal.social). The
source is public under the Functional Source License (FSL-1.1-ALv2, in
[`LICENSE.md`](LICENSE.md)): anyone may self-host it, and each release becomes
Apache-2.0 two years after it ships. Call it "fair source", not open source.

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
  openapi-generator and committed. Each language's folder is an Nx project
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
  BusyBox), and skip without Docker.
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
  (`impersonation.ts`).
- Workspaces and accounts are deleted through Peal's API only
  (`DeleteWorkspace`, `CloseAccount`): Better Auth's `/organization/delete`
  and the admin plugin's `/admin/remove-user` are disabled and its
  `/delete-user` stays off, as they would leave the other contexts' data.
  Both lock the workspaces they read (`AccountStore.standings`, `workspace`)
  before deciding, so closures, joins and deletions take turns. Each context
  hands its records of a workspace or a user to the workspace context
  through an application port (`ChannelRecords`, `PostRecords`,
  `MediaRecords`, `NoticeRecords`, `UsageRecords`, `AnalyticsRecords`,
  `BillingRecords`, `StaffRecords`, in the shapes of
  `#shared/application/personal-data.ts`),
  which `ContextRecords` reaches. The rows go in one TransactionRunner
  transaction, Better Auth's included (the server's Drizzle on the `auth`
  tables, the Stripe plugin's `subscription` too), and the workspace's media
  folder once it commits. A context that keeps new data about a workspace or
  a user adds it to its records, and its tables to
  `test/workspace/integration/erasure.test.ts`, which fails on a table that
  does not say what becomes of its rows (deleted, left without the user, or
  kept because they name nobody).
- `ContextRecords.eraseWorkspace` asks billing first: `BillingRecords`
  refuses a workspace Stripe may still bill (`stillBills`, or a status the
  Stripe plugin's `auth.subscription` holds that `billsAt` bills, as a
  checkout can complete before Stripe's events come), before anything
  goes, then expires the workspace's open Checkout Sessions at Stripe
  (`Checkouts`, which the workspace context's `StripeCheckoutsLive` backs),
  and refuses still while Stripe itself holds a subscription that `billsAt`
  bills (`Checkouts.atStripe`), as a checkout completed unseen leaves one.
  `DeleteWorkspace` and `CloseAccount`, for the workspaces it deletes,
  answer `WorkspaceSubscribed` (409), or `BillingUnavailable` (503) when
  Stripe does not answer. Closing an account leaves the
  posts its user wrote in the workspaces that remain without an author
  (`PostRecords.forgetAuthor`: `author_id` has no foreign key), and drops the
  connections and account choices they had in progress
  (`ChannelRecords.eraseUser`), and the sessions they opened as staff to act
  as someone else. The channels they connected, with the Facebook user a
  Page's token rests on (`granted_by`), stay with their workspaces, which
  erasing deletes. `data_deletions` names nobody, and stays. In the staff
  audit log (`StaffRecords.forgetUser`), the events about the account lose
  its id and the reason given; the events its user made as staff keep
  their id, a legitimate interest: the operator answers for what staff did
  to other people's accounts. YouTube's upload journal goes with its
  publication calls, and `publishing.quota_usage`, the server's daily
  units, names nobody.
- `AccountData` exports what is tied to the user, the posts they wrote in
  the workspaces they share (`exportAuthored`), and the content of the
  workspaces where they are the only member, with their analytics and
  billing state (plan and subscription statuses, never a card or Stripe's
  ids): those `CloseAccount` deletes. Posts come with each target's
  platform options and whether YouTube kept the video private, and the
  export lists what staff did to the account (action, time, reason),
  without who did it. Sessions staff opened to impersonate
  the user are left out, as Better Auth's own list leaves them out: their
  browser and address are staff's. Closing an account is refused while its
  user alone owns a workspace others use (`planClosure`), and its
  confirmation is emailed in their language. `PasswordCheck` checks a
  password three times within 10 seconds per account at most, as Better
  Auth's own routes do.
- Better Auth is also the OAuth authorization server for the CLI (device
  grant, the `peal-cli` public client registered at startup) and MCP clients
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
  Instagram with `META_APP_ID`/`META_APP_SECRET`, Threads with
  `THREADS_APP_ID`/`THREADS_APP_SECRET`, TikTok with
  `TIKTOK_CLIENT_KEY`/`TIKTOK_CLIENT_SECRET` (`oauthClientConfig`'s
  `idSuffix`), YouTube with `YOUTUBE_CLIENT_ID` and `_CLIENT_SECRET` (a
  Google OAuth client). A platform without its settings is in
  `unconfigured`. Each declares its `TokenPolicy`, data in
  `channels/domain/token-policy.ts`, which the refresh sweep and the
  reconnect warnings follow: LinkedIn's tokens are not renewed and expire
  after 60 days, X's last two hours and rotate on refresh, as TikTok's do
  (`expires_in` decides; refresh tokens end 180 days after sign-in),
  Google's last an hour and do not rotate.
- TikTok's Login Kit for Web takes no PKCE (TikTok asks it of desktop and
  mobile apps only): the state, bound to member and workspace, guards the
  callback, and a token answer naming an `error` is a refusal whatever its
  status. A `PlatformAuthorizer` may have `revoke` (TikTok's guidelines ask
  for it; Google takes it), which `DisconnectChannel` calls once the
  channel is deleted and no other channel, in any workspace, connects the
  same account (`ChannelRepository.accountInUse`), waiting 10 seconds at
  most and logging any failure.
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
  long-lived token that renews itself. Every Graph call carries
  `appsecret_proof` (`#shared/infrastructure/platforms/meta-graph.ts`).
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
  answers its first receipt and deletes nothing more.
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
- Large uploads go in parts read one at a time from the media stream
  (`inParts` in `platforms/byte-parts.ts`): LinkedIn's video parts, X's
  4 MiB appends. LinkedIn calls name `Linkedin-Version`
  (`LINKEDIN_API_VERSION`, a default a test keeps within ten months), and
  send the member's token to LinkedIn's hosts only.
- Meta's adapters hand Meta public media URLs (`MediaForPublishing.publicUrl`,
  two hours), check the daily publishing quota before Threads and Instagram
  containers, and read Graph refusals with
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
  `post:schedule`. Every notice reaches the
  app; `NotificationPreferences` say which are also emailed (failed and
  unconfirmed posts and channels to reconnect by default, not published
  posts). A preferences change writes only what it names.
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
  self-hosted server limits nothing.
- Plans are `billing/domain/plans.ts`; their ids (`#shared/domain/plan.ts`),
  the limits' names (`plan-limit.ts`), `PlanLimitReached` and
  `roomForOneMore` (`allowance.ts`) are in the shared kernel, since every
  context checks a limit. The contract copies them, kept equal by
  `test/billing/api/contract.test.ts`.
- Each context checks its own limit when something is added, through a port
  of its own backed by the billing context's `WorkspaceEntitlements`:
  `ChannelAllowance` (connecting a new account: on start, and again before
  the channel is added; accounts chosen together need room for all of them,
  checked before the choice is taken), `PostAllowance` (a post scheduled or
  moved into a month, UTC: drafts and cancelled posts are left out, and a
  repost adds nothing, as `countGoingOut` counts posts, not rounds),
  `AssistantAllowance`, and members in Better Auth's organization hooks
  (`workspace/infrastructure/auth/billing.ts`: pending invitations count when
  inviting). Channels and posts are counted and added under a transaction's
  advisory lock (`ChannelRepository.addingTo`, `PostRepository.claimMonth`),
  so requests sent together never pass a limit. A workspace over a smaller
  plan's limits keeps what it has. Each context also counts for the billing
  page (`ChannelUsage`, `PostUsage`, `WorkspaceSeats`, `AssistantRequests`),
  so `BillingOverviewLive` is built after the contexts it reads.
- Entitlements come only from `billing.subscriptions`, which
  `RecordSubscription` keeps from Stripe's `customer.subscription.*` events:
  Better Auth's webhook checks their signature, then its `onEvent` finds the
  workspace by its Stripe customer and the plan by its price. An event is
  recorded once (`billing.stripe_events`), never over a newer one; Stripe
  dates events to the second, so of two in the same second the one further
  along the subscription's life wins (`lifecycleStage`). A failure answers
  the webhook an error, so Stripe sends it again. Active, trialing and past
  due subscriptions give their plan.
- Better Auth's subscription routes take `customerType: "organization"` and
  the workspace as `referenceId` only, for members with `billing:manage`,
  never staff impersonating them. Checkout sends Stripe Tax's parameters
  when `STRIPE_AUTOMATIC_TAX` is on. A workspace Stripe may still bill
  (`billsAt`: any status but cancelled or incomplete, unpaid and paused
  included, in `billing.subscriptions` or the plugin's `auth.subscription`)
  is not deleted: Peal's own deletions ask `BillingRecords` first (see
  Accounts and access), which also expires its open checkouts. Better
  Auth's `/organization/delete` is disabled, so its hook refuses nothing.
- Never call Stripe in tests: checkout and the portal run against
  stripe-mock, and webhooks post the payloads in
  `test/billing/fixtures/webhooks`, signed in the test.

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
- Platforms without a reader (LinkedIn, X and Meta's so far) answer
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
  at most, so it moves on however many went live together. It reads 5000
  due posts at most, taking turns between channels (`TrackedPosts.due`
  numbers each channel's with `row_number()`), so posts put off on a
  platform that is down never crowd the other channels out.
- Summaries take the posts published over a range of days in an IANA zone:
  the domain computes each day's start with `fromWallClock`, and Postgres
  buckets snapshots with those instants (`width_bucket`), never its zones.
- Test `CollectMetrics` on the in-memory store
  (`test/analytics/fakes/memory-tracked-posts.ts`). Postgres tests write under
  a workspace of their own, at instants no other suite uses, and delete it
  after (`forgetWorkspace`): the collection reads every row that is due.

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
  `reports-tools.ts`, `people-tools.ts`) and its handlers beside it, merged
  into `PealTools`. Annotate every tool with `reading`, or
  `changing({ destructive, idempotent, openWorld })` from `annotations.ts`,
  and say in its description what it changes. Refusals are `ToolRefused`,
  with a message the user can act on (`refusals.ts`). The account's own
  data (its export, its applications) has no tool.
- What the web app's composer sends, the CLI and the tools send too: a
  draft's per-channel `options` (`create_draft`, `update_draft`, `peal
  drafts save --options`), and TikTok's creator before a TikTok post
  (`get_tiktok_creator`, `peal channels tiktok`). The API's update replaces
  a draft's options; `update_draft` and `peal drafts save` keep those of the
  channels it keeps unless told otherwise, so a rewrite never drops them.
  Every failure reason has its words in the CLI (`posts.ts`
  `failureReasons`, typed by the contract) and in `get_post`'s
  description: add a reason there with the others. Neither schedules.

### Database

- The server reads `DATABASE_URL` (required) with `Config.Redacted`.
  `DatabaseLive` in `#shared/infrastructure/database.ts` provides `PgClient`,
  Effect's `SqlClient` and the `Drizzle` service on one pool, which the
  cluster shares. Better Auth runs on a small pool of its own
  (`AUTH_DB_POOL_MAX`). Repositories use `Drizzle`, or `SqlClient` for raw
  SQL.
- Each context keeps its tables in a Postgres schema named after it
  (`publishing`, `channels`, `media`, `notifications`, `assistant`,
  `analytics`, `billing`, `staff`; the workspace context's are Better
  Auth's, in `auth`). Effect creates its `cluster_*` tables in `public`; drizzle-kit
  never manages them.
- Declare a context's tables in `src/<context>/infrastructure/schema.ts`, then
  run `nx run peal-server:db:generate`, which writes a migration folder under
  `packages/peal-server/drizzle/`. Commit the folder as drizzle-kit wrote it;
  never edit a migration that has shipped.
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
  signal off).

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
  `invitations` and `api-keys`) and `…/billing`. The staff console is
  `admin` (the system's health), `admin/users`, `admin/users/[userId]`,
  `admin/workspaces`, `admin/workspaces/[workspaceId]` and `admin/audit`:
  its layout and pages read the staff endpoints with the visitor's cookies
  through `staffRead` (`#staff/server.ts`), which shows the not-found page
  for any 404, and its actions are mutations from `#staff/atoms.ts`.
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
- The billing page shows `GET …/billing` (`BillingView` renders each state)
  and opens Stripe's checkout and customer portal through `billingClient`
  (`#auth/billing-client.ts`, Better Auth's Stripe client), with
  `disableRedirect` and the page as the way back. Explain a
  `PlanLimitReached`, and Better Auth's `MEMBER_LIMIT_REACHED`, wherever they
  surface, from the `Billing` catalogue and `Auth.errors`.
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
  `analytics`, `billing`, `members` and `invitations`, which act in the
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
  of its own in the contract.
- Never edit a generated file: change the contract, the scripts or the
  generator's options, then `bun run sdk:generate`. Each language's
  `sdk:generate` deletes what its previous run wrote (`.openapi-generator/FILES`)
  before writing, so nothing stale stays. The files a folder's
  `.openapi-generator-ignore` names are ours: `LICENSE`, `project.json`, and
  Node's `package.json` and `tsconfig.json` (ES modules, compiled by the
  workspace's TypeScript); the rest of that list keeps CI templates, Gradle
  files, test stubs and copies of the document out.
- `sdk:generate` depends on `peal-sdk:spec` through the tag `sdk-spec`, never
  the name: Nx resolves a name in `dependsOn` to the npm package of that name
  first, and the Node SDK's package is `peal-sdk`. `.nxignore` keeps the
  SDKs' builds out of the project graph (`cargo package` unpacks a copy of
  the Rust SDK, `project.json` included). `generate.ts` refuses to run
  without `openapi.json`, which only Nx writes before it.
- `scripts/languages.ts` holds each language's generator options, version and
  build, and pins openapi-generator and every toolchain image by digest, as
  `compose.yaml` does. A release bumps that language's version there. Keep
  generation deterministic (`hideGenerationTimestamp`, the fixed
  `packageGuid` of .NET): `sdk:check` compares two runs' output through Git.
- `scripts/finish.ts` fills what the templates leave as placeholders in each
  manifest (PyPI's `peal-sdk` name, .NET's authors, Rust's links). Each
  replacement fails when its text is missing, so a generator upgrade that
  changes a template stops there: update the replacement.
- The SDKs' manifests keep the generator's dependency ranges, and their lock
  files (`Gemfile.lock`, `composer.lock`, `Cargo.lock`) stay out of Git: a
  library leaves its dependencies' versions to the projects that install it.
- `sdk:build` builds each SDK as its registry would get it, then loads it:
  TypeScript and Python with the workspace's tools, the others in their image
  (`scripts/container.ts`: as the calling user, with their downloads cached in
  `.cache/sdk`). Ruby uses Faraday, which needs no libcurl; Rust uses rustls,
  which needs no OpenSSL. Go's module is
  `github.com/peal-social/peal/packages/peal-sdk/go`; as Go names each model's
  constructor `New<Model>`, its SDK calls a schema `New<X>` next to `<X>`
  `Create<X>Request`.
- Each SDK is released alone, by a tag `sdk-<language>-v<version>` on a
  commit whose `scripts/languages.ts` gives that version
  (`scripts/release.ts` refuses another). `sdk-release.yml` builds it from
  that commit and publishes it in the `sdk-release` environment: trusted
  publishing (OIDC) for npm, PyPI, RubyGems, NuGet and crates.io, no token
  stored; Maven Central's portal token and signing key from secrets (the
  `release` profile, which `finish.ts` adds to the pom: BouncyCastle signing
  and Sonatype's plugin); a tag `packages/peal-sdk/go/v<version>` for Go; a
  tag `v<version>` on `peal-social/peal-php` for Packagist. That repository
  is a read-only copy of `packages/peal-sdk/php` (`git subtree split`), which
  `sdk-php-mirror.yml` updates from `main` with the deploy key in
  `PHP_MIRROR_DEPLOY_KEY` (`.github/scripts/push-php-mirror.sh`); never
  commit to it.
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
- Site strings live in `packages/peal-site/src/i18n/messages.ts`, legal
  documents in `src/content/legal/<locale>/<document>.md`. Keep a legal
  document `draft: true` (banner and noindex) until legal review approves it,
  and never replace a [bracketed placeholder] with a guess.
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

- Production runs on a Hetzner server managed with Ansible from `peal-infra`,
  reachable only through a Cloudflare Tunnel: no inbound ports, SSH included.
  Cloudflare Zero Trust Access guards Grafana, the admin (`/api/auth/admin`,
  the staff console's `/api/admin`, `/admin`, `/en/admin` and `/fr/admin`) and the
  sandbox, and cloudflared checks the Access token on those routes too. Caddy fronts the
  stack for self-hosters.
- Change the servers only through the playbooks in `packages/peal-infra`; SSH
  is for reading (`sudo peal-compose ps`). Run `site.yml` with `--check
  --diff` before applying it, and keep every task idempotent: a second run
  reports no change. The inventory holds placeholders that `peal_preflight`
  refuses; nothing has been applied yet.
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
- A separate Hetzner server checks uptime (`uptime.yml`, inventory group
  `uptime`): Gatus, its configuration generated from the inventory, checks
  the public endpoints of production and the sandbox and alerts on a
  Telegram bot of its own; Caddy is its only public entry, for the heartbeat
  production's Grafana posts every few minutes. It shares no secret, tunnel
  or network with them: it generates the heartbeat token, which production
  holds as a credential (`PEAL_HEARTBEAT_TOKEN`). Keep `uptime_environments`
  equal to each environment's host names; Gatus's dashboard stays on
  127.0.0.1, and a public status page is the owner's decision.
- Secrets are generated on the server and stay there. Do not copy them, print
  them, or give the server's credentials to other systems, GitHub included:
  `release.yml` builds the images on the machine running Ansible and uploads
  them. Credentials outside services issue come from a Git-ignored vault or
  are written on the server, and Ansible checks them by name only.
- Postgres archives its write-ahead log and is backed up to R2 with
  pgBackRest; the backup passphrase is the one secret kept outside the server
  too. `runbooks/restore-database.md` restores it. The server migrates when it
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
