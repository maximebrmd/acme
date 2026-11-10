import { Option, Schema } from "effect";

import { can } from "#shared/domain/access.ts";
import type { Actor } from "#shared/domain/access.ts";

/**
 * Which of a workspace's posts wait for an approval before they are
 * scheduled:
 *
 * - `never`: none. Whoever may schedule does.
 * - `contributorsAndApplications`: those asked for by a member who may not
 *   schedule (a contributor), or through an application: an API key, or an
 *   OAuth client such as the command line or an MCP client, whatever the
 *   member behind it may do. A member who may schedule, in the web app,
 *   schedules as before.
 * - `always`: every post, whoever asks.
 *
 * Stored per workspace, so a name may be added, never renamed or removed.
 */
export const ApprovalPolicySchema = Schema.Literals([
  "never",
  "contributorsAndApplications",
  "always",
]);

export type ApprovalPolicy = typeof ApprovalPolicySchema.Type;

/** What a workspace does until it chooses: no post waits. */
export const defaultApprovalPolicy: ApprovalPolicy = "never";

/**
 * Whether the actor reaches Peal through an application rather than in
 * person: an API key, or an OAuth client acting for a member.
 */
export const isApplication = ({ subject }: Actor): boolean =>
  subject._tag === "apiKey" || subject.clientId !== undefined;

/** Whether staff act as the member. */
export const isImpersonated = ({ subject }: Actor): boolean =>
  subject._tag === "user" && Option.isSome(subject.impersonatedBy);

/** Whether a post the actor asks to send waits for an approval. */
export const needsApproval = (
  policy: ApprovalPolicy,
  actor: Actor
): boolean => {
  if (policy === "never") {
    return false;
  }

  return (
    policy === "always" || isApplication(actor) || !can(actor, "post:schedule")
  );
};

/**
 * Whether someone without post:schedule may still ask for posts to go out:
 * where posts wait for an approval, whoever may write drafts. Staff acting
 * as a member ask for nothing: what they asked for would go out once they
 * are gone.
 */
export const maySubmit = (policy: ApprovalPolicy, actor: Actor): boolean =>
  can(actor, "post:schedule") ||
  (policy !== "never" && can(actor, "post:create") && !isImpersonated(actor));
