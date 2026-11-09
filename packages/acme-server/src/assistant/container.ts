import { Layer } from "effect";

import { WritingAssistant } from "#assistant/application/writing-assistant.ts";
import { ConfiguredAssistantAllowanceLive } from "#assistant/infrastructure/configured-assistant-allowance.ts";
import { DrizzleAssistantUsageLive } from "#assistant/infrastructure/drizzle-assistant-usage.ts";
import { DrizzleUsageRecordsLive } from "#assistant/infrastructure/drizzle-usage-records.ts";
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
 * Postgres and the platforms' limits from publishing, and UsageRecords, for
 * the workspace context's exports and erasures. The composition root
 * provides `Drizzle`.
 */
export const AssistantLive = Layer.mergeAll(
  WritingAssistant.layer.pipe(
    Layer.provide(
      Layer.mergeAll(
        WritingModelLive,
        DrizzleAssistantUsageLive,
        ConfiguredAssistantAllowanceLive,
        PublishingPlatformLimitsLive
      )
    )
  ),
  DrizzleUsageRecordsLive
);
