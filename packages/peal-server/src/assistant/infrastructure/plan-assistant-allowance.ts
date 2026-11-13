import { Effect, Layer, Option } from "effect";

import { AssistantAllowance } from "#assistant/application/ports/assistant-allowance.ts";
import { imageRequestsOnTrial } from "#assistant/domain/image-limits.ts";
import { dailyRequestsConfig } from "#assistant/infrastructure/assistant-settings.ts";
import { BillingMode } from "#billing/application/ports/billing-mode.ts";
import { PlanPools } from "#billing/application/ports/plan-pools.ts";
import { WorkspaceEntitlements } from "#billing/application/workspace-entitlements.ts";

/**
 * Each workspace's daily allowance: its plan's, on a server that bills,
 * counted across its billing account's workspaces (billing's
 * `PlanPools`); otherwise the same for every workspace alone, from
 * PEAL_AI_DAILY_REQUESTS;
 * images take none of it while the plan is on trial. A
 * database failure reading the plan is a defect, as the quota's own are.
 */
export const PlanAssistantAllowanceLive = Layer.effect(
  AssistantAllowance,
  Effect.gen(function* PlanAssistantAllowanceLive() {
    const configured = yield* dailyRequestsConfig;
    const entitlements = yield* WorkspaceEntitlements;
    const pools = yield* PlanPools;
    const { enabled } = yield* BillingMode;

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
      // A server that does not bill counts each workspace alone, and
      // reads or holds no pool.
      sharedWith: (workspaceId) =>
        enabled
          ? pools.sharedWith(workspaceId).pipe(Effect.orDie)
          : Effect.succeed([]),
    });
  })
);
