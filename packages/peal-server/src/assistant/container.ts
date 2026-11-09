import { Layer } from "effect";

import { AssistantRequests } from "#assistant/application/assistant-requests.ts";
import { WritingAssistant } from "#assistant/application/writing-assistant.ts";
import { DrizzleAssistantUsageLive } from "#assistant/infrastructure/drizzle-assistant-usage.ts";
import { DrizzleUsageRecordsLive } from "#assistant/infrastructure/drizzle-usage-records.ts";
import { PlanAssistantAllowanceLive } from "#assistant/infrastructure/plan-assistant-allowance.ts";
import { PublishingPlatformLimitsLive } from "#assistant/infrastructure/publishing-platform-limits.ts";
import { WritingModelLive } from "#assistant/infrastructure/writing-model-live.ts";

export { WritingAssistant } from "#assistant/application/writing-assistant.ts";

// The assistant endpoints. They need the use cases AssistantLive provides,
// and the Authentication and WorkspaceAccess middleware of the workspace
// context, which the composition root brings.
export { AssistantHandlers as AssistantApiLive } from "#assistant/api/assistant.ts";

/**
 * The writing assistant: its use cases on the language model the
 * environment names (or none, which turns it off), the daily quota in
 * Postgres, as large as the workspace's plan allows, and the platforms'
 * limits from publishing; the day's count, for billing; and UsageRecords,
 * for the workspace context's exports and erasures. The composition root
 * provides `Drizzle` and the billing context's `WorkspaceEntitlements`.
 */
export const AssistantLive = Layer.mergeAll(
  Layer.mergeAll(WritingAssistant.layer, AssistantRequests.layer).pipe(
    Layer.provide(
      Layer.mergeAll(
        WritingModelLive,
        DrizzleAssistantUsageLive,
        PlanAssistantAllowanceLive,
        PublishingPlatformLimitsLive
      )
    )
  ),
  DrizzleUsageRecordsLive
);
