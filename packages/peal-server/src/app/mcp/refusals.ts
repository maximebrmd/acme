import { Effect, Option } from "effect";

import { ToolRefused } from "#app/mcp/tool-refused.ts";
import { UpgradePaths } from "#shared/application/upgrade-paths.ts";
import type { UpgradePath } from "#shared/application/upgrade-paths.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import type { PlanLimitReached } from "#shared/domain/plan-limit-reached.ts";
import type { PlanLimit } from "#shared/domain/plan-limit.ts";
import type { Plan } from "#shared/domain/plan.ts";

/** Fails the tool with a message the user can act on. */
export const refuse = (message: string) =>
  Effect.fail(new ToolRefused({ message }));

/**
 * The connection may not do this: the user's role does not allow it, or
 * the user let the client read only.
 */
export const notAllowed = (doing: string) => () =>
  refuse(
    `This connection may not ${doing} in this workspace: the user's role does not allow it, or they let this client read only. To change things, the user connects the client again and allows it to do what their role allows.`
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
 * (`planRefusalText`). Built with the toolkit, as its use cases are.
 */
export const planRefusal = UpgradePaths.use((paths) =>
  Effect.succeed(
    (workspaceId: WorkspaceId) => (reached: PlanLimitReached) =>
      paths
        .from(workspaceId, reached.limit, reached.needed)
        .pipe(Effect.flatMap((path) => refuse(planRefusalText(reached, path))))
  )
);
