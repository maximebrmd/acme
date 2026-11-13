import { Effect, Layer, Option } from "effect";

import { AssistantAllowance } from "#assistant/application/ports/assistant-allowance.ts";
import { imageRequestsOnTrial } from "#assistant/domain/image-limits.ts";
import { dailyRequestsConfig } from "#assistant/infrastructure/assistant-settings.ts";
import { WorkspaceEntitlements } from "#billing/application/workspace-entitlements.ts";

/**
 * Each workspace's daily allowance: its plan's, on a server that bills;
 * otherwise the same for every workspace, from PEAL_AI_DAILY_REQUESTS;
 * images take none of it while the plan is on trial. A
 * database failure reading the plan is a defect, as the quota's own are.
 */
export const PlanAssistantAllowanceLive = Layer.effect(
  AssistantAllowance,
  Effect.gen(function* PlanAssistantAllowanceLive() {
    const configured = yield* dailyRequestsConfig;
    const entitlements = yield* WorkspaceEntitlements;

    // The day's requests, and whether the plan is on trial.
    const dayOf = (workspaceId: Parameters<typeof entitlements.of>[0]) =>
      entitlements.of(workspaceId).pipe(
        Effect.map((plan) => ({
          daily: Option.getOrElse(
            plan.allowanceOf("assistantRequests"),
            () => configured
          ),
          trial: Option.exists(
            plan.subscription,
            ({ status }) => status === "trialing"
          ),
        })),
        Effect.orDie
      );

    return AssistantAllowance.of({
      dailyRequests: (workspaceId) =>
        dayOf(workspaceId).pipe(Effect.map(({ daily }) => daily)),
      imageRequests: (workspaceId) =>
        dayOf(workspaceId).pipe(
          Effect.map(({ daily, trial }) =>
            trial ? Math.min(daily, imageRequestsOnTrial) : daily
          )
        ),
    });
  })
);
