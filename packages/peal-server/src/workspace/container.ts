import { Layer } from "effect";

import { KeyedPseudonymsLive } from "#shared/infrastructure/keyed-pseudonyms.ts";
import { AccountHandlers } from "#workspace/api/account.ts";
import { ApiKeysHandlers } from "#workspace/api/api-keys.ts";
import { CaptchaHandlers } from "#workspace/api/captcha.ts";
import { ConnectedAppsHandlers } from "#workspace/api/connected-apps.ts";
import {
  InvitationsHandlers,
  MembersHandlers,
} from "#workspace/api/members.ts";
import { PartnerAccountHandlers } from "#workspace/api/partner-account.ts";
import { PartnerHandlers } from "#workspace/api/partner.ts";
import {
  AuthenticationLive,
  StaffAccessLive,
  WorkspaceAccessLive,
} from "#workspace/api/security.ts";
import { SessionHandlers } from "#workspace/api/session.ts";
import { WorkspacesHandlers } from "#workspace/api/workspaces.ts";
import { AccountData } from "#workspace/application/account-data.ts";
import { AccountStanding } from "#workspace/application/account-standing.ts";
import { Accounts } from "#workspace/application/accounts.ts";
import { ActorsNow } from "#workspace/application/actors-now.ts";
import { ApiKeys } from "#workspace/application/api-keys.ts";
import { Authenticate } from "#workspace/application/authenticate.ts";
import { CloseAccount } from "#workspace/application/close-account.ts";
import { ConnectedApps } from "#workspace/application/connected-apps.ts";
import { DeleteWorkspace } from "#workspace/application/delete-workspace.ts";
import { ImpersonationGuard } from "#workspace/application/impersonation-guard.ts";
import { MeterPartnerUsage } from "#workspace/application/meter-partner-usage.ts";
import { OffboardWorkspace } from "#workspace/application/offboard-workspace.ts";
import { Overview } from "#workspace/application/overview.ts";
import { PartnerAccounts } from "#workspace/application/partner-accounts.ts";
import { PartnerKeys } from "#workspace/application/partner-keys.ts";
import { PartnerOwnership } from "#workspace/application/partner-ownership.ts";
import { PartnerTenants } from "#workspace/application/partner-tenants.ts";
import { PartnerWorkspaces } from "#workspace/application/partner-workspaces.ts";
import { ReplayErasures } from "#workspace/application/replay-erasures.ts";
import { ResolveMember } from "#workspace/application/resolve-member.ts";
import { SignUpGate } from "#workspace/application/sign-up-gate.ts";
import { StaffStanding } from "#workspace/application/staff-standing.ts";
import { WorkspaceContacts } from "#workspace/application/workspace-contacts.ts";
import { WorkspaceMembers } from "#workspace/application/workspace-members.ts";
import { WorkspaceSeats } from "#workspace/application/workspace-seats.ts";
import { WorkspaceSecurity } from "#workspace/application/workspace-security.ts";
import { WorkspaceStanding } from "#workspace/application/workspace-standing.ts";
import { AccountModerationLive } from "#workspace/infrastructure/auth/account-moderation.ts";
import { ApiKeyIssuerLive } from "#workspace/infrastructure/auth/api-key-issuer.ts";
import { BetterAuthLive } from "#workspace/infrastructure/auth/better-auth.ts";
import { CaptchaChallengeLive } from "#workspace/infrastructure/auth/captcha-challenge.ts";
import { CliClientLive } from "#workspace/infrastructure/auth/cli-client.ts";
import { AuthGatewayLive } from "#workspace/infrastructure/auth/gateway.ts";
import { LegalConnectionJournal } from "#workspace/infrastructure/auth/legal-connection-journal.ts";
import { PasswordCheckLive } from "#workspace/infrastructure/auth/password-check.ts";
import { AuthSettings } from "#workspace/infrastructure/auth/settings.ts";
import { WorkspacePeopleLive } from "#workspace/infrastructure/auth/workspace-people.ts";
import { ContextChannelCountsLive } from "#workspace/infrastructure/context-channel-counts.ts";
import { ContextOverviewSourcesLive } from "#workspace/infrastructure/context-overview-sources.ts";
import { ContextRecordsLive } from "#workspace/infrastructure/context-records.ts";
import { CountedRequestLimits } from "#workspace/infrastructure/counted-request-limits.ts";
import {
  ErasureLedgerRetentionCron,
  PartnerUsageCron,
} from "#workspace/infrastructure/crons.ts";
import { AccountDirectoryLive } from "#workspace/infrastructure/drizzle-account-directory.ts";
import { DrizzleAccountStore } from "#workspace/infrastructure/drizzle-account-store.ts";
import { DrizzleConnectedAppStore } from "#workspace/infrastructure/drizzle-connected-app-store.ts";
import { DrizzleCredentialNames } from "#workspace/infrastructure/drizzle-credential-names.ts";
import { DrizzleCustomerWorkspaces } from "#workspace/infrastructure/drizzle-customer-workspaces.ts";
import { DrizzleImpersonationSessions } from "#workspace/infrastructure/drizzle-impersonation-sessions.ts";
import { MemberDirectoryLive } from "#workspace/infrastructure/drizzle-member-directory.ts";
import { DrizzlePartnerStore } from "#workspace/infrastructure/drizzle-partner-store.ts";
import { SecurityPoliciesLive } from "#workspace/infrastructure/drizzle-security-policies.ts";
import { DrizzleSignUpStore } from "#workspace/infrastructure/drizzle-sign-up-store.ts";
import { WorkspaceRosterLive } from "#workspace/infrastructure/drizzle-workspace-roster.ts";
import { EmailedAccountMail } from "#workspace/infrastructure/emailed-account-mail.ts";
import { LoggedActivityJournal } from "#workspace/infrastructure/logged-activity-journal.ts";
import { PartnerSettingsLive } from "#workspace/infrastructure/partner-settings.ts";
import { PrivacyDeclarationLive } from "#workspace/infrastructure/privacy-declaration-file.ts";
import { RandomPartnerKeyTokens } from "#workspace/infrastructure/random-partner-key-tokens.ts";
import { S3ErasureLedger } from "#workspace/infrastructure/s3-erasure-ledger.ts";
import { SignUpSettingsLive } from "#workspace/infrastructure/sign-up-settings.ts";
import { StaffImpersonationLog } from "#workspace/infrastructure/staff-impersonation-log.ts";
import { StaffSettingsLive } from "#workspace/infrastructure/staff-settings.ts";

// Where the partner accounts, their keys and the workspaces they own are
// kept: the database alone.
const PartnerStoresLive = Layer.mergeAll(
  DrizzlePartnerStore,
  DrizzleCustomerWorkspaces
);

/**
 * Whose each workspace is, for the contexts that follow from it: billing,
 * which the workspace context itself is built on, the channels context and
 * the webhooks. Needs the database alone.
 */
export const PartnerOwnershipLive = PartnerOwnership.layer.pipe(
  Layer.provide(PartnerStoresLive)
);

const AdaptersLive = Layer.mergeAll(
  AuthGatewayLive,
  MemberDirectoryLive,
  WorkspaceRosterLive,
  ApiKeyIssuerLive,
  CliClientLive,
  WorkspacePeopleLive,
  PartnerStoresLive,
  RandomPartnerKeyTokens,
  PartnerSettingsLive,
  StaffSettingsLive,
  DrizzleAccountStore
);

const UseCasesLive = Layer.mergeAll(
  // Who a job that acts for someone acts as now, with their applications'
  // grants as they now stand.
  ActorsNow.layer.pipe(
    Layer.provide(Layer.merge(DrizzleConnectedAppStore, ResolveMember.layer))
  ),
  Accounts.layer,
  AccountStanding.layer,
  ApiKeys.layer,
  // A bearer token may be a partner key, which the partner's keys check.
  Authenticate.layer.pipe(Layer.provideMerge(PartnerKeys.layer)),
  PartnerAccounts.layer,
  ResolveMember.layer,
  StaffStanding.layer,
  WorkspaceContacts.layer,
  WorkspaceMembers.layer,
  WorkspaceStanding.layer,
  WorkspaceSeats.layer,
  WorkspaceSecurity.layer
);

// What the staff console reads of accounts and workspaces, and does to
// accounts, which the staff context reaches through ports of its own.
const StaffToolsLive = Layer.mergeAll(
  AccountDirectoryLive,
  AccountModerationLive
);

/**
 * What the workspaces' API keys and the OAuth clients acting for members
 * are called, for the contexts that record which one did something. Needs
 * the database.
 */
export { DrizzleCredentialNames as CredentialNamesLive } from "#workspace/infrastructure/drizzle-credential-names.ts";

// The account an email address signs in to, which billing asks for when a
// contract's cancellation comes without a session.
export { DrizzleAccountLookup as AccountLookupLive } from "#workspace/infrastructure/drizzle-account-lookup.ts";

// What every request in a session staff act as someone in goes through,
// from Peal's API and Better Auth's routes alike: the staff member's
// standing, read fresh, and the audit log, the staff context's.
const ImpersonationGuardLive = ImpersonationGuard.layer.pipe(
  Layer.provide(
    Layer.mergeAll(
      AccountDirectoryLive,
      DrizzleImpersonationSessions,
      StaffImpersonationLog
    )
  )
);

/**
 * The workspace context's services: Better Auth, configured from the
 * environment, with the command line's OAuth client registered, and the use
 * cases behind the API and the MCP endpoint, with the accounts and
 * workspaces the staff console reads and acts on (AccountDirectory,
 * AccountModeration), the guard of staff's impersonations, and the
 * journal of the connections that change content, with the partner
 * accounts and their keys (PartnerAccounts, PartnerKeys) and whose each
 * workspace is (PartnerOwnership). It needs the database, migrated, Ids, the notifications context's SendAuthEmail, the billing
 * context's WorkspaceEntitlements and RecordSubscription, the staff
 * context's ImpersonationAudit, the legal context's LegalRecords and the
 * activity context's RequestLimiter, which counts requests for the rate
 * limit, and ActivityLog, which keeps the changes members, keys and
 * applications ask for.
 */
export const WorkspaceLive = Layer.mergeAll(
  UseCasesLive,
  CaptchaChallengeLive,
  DrizzleCredentialNames
).pipe(
  Layer.provide(AdaptersLive),
  Layer.provideMerge(PartnerOwnershipLive),
  Layer.provideMerge(StaffToolsLive),
  Layer.provideMerge(BetterAuthLive),
  // The directory other contexts name members with (the review context),
  // and Better Auth's hooks check a membership with.
  Layer.provideMerge(MemberDirectoryLive),
  // What each workspace requires of its members, which Better Auth's
  // hooks and the workspace's settings read, and the account's emails,
  // which its hooks send when two-step verification changes.
  Layer.provideMerge(SecurityPoliciesLive),
  // Who may sign up, which Better Auth's hooks ask on each sign-up and
  // the captcha's answer tells the sign-up page.
  Layer.provideMerge(SignUpGate.layer.pipe(Layer.provide(DrizzleSignUpStore))),
  Layer.provideMerge(SignUpSettingsLive),
  Layer.provideMerge(EmailedAccountMail),
  Layer.provideMerge(ImpersonationGuardLive),
  Layer.provideMerge(LegalConnectionJournal),
  Layer.provideMerge(CountedRequestLimits),
  Layer.provideMerge(LoggedActivityJournal),
  Layer.provideMerge(AuthSettings.layer)
);

/**
 * What settings do beyond Better Auth's own routes, which reach every
 * context's data: deleting a workspace, copying out and deleting an account,
 * the applications acting for a user, and the workspaces partners own,
 * which are counted with their channels (the channels context's
 * ChannelUsage) and offboarded as a workspace is deleted. Needs what WorkspaceLive provides,
 * the database, a TransactionRunner, and the other contexts' records
 * (ChannelRecords, PostRecords, MediaRecords, NoticeRecords, UsageRecords,
 * AnalyticsRecords, BillingRecords, StaffRecords, LegalRecords) and SendAuthEmail, which
 * the composition root brings.
 */
export const WorkspaceSettingsLive = Layer.mergeAll(
  AccountData.layer,
  CloseAccount.layer,
  ConnectedApps.layer,
  DeleteWorkspace.layer,
  OffboardWorkspace.layer,
  MeterPartnerUsage.layer.pipe(Layer.provideMerge(PartnerWorkspaces.layer))
).pipe(
  Layer.provide(
    Layer.mergeAll(
      ApiKeyIssuerLive,
      PartnerStoresLive,
      ContextChannelCountsLive,
      ContextRecordsLive.pipe(Layer.provide(KeyedPseudonymsLive)),
      DrizzleAccountStore,
      DrizzleConnectedAppStore,
      EmailedAccountMail,
      PasswordCheckLive,
      PrivacyDeclarationLive,
      S3ErasureLedger
    )
  )
);

/**
 * What a partner holds, by workspace and by day, for billing's report of
 * its usage per customer (PartnerTenants). Needs the database and the
 * channels context's ChannelUsage, which counts each workspace's channels,
 * and a TransactionRunner.
 */
export const PartnerTenantsLive = PartnerTenants.layer.pipe(
  Layer.provide(PartnerWorkspaces.layer),
  Layer.provide(Layer.mergeAll(PartnerStoresLive, ContextChannelCountsLive))
);

/**
 * What a person reads across the workspaces they belong to (Overview):
 * each workspace decided through ResolveMember, as every request into it
 * is, and its figures read from the other contexts. Needs what
 * WorkspaceLive provides, publishing's PostAttention, the channels
 * context's ChannelOverview, the engagement context's InboxWaiting and
 * billing's WorkspaceStanding, which the composition root brings.
 */
export const OverviewLive = Overview.layer.pipe(
  Layer.provide(ContextOverviewSourcesLive)
);

/**
 * The endpoints across a person's workspaces, under /api/me. They need
 * OverviewLive, and the Authentication middleware WorkspaceApiLive
 * provides.
 */
export { OverviewHandlers as OverviewApiLive } from "#workspace/api/overview.ts";

/**
 * Applying the erasure ledger again after a restore (ReplayErasures), over
 * the same records and ledger as the settings' erasures. Needs what
 * WorkspaceSettingsLive needs of the other contexts.
 */
export const ErasureReplayLive = ReplayErasures.layer.pipe(
  Layer.provide(
    Layer.mergeAll(
      ContextRecordsLive.pipe(Layer.provide(KeyedPseudonymsLive)),
      DrizzleAccountStore,
      S3ErasureLedger
    )
  )
);

/**
 * The erasure ledger's daily retention, on the object store the settings
 * name: without them, in production, the server does not start; and the
 * daily count of what each partner holds, which needs MeterPartnerUsage.
 */
export const WorkspaceCronsLive = Layer.mergeAll(
  ErasureLedgerRetentionCron.pipe(
    Layer.provide(S3ErasureLedger.pipe(Layer.orDie))
  ),
  PartnerUsageCron
);

/**
 * The workspace endpoints, and the Authentication and WorkspaceAccess
 * middleware every workspace group of the API relies on, and StaffAccess,
 * the staff console's. The settings' endpoints need WorkspaceSettingsLive.
 */
export const WorkspaceApiLive = Layer.mergeAll(
  SessionHandlers,
  ApiKeysHandlers,
  WorkspacesHandlers,
  AccountHandlers,
  ConnectedAppsHandlers,
  CaptchaHandlers,
  MembersHandlers,
  InvitationsHandlers,
  PartnerHandlers,
  PartnerAccountHandlers
).pipe(
  Layer.provideMerge(
    Layer.mergeAll(AuthenticationLive, StaffAccessLive, WorkspaceAccessLive)
  )
);

/**
 * What the Stripe plugin keeps of each workspace's checkouts, for the
 * billing context, which refuses to erase a workspace a checkout may bill
 * and expires those still open. Needs the database.
 */
export { StripeCheckoutsLive } from "#workspace/infrastructure/auth/stripe-checkouts.ts";

/**
 * The MCP endpoint's authentication: its routes act as the member an OAuth
 * access token issued for it is bound to.
 */
export { mcpAuthentication } from "#workspace/api/mcp-authentication.ts";

/**
 * Better Auth's routes under /api/auth, and the OAuth discovery documents
 * at the root.
 */
export { AuthRoutesLive } from "#workspace/infrastructure/auth/routes.ts";
