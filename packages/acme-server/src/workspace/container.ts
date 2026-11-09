import { Layer } from "effect";

import { ApiKeysHandlers } from "#workspace/api/api-keys.ts";
import {
  AuthenticationLive,
  WorkspaceAccessLive,
} from "#workspace/api/security.ts";
import { SessionHandlers } from "#workspace/api/session.ts";
import { Accounts } from "#workspace/application/accounts.ts";
import { ApiKeys } from "#workspace/application/api-keys.ts";
import { Authenticate } from "#workspace/application/authenticate.ts";
import { ResolveMember } from "#workspace/application/resolve-member.ts";
import { WorkspaceContacts } from "#workspace/application/workspace-contacts.ts";
import { ApiKeyIssuerLive } from "#workspace/infrastructure/auth/api-key-issuer.ts";
import { BetterAuthLive } from "#workspace/infrastructure/auth/better-auth.ts";
import { CliClientLive } from "#workspace/infrastructure/auth/cli-client.ts";
import { AuthGatewayLive } from "#workspace/infrastructure/auth/gateway.ts";
import { AuthSettings } from "#workspace/infrastructure/auth/settings.ts";
import { MemberDirectoryLive } from "#workspace/infrastructure/drizzle-member-directory.ts";
import { WorkspaceRosterLive } from "#workspace/infrastructure/drizzle-workspace-roster.ts";

const AdaptersLive = Layer.mergeAll(
  AuthGatewayLive,
  MemberDirectoryLive,
  WorkspaceRosterLive,
  ApiKeyIssuerLive,
  CliClientLive
);

const UseCasesLive = Layer.mergeAll(
  Accounts.layer,
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
 * The workspace endpoints, and the Authentication and WorkspaceAccess
 * middleware every workspace group of the API relies on.
 */
export const WorkspaceApiLive = Layer.mergeAll(
  SessionHandlers,
  ApiKeysHandlers
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
