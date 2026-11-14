import { Effect } from "effect";
import { Forbidden } from "peal-contract";
import type { ForbiddenReason, Permission } from "peal-contract";

// What each refusal says when nothing knows more about the caller. The
// workspace's middleware says more of a missing permission: whose it is,
// and who gives it (`#workspace/api/refusal.ts`).
const messages: Readonly<Record<ForbiddenReason, string>> = {
  missingPermission:
    "The role or the API key behind this request does not allow it. An owner or an admin of the workspace gives a role, or creates a key, that does.",
  missingScope:
    "This application was not given the scope this request takes. Its user connects it to Peal again and allows it.",
  personRequired:
    "Only a person signed in to Peal does this, in the web app: not an API key, an application acting for them, or staff acting as them.",
  suspended: "This account is suspended. Write to the people who run Peal.",
  twoStepRequired:
    "This workspace requires two-step verification. Turn it on in your Peal account settings, then try again.",
  untrustedOrigin:
    "This request came with the session's cookie from a site Peal does not trust. Scripts and servers send an API key or an OAuth token instead.",
  wrongWorkspace:
    "This key or token belongs to another workspace: use it there, or use one of this workspace.",
};

// The use cases' refusals, by what they mean to a caller.
const reasons = new Map<string, ForbiddenReason>([
  ["ApprovalNeedsPerson", "personRequired"],
  ["BannedUser", "suspended"],
  ["InboxAccessDenied", "personRequired"],
  ["MissingPermission", "missingPermission"],
  ["NotAMember", "missingPermission"],
  // A permission only a person in their own session uses.
  ["PermissionNotGrantable", "personRequired"],
  ["PersonRequired", "personRequired"],
  // Google asks that a review's reply follow the user's own consent.
  ["ReviewReplyNeedsPerson", "personRequired"],
  ["RoleNotInvitable", "missingPermission"],
  ["SessionRequired", "personRequired"],
  ["TwoStepRequired", "twoStepRequired"],
  ["UserRequired", "personRequired"],
  ["WorkspaceMismatch", "wrongWorkspace"],
]);

/** A refusal for a reason, in the words any caller is told. */
export const refused = (
  reason: ForbiddenReason,
  permission?: Permission
): Forbidden =>
  permission === undefined
    ? new Forbidden({ message: messages[reason], reason })
    : new Forbidden({ message: messages[reason], permission, reason });

/**
 * Answers 403 to a use case's refusal, saying why: the permission a
 * `MissingPermission` names, a person where one is required, the
 * workspace a credential belongs to. Handlers map every such failure to
 * it (`MissingPermission: forbidden`).
 */
export const forbidden = (refusal?: {
  readonly _tag?: string;
  readonly permission?: Permission;
}): Effect.Effect<never, Forbidden> => {
  const reason = reasons.get(refusal?._tag ?? "");

  return Effect.fail(
    reason === undefined
      ? new Forbidden()
      : refused(reason, refusal?.permission)
  );
};

/** Answers 403 to what only a person in their own session does. */
export const personRequired = (): Effect.Effect<never, Forbidden> =>
  Effect.fail(refused("personRequired"));
