import { Effect, Layer } from "effect";

import { AssistantAllowance } from "#assistant/application/ports/assistant-allowance.ts";
import { dailyRequestsConfig } from "#assistant/infrastructure/assistant-settings.ts";

/**
 * The same daily allowance for every workspace, from
 * ACME_AI_DAILY_REQUESTS. Billing replaces it with each plan's allowance.
 */
export const ConfiguredAssistantAllowanceLive = Layer.effect(
  AssistantAllowance,
  Effect.gen(function* ConfiguredAssistantAllowanceLive() {
    const dailyRequests = yield* dailyRequestsConfig;

    return AssistantAllowance.of({
      dailyRequests: () => Effect.succeed(dailyRequests),
    });
  })
);
