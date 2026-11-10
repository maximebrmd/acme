import { Option, Schema } from "effect";

import type { Permission } from "#shared/domain/access.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/**
 * What a user lets an OAuth client do in their workspaces:
 *
 * - `workspace:read`: read, and change nothing.
 * - `workspace:write`: whatever the user's role allows, reading included,
 *   but what puts posts out (`publishingPermissions`): it writes drafts,
 *   handles media and the rest, and nothing it does reaches a platform.
 * - `workspace:publish`: what the user's role allows of what puts posts
 *   out, and reading: scheduling, moving, publishing and reposting, and
 *   taking a post back, cancelling it or confirming how it went.
 *
 * Publishing is a grant of its own, which the consent page shows on its own
 * line: a token issued for `workspace:write` before it existed publishes
 * nothing until its user agrees again.
 */
export const WorkspaceScopeSchema = Schema.Literals([
  "workspace:read",
  "workspace:write",
  "workspace:publish",
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
 * The permissions that decide what goes out to the platforms, and when:
 * only `workspace:publish` leaves them to an OAuth client.
 */
export const publishingPermissions: ReadonlySet<Permission> = new Set([
  "post:schedule",
  "post:approve",
  "post:publish",
]);

/** The scope an OAuth client needs for a permission its user holds. */
export const scopeFor = (permission: Permission): WorkspaceScope => {
  if (publishingPermissions.has(permission)) {
    return "workspace:publish";
  }

  return reads(permission) ? "workspace:read" : "workspace:write";
};

/**
 * The permissions a grant leaves of those the user holds in a workspace:
 * none outside the workspace it is bound to, and none without a workspace
 * scope; reading with any of them, what puts posts out with
 * `workspace:publish` only, and the rest with `workspace:write`.
 */
export const grantedPermissions = (
  grant: OAuthGrant,
  workspaceId: WorkspaceId,
  permissions: readonly Permission[]
): readonly Permission[] => {
  if (Option.exists(grant.workspaceId, (bound) => bound !== workspaceId)) {
    return [];
  }

  if (!grant.scopes.some(isWorkspaceScope)) {
    return [];
  }

  return permissions.filter(
    (permission) =>
      reads(permission) || grant.scopes.includes(scopeFor(permission))
  );
};
