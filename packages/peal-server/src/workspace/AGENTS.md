# Accounts and access (workspace)

The staff context follows these rules too. What the law has a host keep is in
[`../legal/AGENTS.md`](../legal/AGENTS.md).

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
- `AccountData` exports what is tied to the user, the posts they wrote in
  the workspaces they share (`exportAuthored`), and the content of the
  workspaces where they are the only member, with their analytics and
  billing state (plan and subscription statuses, never a card or Stripe's
  ids): those `CloseAccount` deletes. Posts come with each target's
  platform options and whether YouTube kept the video private, and the
  export lists what staff did to the account (action, time, reason, and
  for changes made as it the operation, workspace and object ids),
  without who did it, and never a legal request answered about it
  (`legalDisclosure`): telling the person can be forbidden, so nothing the
  user sees says one was made, until counsel says when Article 15 requires
  it. Sessions staff opened to impersonate
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
  category there, or joins one: webhook endpoints and their delivery log
  have theirs (`webhooks`), how a post was created and scheduled and the
  idempotency keys' digests are in `content`, and requests to cancel or
  withdraw in `contracts`. What only the operator knows (controller, policy URL,
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
- Better Auth's routes that count members or invitations
  (`workspace/infrastructure/auth/routes.ts`) answer 400 `INVALID_ID` to an
  `organizationId` or `invitationId` that is not a lower-case UUID, and
  `checkMemberRoom` fails closed: an id the limit cannot be read for is
  never let through. `WorkspacePeople.reseating` reads, decides and removes
  under the workspace's invitations lock, so two owners keeping only
  themselves never empty a workspace.
- `DeleteWorkspace` and `CloseAccount` write the erasure ledger before
  settling at Stripe, and run everything after settling uninterruptibly: a
  client that goes away never leaves subscriptions cancelled and nothing
  deleted, or rows deleted and their files kept. `ErasureLedger` skips
  entries it cannot decode and counts them (`unreadable`); the replay then
  exits non-zero. Replaying an account's erasure runs `planClosure` on what
  the restore brought back, and refuses with `LastOwner`.

## Partner accounts

- A partner account lets a product use Peal for its own customers
  ([Embedding Peal](packages/peal-docs/docs/embedding.mdx)). It belongs to
  one **home workspace**, whose owners and admins manage it (`partner:read`,
  `partner:manage`, the second withheld while impersonating), and owns one
  workspace per customer: a Better Auth organization with no member, tied
  to it in `workspace.partner_workspaces` with the partner's own id for it
  (`externalId`, unique per partner). The workspace context's own tables are
  in the Postgres schema `workspace` (`workspace/infrastructure/schema.ts`);
  Better Auth's stay in `auth`.
- An account is opened by staff (`StaffPartners.grant`, the `grantPartner`
  audit action, `POST /api/admin/workspaces/:workspaceId/partner`), or by
  the workspace's owners and admins when `PEAL_PARTNER_SELF_SERVICE` is
  true (`PartnerSettings`); otherwise opening answers `PartnerAccountsClosed`.
  It prices nothing: `MeterPartnerUsage` (the `workspace.partner-usage`
  cron) keeps each day's workspaces and channels in
  `workspace.partner_usage_days`, which `GET /api/partner` answers.
- A partner key is `peal_partner_` and 32 random bytes, kept as its SHA-256
  (`partner_keys`), created by a person in their own session only
  (`PersonRequired` otherwise), shown once. It carries scopes
  (`workspaces:read`, `:write`, `:delete`) for `/api/partner`, and the
  permissions it holds in each workspace, out of `partnerKeyPermissions`
  (`workspace/domain/partner-key.ts`): never members, invitations, API keys
  or billing changes. `Authentication` answers it as a
  `PartnerKeyPrincipal`; `WorkspaceAccess` lets it into a workspace its
  partner owns and answers 404 for every other, the home workspace
  included (`PartnerOwnership.ownerOf`). `/api/me` and the groups for
  people answer it 403, and `/api/partner` answers 403 to anything else.
  `test/workspace/integration/partners.test.ts` holds the matrix: add a
  new workspace group to it.
- `PartnerWorkspaces` creates, lists (counts, `externalId`, `name`,
  `before`), changes and offboards. Creation is idempotent twice over:
  `externalId` taken answers `ExternalIdTaken` with the workspace's id, and
  an `Idempotency-Key` answers its first workspace for 24 hours
  (`partner_idempotency_keys`; another body is `IdempotencyKeyReused`).
  `OffboardWorkspace` erases through the same erasure as `DeleteWorkspace`
  (`ContextRecords`), never beside it. A home workspace is not deleted, its
  owner's account not closed and the partner account not closed while it
  owns a workspace (`PartnerOwnership.ensureDeletable`,
  `PartnerOwnsWorkspaces`, 409).
- A workspace a partner owns takes the home workspace's plan (`PlanHolders`,
  `WorkspaceEntitlements.layerShared`). Channels are counted across the
  home workspace and every workspace the partner owns, under the partner's
  advisory lock (`CustomerWorkspaces.hold`, `ChannelAllowance.sharedWith`,
  `SharedChannelAllowanceLive`); the other limits apply per workspace.
  Locks are taken in one order, never the other way: a connect link's row
  (`ConnectLinkStore.lock`), then the workspace's channel additions
  (`ChannelRepository.addingTo`), then the partner's hold, which
  `ChannelAllowance.sharedWith` takes inside `addingTo`; scheduling takes
  the partner's hold inside its own transaction, and holds no channel
  lock. Creating a customer's workspace and closing the account take the
  partner's hold alone. Tests that need no
  partner keep the unshared layers (`WorkspaceEntitlements.layer`,
  `PlanChannelAllowanceLive`, `PartnerOwnership.layerNone`,
  `EventOrigins.layerNone`).
