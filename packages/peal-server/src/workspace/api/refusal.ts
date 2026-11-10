import { Effect, Option } from "effect";
import { Forbidden } from "peal-contract";
import type { Member, Permission } from "peal-contract";

import { setAnswerHeader } from "#shared/api/answer-headers.ts";
import type { WorkspaceScope } from "#workspace/domain/oauth-grant.ts";

import { missingScope } from "./missing-scope.ts";

/** What each scope lets an application do, as the consent page says it. */
export const scopeGrants: Readonly<Record<WorkspaceScope, string>> = {
  "workspace:publish": "schedule and publish posts, and answer comments",
  "workspace:read": "read the workspace",
  "workspace:write": "write drafts and change the workspace",
};

const withoutScope = (scope: WorkspaceScope, permission: Permission) =>
  new Forbidden({
    message: `This application was not given the scope ${scope} (${scopeGrants[scope]}), which this request takes (permission ${permission}). Its user connects it to Peal again and allows it; for Peal's command line, run peal login again and approve it.`,
    permission,
    reason: "missingScope",
    scope,
  });

const withoutPermission = (member: Member, permission: Permission) => {
  const { principal } = member;

  if (principal._tag === "apiKey") {
    return `This API key does not have the permission ${permission}. An owner or an admin of the workspace gives it to the key, or creates a key that has it.`;
  }

  if (principal._tag === "partnerKey") {
    return `This partner key does not have the permission ${permission} in the workspaces its partner owns. An owner or an admin of the partner's workspace creates a key that has it.`;
  }

  return principal.impersonatedBy === null
    ? `Your role in this workspace does not have the permission ${permission}. An owner or an admin of the workspace changes roles, in its settings.`
    : `Staff acting as a member may not do this (permission ${permission}): the member does it themselves.`;
};

/**
 * A refusal for a missing permission, told to the member it refuses: an
 * application its user did not give the scope is told which scope, in the
 * answer and as the challenge RFC 6750 asks for (`insufficient_scope`),
 * which OAuth clients read; a key or a role, who gives the permission.
 * Other refusals stay as they are.
 */
export const explained = (member: Member, refusal: Forbidden) => {
  const { permission, reason } = refusal;

  if (reason !== "missingPermission" || permission === undefined) {
    return Effect.succeed(refusal);
  }

  return Option.match(missingScope(member, permission), {
    onNone: () =>
      Effect.succeed(
        new Forbidden({
          message: withoutPermission(member, permission),
          permission,
          reason,
        })
      ),
    onSome: (scope) =>
      setAnswerHeader(
        "www-authenticate",
        `Bearer error="insufficient_scope", scope="${scope}"`
      ).pipe(Effect.as(withoutScope(scope, permission))),
  });
};

// A handler's failure, its refusals told to the member they refuse.
const retold =
  (member: Member) =>
  <E>(failure: E): Effect.Effect<never, E | Forbidden> =>
    failure instanceof Forbidden
      ? explained(member, failure).pipe(
          Effect.flatMap((refusal) => Effect.fail(refusal))
        )
      : Effect.fail(failure);

/**
 * Tells a handler's refusals to the member they refuse, as `explained`
 * does, and leaves its other failures alone.
 */
export const explaining =
  (member: Member) =>
  <A, E, R>(
    handled: Effect.Effect<A, E, R>
  ): Effect.Effect<A, E | Forbidden, R> =>
    handled.pipe(Effect.catch(retold(member)<E>));
