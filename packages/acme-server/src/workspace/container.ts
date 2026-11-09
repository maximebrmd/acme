import { Layer } from "effect";

import { AccountHandlers } from "#workspace/api/account.ts";
import { ApiKeysHandlers } from "#workspace/api/api-keys.ts";
import { ConnectedAppsHandlers } from "#workspace/api/connected-apps.ts";
import {
  AuthenticationLive,
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
import { ResolveMember } from "#workspace/application/resolve-member.ts";
import { WorkspaceContacts } from "#workspace/application/workspace-contacts.ts";
import { ApiKeyIssuerLive } from "#workspace/infrastructure/auth/api-key-issuer.ts";
import { BetterAuthLive } from "#workspace/infrastructure/auth/better-auth.ts";
import { CliClientLive } from "#workspace/infrastructure/auth/cli-client.ts";
import { AuthGatewayLive } from "#workspace/infrastructure/auth/gateway.ts";
import { PasswordCheckLive } from "#workspace/infrastructure/auth/password-check.ts";
import { AuthSettings } from "#workspace/infrastructure/auth/settings.ts";
import { ContextRecordsLive } from "#workspace/infrastructure/context-records.ts";
import { DrizzleAccountStore } from "#workspace/infrastructure/drizzle-account-store.ts";
import { DrizzleConnectedAppStore } from "#workspace/infrastructure/drizzle-connected-app-store.ts";
import { MemberDirectoryLive } from "#workspace/infrastructure/drizzle-member-directory.ts";
import { WorkspaceRosterLive } from "#workspace/infrastructure/drizzle-workspace-roster.ts";
import { EmailedAccountMail } from "#workspace/infrastructure/emailed-account-mail.ts";

const AdaptersLive = Layer.mergeAll(
  AuthGatewayLive,
  MemberDirectoryLive,
  WorkspaceRosterLive,
  ApiKeyIssuerLive,
  CliClientLive
);

const UseCasesLive = Layer.mergeAll(
  Accounts.layer,
  AccountStanding.layer,
  ApiKeys.layer,
  Authenticate.layer,
  ResolveMember.layer,
  WorkspaceContacts.layer
);

/**
 * The workspace context's services: Better Auth, configured from the
 * environment, with the command line's OAuth client registered, and the use
 * cases behind the API and the MCP endpoint. It needs the database,
 * migrated, and the notifications context's SendAuthEmail.
 */
export const WorkspaceLive = UseCasesLive.pipe(
  Layer.provide(AdaptersLive),
  Layer.provideMerge(BetterAuthLive),
  Layer.provideMerge(AuthSettings.layer)
);

/**
 * What settings do beyond Better Auth's own routes, which reach every
 * context's data: deleting a workspace, copying out and deleting an account,
 * and the applications acting for a user. Needs what WorkspaceLive provides,
 * the database, a TransactionRunner, and the other contexts' records
 * (ChannelRecords, PostRecords, MediaRecords, NoticeRecords, UsageRecords)
 * and SendAuthEmail, which the composition root brings.
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
      ContextRecordsLive,
      DrizzleAccountStore,
      DrizzleConnectedAppStore,
      EmailedAccountMail,
      PasswordCheckLive
    )
  )
);

/**
 * The workspace endpoints, and the Authentication and WorkspaceAccess
 * middleware every workspace group of the API relies on. The settings'
 * endpoints need WorkspaceSettingsLive.
 */
export const WorkspaceApiLive = Layer.mergeAll(
  SessionHandlers,
  ApiKeysHandlers,
  WorkspacesHandlers,
  AccountHandlers,
  ConnectedAppsHandlers
).pipe(
  Layer.provideMerge(Layer.mergeAll(AuthenticationLive, WorkspaceAccessLive))
);

/**
 * The MCP endpoint's authentication: its routes act as the member an OAuth
 * access token issued for it is bound to.
 */
export { McpAuthenticationLive } from "#workspace/api/mcp-authentication.ts";

/**
 * Better Auth's routes under /api/auth, and the OAuth discovery documents
 * at the root.
 */
export { AuthRoutesLive } from "#workspace/infrastructure/auth/routes.ts";
