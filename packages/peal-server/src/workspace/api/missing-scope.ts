import { Option } from "effect";
import type { Member, Permission } from "peal-contract";

import { scopeFor } from "#workspace/domain/oauth-grant.ts";
import type { WorkspaceScope } from "#workspace/domain/oauth-grant.ts";

/**
 * The scope an OAuth client lacks for a permission its member was refused:
 * none when the user agreed to it, so that their role is what refuses, and
 * none for a session or an API key, which carry no scope.
 */
export const missingScope = (
  member: Member,
  permission: Permission
): Option.Option<WorkspaceScope> => {
  const { principal } = member;

  if (principal._tag !== "user" || principal.oauth === undefined) {
    return Option.none();
  }

  const needed = scopeFor(permission);

  return principal.oauth.scopes.includes(needed)
    ? Option.none()
    : Option.some(needed);
};
