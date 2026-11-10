import { Effect, Option } from "effect";
import { CurrentMember } from "peal-contract";
import type { Member, Permission } from "peal-contract";

import { ToolRefused } from "#app/mcp/tool-refused.ts";
import { UpgradePaths } from "#shared/application/upgrade-paths.ts";
import type { UpgradePath } from "#shared/application/upgrade-paths.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import type { PlanLimitReached } from "#shared/domain/plan-limit-reached.ts";
import type { PlanLimit } from "#shared/domain/plan-limit.ts";
import type { Plan } from "#shared/domain/plan.ts";
import { missingScope } from "#workspace/api/missing-scope.ts";
import { scopeGrants } from "#workspace/api/refusal.ts";

/** Fails the tool with a message the user can act on. */
export const refuse = (message: string) =>
  Effect.fail(new ToolRefused({ message }));

/** Tags a call names that are not the workspace's. */
export const unknownTags = ({
  tagIds,
}: {
  readonly tagIds: readonly string[];
}) =>
  refuse(
    `These tags are not the workspace's: ${tagIds.join(", ")}. list_tags answers its tags.`
  );

// Whose permission is missing, and who can do something about it: a
// partner's key, a workspace's key, or the user's role.
const whoseOf = (member: Member, doing: string, permission: Permission) => {
  if (member.principal._tag === "partnerKey") {
    return `This connection may not ${doing} in this workspace: its partner key does not have the permission ${permission}. Someone who manages the partner account creates a key that has it, in the web app's partner settings; a partner key is never given members, invitations, API keys or billing changes.`;
  }

  return member.principal._tag === "apiKey"
    ? `This connection may not ${doing} in this workspace: its API key does not have the permission ${permission}. An owner or admin of the workspace creates a key that has it, in the web app's settings.`
    : `This connection may not ${doing} in this workspace: the user's role does not allow it (it takes the permission ${permission}). An owner or admin of the workspace can change their role, in the web app's settings.`;
};

/**
 * The connection may not do this, and why: the user did not give the client
 * the scope it takes, which they grant by connecting it again, or their
 * role in the workspace does not allow it, which an owner or admin changes.
 */
export const notAllowed =
  (doing: string) =>
  ({ permission }: { readonly permission: Permission }) =>
    CurrentMember.pipe(
      Effect.flatMap((member) =>
        refuse(
          Option.match(missingScope(member, permission), {
            onNone: () => whoseOf(member, doing, permission),
            onSome: (scope) =>
              `This connection may not ${doing} in this workspace: the user did not give this client the scope ${scope} (${scopeGrants[scope]}). To grant it, the user connects this client to Peal again and allows it there; a connection keeps the scopes it was given until then.`,
          })
        )
      )
    );

const limitNames: Readonly<Record<PlanLimit, string>> = {
  assistantRequests: "assistant requests a day",
  channels: "channels",
  mediaStorage: "bytes of media stored, uploads in progress included",
  members: "members, pending invitations included",
  scheduledPosts: "posts going out a month",
};

const planNames: Readonly<Record<Plan, string>> = {
  agency: "Agency",
  business: "Business",
  free: "Free",
  pro: "Pro",
  starter: "Starter",
};

/**
 * What a plan's refusal tells the user through their MCP client: the plan,
 * what it allows and what the workspace holds, then the way out, which is
 * the smallest plan with room, ordered on the billing page (tools order
 * nothing), or, on the largest plan, asking the people who run the server.
 */
export const planRefusalText = (
  { allowed, limit, used }: PlanLimitReached,
  { billingUrl, plan, planWithRoom }: UpgradePath
): string => {
  const on = Option.match(plan, {
    onNone: () => "plan",
    onSome: (current) => `${planNames[current]} plan`,
  });

  const held = `The workspace's ${on} allows ${String(allowed)} ${limitNames[limit]}, and it has ${String(used)}.`;

  return Option.match(planWithRoom, {
    onNone: () =>
      `${held} No plan is larger: the user writes to the people who run this server to ask for more, or removes some.`,
    onSome: (larger) =>
      `${held} The ${planNames[larger]} plan has room: an owner or an admin of the workspace orders it on its billing page, ${billingUrl}`,
  });
};

/**
 * Refuses a tool the workspace's plan has no room for, with the way out
 * (`planRefusalText`), after `nothing`, what the call left undone, when the
 * tool says it. Built with the toolkit, as its use cases are.
 */
export const planRefusal = UpgradePaths.use((paths) =>
  Effect.succeed(
    (workspaceId: WorkspaceId, nothing = "") =>
      (reached: PlanLimitReached) =>
        paths
          .from(workspaceId, reached.limit, reached.needed)
          .pipe(
            Effect.flatMap((path) =>
              refuse(
                `${nothing === "" ? "" : `${nothing} `}${planRefusalText(reached, path)}`
              )
            )
          )
  )
);
