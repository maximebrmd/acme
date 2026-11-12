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
 *   taking a post back, cancelling it or confirming how it went; and
 *   answering the comments under them, as the account, in public.
 * - `workspace:ads`: nothing alone. Beside `workspace:write`, connecting
 *   and disconnecting ad accounts; beside `workspace:publish`, spending on
 *   ads within the ceiling an owner set (`adsPermissions`).
 *
 * Publishing is a grant of its own, which the consent page shows on its own
 * line: a token issued for `workspace:write` before it existed publishes
 * nothing until its user agrees again.
 */
export const WorkspaceScopeSchema = Schema.Literals([
  "workspace:read",
  "workspace:write",
  "workspace:publish",
  "workspace:ads",
]);

export type WorkspaceScope = typeof WorkspaceScopeSchema.Type;

const isWorkspaceScope = Schema.is(WorkspaceScopeSchema);

// The scopes that let an application into a workspace at all. The ads
// scope adds to them, and opens nothing alone.
const entryScopes: ReadonlySet<string> = new Set([
  "workspace:read",
  "workspace:write",
  "workspace:publish",
]);

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
 * only `workspace:publish` leaves them to an OAuth client. A reply to a
 * comment is a public message from the account, as a post is.
 */
export const publishingPermissions: ReadonlySet<Permission> = new Set([
  "engagement:reply",
  "post:schedule",
  "post:approve",
  "post:publish",
]);

/**
 * The permissions that reach an ad network: `workspace:ads` leaves them to
 * an OAuth client, beside the scope each takes anyway.
 */
export const adsPermissions: ReadonlySet<Permission> = new Set([
  "ads:manage",
  "ads:spend",
]);

/**
 * What no OAuth client does, whatever its scopes, nor any API key: deciding
 * that ads may spend, and how much, and requiring two-step verification of
 * the workspace's members, are the owner's, in their own session.
 */
export const personOnlyPermissions: ReadonlySet<Permission> = new Set([
  "ads:authorize",
  "organization:secure",
]);

/**
 * Every scope an OAuth client needs for a permission its user holds: one
 * for most, and `workspace:ads` too for what reaches an ad network, so
 * that spending takes `workspace:publish` and `workspace:ads` together.
 */
export const scopesFor = (
  permission: Permission
): readonly WorkspaceScope[] => {
  // The ads scope first: it is the one a refusal names to a client that
  // holds neither.
  if (permission === "ads:spend") {
    return ["workspace:ads", "workspace:publish"];
  }

  if (publishingPermissions.has(permission)) {
    return ["workspace:publish"];
  }

  if (reads(permission)) {
    return ["workspace:read"];
  }

  return adsPermissions.has(permission)
    ? ["workspace:write", "workspace:ads"]
    : ["workspace:write"];
};

/** The first scope an OAuth client needs for a permission its user holds. */
export const scopeFor = (permission: Permission): WorkspaceScope => {
  const [first = "workspace:write"] = scopesFor(permission);

  return first;
};

/**
 * The permissions a grant leaves of those the user holds in a workspace:
 * none outside the workspace it is bound to, and none without a scope that
 * lets it in (reading, writing or publishing); reading with any of them,
 * what puts posts out with `workspace:publish` only, what reaches an ad
 * network with `workspace:ads` too, the rest with `workspace:write`, and
 * never what is the person's alone (`personOnlyPermissions`).
 */
export const grantedPermissions = (
  grant: OAuthGrant,
  workspaceId: WorkspaceId,
  permissions: readonly Permission[]
): readonly Permission[] => {
  if (Option.exists(grant.workspaceId, (bound) => bound !== workspaceId)) {
    return [];
  }

  if (!grant.scopes.some((scope) => entryScopes.has(scope))) {
    return [];
  }

  return permissions.filter(
    (permission) =>
      reads(permission) ||
      (!personOnlyPermissions.has(permission) &&
        scopesFor(permission).every((scope) => grant.scopes.includes(scope)))
  );
};
