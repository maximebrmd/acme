import { Option, Schema } from "effect";

import type { Permission } from "#shared/domain/access.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/**
 * What a user lets an OAuth client do in their workspaces:
 *
 * - `workspace:read`: read, and change nothing.
 * - `workspace:write`: whatever the user's role allows, reading included.
 */
export const WorkspaceScopeSchema = Schema.Literals([
  "workspace:read",
  "workspace:write",
]);

export type WorkspaceScope = typeof WorkspaceScopeSchema.Type;

const isWorkspaceScope = Schema.is(WorkspaceScopeSchema);

/**
 * An OAuth access token's grant: the client it was issued to, the scopes the
 * user agreed to, and the workspace it is bound to. Tokens of MCP clients are
 * bound to the workspace the user picked when they signed in; those of the
 * command line are not, and act in the workspace a request names.
 */
export const OAuthGrantSchema = Schema.Struct({
  clientId: Schema.NonEmptyString,
  scopes: Schema.Array(Schema.String),
  workspaceId: Schema.Option(WorkspaceIdSchema),
});

export type OAuthGrant = typeof OAuthGrantSchema.Type;

/**
 * The command line's OAuth client, which every Peal server registers under
 * this id (the contract's `cliClientId`, kept equal by a test).
 */
export const commandLineClientId = "peal-cli";

/**
 * Whether a grant is Peal's own command line's: the user signed it in at
 * their terminal, through the device grant, and its tokens are bound to no
 * workspace.
 */
export const isCommandLine = (grant: OAuthGrant): boolean =>
  grant.clientId === commandLineClientId &&
  Option.isNone(grant.workspaceId) &&
  grant.scopes.some(isWorkspaceScope);

const reads = (permission: Permission): boolean => permission.endsWith(":read");

/**
 * The permissions a grant leaves of those the user holds in a workspace:
 * none outside the workspace it is bound to, only reading without
 * `workspace:write`, and none without either workspace scope.
 */
export const grantedPermissions = (
  grant: OAuthGrant,
  workspaceId: WorkspaceId,
  permissions: readonly Permission[]
): readonly Permission[] => {
  if (Option.exists(grant.workspaceId, (bound) => bound !== workspaceId)) {
    return [];
  }

  if (grant.scopes.includes("workspace:write")) {
    return permissions;
  }

  return grant.scopes.includes("workspace:read")
    ? permissions.filter(reads)
    : [];
};
