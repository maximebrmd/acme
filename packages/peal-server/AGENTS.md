# Peal server

Each context's rules are in a guide of its own. Read it before changing the
context, its tests under `test/<context>/` included, and each one's when a
change crosses several:

| Context              | Guide                                                        |
| -------------------- | ------------------------------------------------------------ |
| `workspace`, `staff` | [`src/workspace/AGENTS.md`](src/workspace/AGENTS.md)         |
| `legal`              | [`src/legal/AGENTS.md`](src/legal/AGENTS.md)                 |
| `channels`           | [`src/channels/AGENTS.md`](src/channels/AGENTS.md)           |
| `publishing`         | [`src/publishing/AGENTS.md`](src/publishing/AGENTS.md)       |
| `media`              | [`src/media/AGENTS.md`](src/media/AGENTS.md)                 |
| `notifications`      | [`src/notifications/AGENTS.md`](src/notifications/AGENTS.md) |
| `assistant`          | [`src/assistant/AGENTS.md`](src/assistant/AGENTS.md)         |
| `billing`            | [`src/billing/AGENTS.md`](src/billing/AGENTS.md)             |
| `analytics`          | [`src/analytics/AGENTS.md`](src/analytics/AGENTS.md)         |
| `webhooks`           | [`src/webhooks/AGENTS.md`](src/webhooks/AGENTS.md)           |
| `review`             | [`src/review/AGENTS.md`](src/review/AGENTS.md)               |
| `engagement`         | [`src/engagement/AGENTS.md`](src/engagement/AGENTS.md)       |
| `activity`           | [`src/activity/AGENTS.md`](src/activity/AGENTS.md)           |
| `ads`                | [`src/ads/AGENTS.md`](src/ads/AGENTS.md)                     |
| the MCP endpoint     | [`src/app/mcp/AGENTS.md`](src/app/mcp/AGENTS.md)             |

The shared kernel's rules are below.

## Server architecture

The server follows DDD and Clean Architecture. Each bounded context in
`packages/peal-server/src/` has four layers, plus a `container.ts` that wires
them:

| Context         | Holds                                                                                                                                                           |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `publishing`    | posts, their channels and media, schedules, attempts, the platform adapters, and what a workspace saves to write and file them (tags, signatures, channel sets) |
| `channels`      | connected accounts, connect flows, encrypted tokens and their renewal                                                                                           |
| `media`         | uploads, storage, probing, alt text, files handed to platforms                                                                                                  |
| `workspace`     | accounts, workspaces, members, roles, API keys, OAuth, partner accounts                                                                                         |
| `notifications` | account emails, in-app notices, their emails, notification preferences                                                                                          |
| `assistant`     | the writing assistant: prompts, language models, the daily quota                                                                                                |
| `shared`        | the kernel the others build on                                                                                                                                  |
| `analytics`     | the posts it follows, snapshots of their counts, the hourly collection                                                                                          |
| `billing`       | plans, subscriptions, entitlements, the billing page's usage                                                                                                    |
| `staff`         | the staff console: what staff read and do, and the audit log of it                                                                                              |
| `engagement`    | the inbox: comments under published posts, replies sent to them, their collection                                                                               |
| `activity`      | each workspace's activity log, and the requests counted for the rate limit                                                                                      |
| `webhooks`      | endpoints, their signing secrets, events, deliveries and the delivery log                                                                                       |
| `legal`         | what French law has a host keep, and the legal requests that read it                                                                                            |
| `review`        | approval policies, requests and decisions, review links, comments                                                                                               |
| `ads`           | ad accounts, what they may spend, what is read of them, boosts                                                                                                  |

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

- Every route the server answers starts with `/api`, apart from `/openapi.json`,
  the OAuth discovery documents under `/.well-known/oauth-*`, the API
  catalogue `/.well-known/api-catalog` and `/llms.txt`. The web app forwards
  `/api/*` and those documents unchanged (`servedByApi`, and the matcher of
  `src/proxy.ts`: add a path to both), so Peal has one public origin;
  `/openapi.json` is reachable on the server only, and `/api/openapi.json` is
  the same document for everyone: the contract's `openApiDocument()`, the
  events webhooks send included, both served by the discovery routes.
- `ApiAnswersLive` (`src/app/answers.ts`), a global router middleware in
  `RoutesLive`, shapes every answer, a failure's included (it changes the
  response a cause would get and fails with the same cause, so logging,
  counting and tracing stay as they were: `mapFailureResponse`): the request
  id (`X-Request-Id`: the caller's when it is 8 to 128 of `[\w.:-]`, a UUIDv7
  otherwise; `peal.request_id` on log lines and the span; `RequestId` from
  `#shared/api/request-id.ts` for handlers), the headers handlers and
  middlewares left for it (`setAnswerHeader`, `#shared/api/answer-headers.ts`:
  an error is encoded after they ran), a deprecated endpoint's headers, and
  the error envelope.
- Every error of the API is one envelope: its own fields, then `code`,
  `message` and `requestId` (`errorEnvelope`, which every contract error
  spreads first; `enveloped` in `src/app/error-envelope.ts` fills them). A
  code is the tag in snake case (`errorCodeOf`), `message` the error's own
  words or its description. An answer without a body gets the general error
  of its status (`generalErrors`: `not_found`, `internal_error`…, never more
  than the status says, so the staff console's 404 and a missing route stay
  alike), and a request the API could not decode `InvalidRequest` with its
  `issues`. Better Auth's routes and the MCP endpoint keep their own shapes.
  `errorCatalogue()` (`peal-contract/errors`) reads the list from the
  contract: `test/app/fixtures/error-codes.json` freezes the published codes
  (`UPDATE_ERROR_CODES=1` adds new ones; never remove or rename one), and the
  docs' "API conventions" page lists them all, in both languages, which
  `test/app/error-catalogue.test.ts` checks.
- Handlers answer a use case's refusal with `forbidden` from
  `#shared/api/forbidden.ts` (`MissingPermission: forbidden`,
  `personRequired()`): it gives `Forbidden` its `reason` and `permission`.
  `WorkspaceAccess` then tells it to the member (`#workspace/api/refusal.ts`):
  an OAuth client without the scope gets `missingScope`, the scope and the
  RFC 6750 `insufficient_scope` challenge; a key or a role, who gives the
  permission. Never answer a bare `new Forbidden()`. Endpoints of the
  partner API, whichever context serves them, take the key and refuse it
  through `#shared/api/partner-key.ts` (`partnerKeyOnly`,
  `withoutPartnerScope`, `partnerClosed`), in the same words.
- Bearer credentials are rate limited (`RequestLimits`, backed by the
  activity context's `RequestLimiter`): `PEAL_API_REQUESTS_PER_MINUTE` (600)
  per API key, and per OAuth client and user (`limitSubjectOf`: a key counts
  by its id, whatever it belongs to), in fixed one-minute windows, one upsert
  per request on `activity.request_counts` under the subject's SHA-256, the
  same count for the API and the MCP endpoint; sessions are not counted. Every
  such answer carries `RateLimit-Policy` and `RateLimit` (the IETF draft's
  structured fields); past the limit `Authentication` answers
  `TooManyRequests` (429, `Retry-After`) as a response, not a failure, which
  its next security scheme would turn into a 401. A count that cannot be
  kept lets the request through. Better Auth's own per-key limit stays off.
- A workspace write (any method but GET, HEAD, OPTIONS) is kept in the
  workspace's activity log by `WorkspaceAccess`, done, refused or failed
  (`recorded`, `#workspace/api/activity-recording.ts`, through
  `ActivityJournal`), and so is each call of an MCP tool that changes
  something (`recordToolCall`, as `mcp.<tool>`, without a status), by the
  MCP middleware around the tool (`recordedCalls`, `src/app/mcp/`): only a
  call that ran is kept, with `tool_refused` when the tool answered an
  error and `tool_failed` when the call gave no answer, never what a
  request's body names. Better Auth's routes that change a workspace
  (`changesWorkspace`: `/organization/*` and `/subscription/*` but those
  that read) are kept by its after hook (`recordWorkspaceChange`), as
  `auth:/path`, for requests browsers send: a refusal only for a member,
  as anyone can name a workspace. Keeping it never changes an answer.
- The discovery documents (`src/app/discovery/`) need no credentials and are
  written from `PUBLIC_URL`, `PEAL_DOCS_URL` and the contract: the API
  catalogue (RFC 9727, a Linkset), `/api/openapi.json`, the MCP server card
  at `/api/mcp/server-card` (SEP-2127: `application/mcp-server-card+json`,
  CORS for any origin, an ETag) and `/llms.txt`. Implement a discovery
  document only where a specification gives its path and format, and read
  the specification first.
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

### The cluster

- Publishing runs as Effect Workflows, and token refresh, reconnect warnings
  and retention as `ClusterCron`s, stored in Postgres. There is no Redis.
- `src/app/cluster.ts` builds a `SingleRunner` with SQL message and runner
  storage on the same pool as Drizzle, so `TransactionRunner`
  (`shared/application`) saves rows and starts a workflow in one transaction.
  The runner's name comes from `HOSTNAME`, never `HOST` or `PORT`; shards are
  held with session advisory locks, storage is polled every 2 seconds, and
  shutdown waits up to 60 seconds for platform calls in flight.
- The crons that call platforms through the gates (post counts at minute
  7, accounts at 37, comments every ten minutes from 2, the token sweep
  every ten from 0) never start on the same minute, and a collection
  starts on a minute no other cron does: `test/app/cron-schedules.test.ts`
  reads every `ClusterCron.make` in `src/` and fails otherwise. A gate
  runs calls in the order they came, so a publish waits for one read of
  each collection at most (`test/publishing/infrastructure/channel-gate.test.ts`).
- Register crons in `src/app/crons.ts`. Workflow tags, payloads, idempotency
  keys, activity and clock names, result schemas and cron names are persisted
  contract: add a payload field with a decoding default or a union member,
  never rename or remove one, and for a breaking change add a V2 beside V1 and
  drain it. Keep the fixtures in
  `test/publishing/infrastructure/fixtures/persisted` and
  `test/notifications/infrastructure/fixtures/persisted` decoding.

### Database

- The server reads `DATABASE_URL` (required) with `Config.Redacted`.
  `DatabaseLive` in `#shared/infrastructure/database.ts` provides `PgClient`,
  Effect's `SqlClient` and the `Drizzle` service on one pool, which the
  cluster shares. Better Auth runs on a small pool of its own
  (`AUTH_DB_POOL_MAX`). Repositories use `Drizzle`, or `SqlClient` for raw
  SQL.
- Each context keeps its tables in a Postgres schema named after it
  (`publishing`, `channels`, `media`, `notifications`, `assistant`,
  `analytics`, `billing`, `staff`, `legal`, `review`, `webhooks`, `engagement`, `ads`; the
  workspace context's are Better Auth's, in `auth`). Effect creates its
  `cluster_*` tables in `public`; drizzle-kit never manages them.
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
- The server migrates when it starts, so write migrations that the previous
  release can still run against, and roll back by releasing the previous
  commit.

### Metrics and alerts

- Every metric that says a job falls behind has an alert rule
  (`packages/peal-docker/test/alerting.test.ts`): add the rule with the
  metric.
- Text Peal did not write is made storable before it is kept:
  `storableText` and `storableLine` (`#shared/domain/platform-text.ts`)
  make it well formed (Postgres takes no NUL, and no lone surrogate in
  JSON), drop control characters, bound it by characters, and, for a name
  or any single line, drop line breaks and the marks that reorder what is
  around it. Clean where the text enters, before it is compared, stored or
  put in a job's history: comments and their authors (`storableReading`),
  what a sign-in says of an account (`storableAuthorized`), what a
  platform answers a publishing call with (`storableResult`,
  `storableFailure`, in the routed publisher), a file's codec, a webhook
  receiver's answer (`excerptOf`), what visitors type on a review page
  (`review/domain/plain-text.ts`) and the names an ad network gives an ad
  account, a campaign, an ad set or an ad (`ads/infrastructure/meta/
  marketing-mapping.ts`); an ad network's refusal keeps its codes, never
  its words. A new place a platform's string is
  kept goes through the helper, with a test that hands it a NUL and half
  a surrogate pair.
