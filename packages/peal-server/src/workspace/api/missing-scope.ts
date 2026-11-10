import { Option } from "effect";
import type { Member, Permission } from "peal-contract";

import { scopesFor } from "#workspace/domain/oauth-grant.ts";
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

  const { scopes } = principal.oauth;

  // The first of the scopes the permission takes that the user left out.
  return Option.fromUndefinedOr(
    scopesFor(permission).find((needed) => !scopes.includes(needed))
  );
};
