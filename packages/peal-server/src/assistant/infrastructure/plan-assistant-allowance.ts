import { Effect, Layer, Option } from "effect";

import { AssistantAllowance } from "#assistant/application/ports/assistant-allowance.ts";
import { dailyRequestsConfig } from "#assistant/infrastructure/assistant-settings.ts";
import { WorkspaceEntitlements } from "#billing/application/workspace-entitlements.ts";

/**
 * Each workspace's daily allowance: its plan's, on a server that bills;
 * otherwise the same for every workspace, from ACME_AI_DAILY_REQUESTS. A
 * database failure reading the plan is a defect, as the quota's own are.
 */
export const PlanAssistantAllowanceLive = Layer.effect(
  AssistantAllowance,
  Effect.gen(function* PlanAssistantAllowanceLive() {
    const configured = yield* dailyRequestsConfig;
    const entitlements = yield* WorkspaceEntitlements;

    return AssistantAllowance.of({
      dailyRequests: (workspaceId) =>
        entitlements.of(workspaceId).pipe(
          Effect.map(({ allowances }) =>
            Option.getOrElse(allowances.assistantRequests, () => configured)
          ),
          Effect.orDie
        ),
    });
  })
);
