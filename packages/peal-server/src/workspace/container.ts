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
import { ApiKeys } from "#workspace/application/api-keys.ts";
import { Authenticate } from "#workspace/application/authenticate.ts";
import { CloseAccount } from "#workspace/application/close-account.ts";
import { ConnectedApps } from "#workspace/application/connected-apps.ts";
import { DeleteWorkspace } from "#workspace/application/delete-workspace.ts";
import { ImpersonationGuard } from "#workspace/application/impersonation-guard.ts";
import { ResolveMember } from "#workspace/application/resolve-member.ts";
import { StaffStanding } from "#workspace/application/staff-standing.ts";
import { WorkspaceContacts } from "#workspace/application/workspace-contacts.ts";
import { WorkspaceMembers } from "#workspace/application/workspace-members.ts";
import { WorkspaceSeats } from "#workspace/application/workspace-seats.ts";
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
import { ContextRecordsLive } from "#workspace/infrastructure/context-records.ts";
import { AccountDirectoryLive } from "#workspace/infrastructure/drizzle-account-directory.ts";
import { DrizzleAccountStore } from "#workspace/infrastructure/drizzle-account-store.ts";
import { DrizzleConnectedAppStore } from "#workspace/infrastructure/drizzle-connected-app-store.ts";
import { DrizzleImpersonationSessions } from "#workspace/infrastructure/drizzle-impersonation-sessions.ts";
import { MemberDirectoryLive } from "#workspace/infrastructure/drizzle-member-directory.ts";
import { WorkspaceRosterLive } from "#workspace/infrastructure/drizzle-workspace-roster.ts";
import { EmailedAccountMail } from "#workspace/infrastructure/emailed-account-mail.ts";
import { StaffImpersonationLog } from "#workspace/infrastructure/staff-impersonation-log.ts";

const AdaptersLive = Layer.mergeAll(
  AuthGatewayLive,
  MemberDirectoryLive,
  WorkspaceRosterLive,
  ApiKeyIssuerLive,
  CliClientLive,
  WorkspacePeopleLive
);

const UseCasesLive = Layer.mergeAll(
  Accounts.layer,
  AccountStanding.layer,
  ApiKeys.layer,
  Authenticate.layer,
  ResolveMember.layer,
  StaffStanding.layer,
  WorkspaceContacts.layer,
  WorkspaceMembers.layer,
  WorkspaceSeats.layer
);

// What the staff console reads of accounts and workspaces, and does to
// accounts, which the staff context reaches through ports of its own.
const StaffToolsLive = Layer.mergeAll(
  AccountDirectoryLive,
  AccountModerationLive
);

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
 * journal of the connections that change content. It needs the database,
 * migrated, Ids, the notifications context's SendAuthEmail, the billing
 * context's WorkspaceEntitlements and RecordSubscription, the staff
 * context's ImpersonationAudit and the legal context's LegalRecords.
 */
export const WorkspaceLive = Layer.merge(
  UseCasesLive,
  CaptchaChallengeLive
).pipe(
  Layer.provide(AdaptersLive),
  Layer.provideMerge(StaffToolsLive),
  Layer.provideMerge(BetterAuthLive),
  Layer.provideMerge(ImpersonationGuardLive),
  Layer.provideMerge(LegalConnectionJournal),
  Layer.provideMerge(AuthSettings.layer)
);

/**
 * What settings do beyond Better Auth's own routes, which reach every
 * context's data: deleting a workspace, copying out and deleting an account,
 * and the applications acting for a user. Needs what WorkspaceLive provides,
 * the database, a TransactionRunner, and the other contexts' records
 * (ChannelRecords, PostRecords, MediaRecords, NoticeRecords, UsageRecords,
 * AnalyticsRecords, BillingRecords, StaffRecords, LegalRecords) and SendAuthEmail, which
 * the composition root brings.
 */
export const WorkspaceSettingsLive = Layer.mergeAll(
  AccountData.layer,
  CloseAccount.layer,
  ConnectedApps.layer,
  DeleteWorkspace.layer
).pipe(
  Layer.provide(
    Layer.mergeAll(
      ApiKeyIssuerLive,
      ContextRecordsLive.pipe(Layer.provide(KeyedPseudonymsLive)),
      DrizzleAccountStore,
      DrizzleConnectedAppStore,
      EmailedAccountMail,
      PasswordCheckLive
    )
  )
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
  InvitationsHandlers
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
