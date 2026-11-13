import { Layer } from "effect";

import { AssistantRequests } from "#assistant/application/assistant-requests.ts";
import { WritingAssistant } from "#assistant/application/writing-assistant.ts";
import { CipherProviderSecrets } from "#assistant/infrastructure/cipher-provider-secrets.ts";
import { CountedImageSlots } from "#assistant/infrastructure/counted-image-slots.ts";
import { DrizzleAssistantUsageLive } from "#assistant/infrastructure/drizzle-assistant-usage.ts";
import { DrizzleImageProvidersLive } from "#assistant/infrastructure/drizzle-image-providers.ts";
import { DrizzleOwnImageCountsLive } from "#assistant/infrastructure/drizzle-own-image-counts.ts";
import { DrizzleOwnTextCountsLive } from "#assistant/infrastructure/drizzle-own-text-counts.ts";
import { DrizzleTextProvidersLive } from "#assistant/infrastructure/drizzle-text-providers.ts";
import { DrizzleUsageRecordsLive } from "#assistant/infrastructure/drizzle-usage-records.ts";
import { GuardedProviderAddressCheck } from "#assistant/infrastructure/guarded-provider-address-check.ts";
import { ImageModelLive } from "#assistant/infrastructure/image-model-live.ts";
import { LibraryGeneratedImagesLive } from "#assistant/infrastructure/library-generated-images.ts";
import { OwnImageModelLive } from "#assistant/infrastructure/openai-compatible-own-image-model.ts";
import { OwnWritingModelLive } from "#assistant/infrastructure/own-writing-model.ts";
import { PlanAssistantAllowanceLive } from "#assistant/infrastructure/plan-assistant-allowance.ts";
import { PublishingPlatformLimitsLive } from "#assistant/infrastructure/publishing-platform-limits.ts";
import { WritingModelLive } from "#assistant/infrastructure/writing-model-live.ts";
import { OutboundGuard } from "#shared/infrastructure/platforms/outbound-guard.ts";

export { WritingAssistant } from "#assistant/application/writing-assistant.ts";

// The assistant endpoints. They need the use cases AssistantLive provides,
// and the Authentication and WorkspaceAccess middleware of the workspace
// context, which the composition root brings.
export { AssistantHandlers as AssistantApiLive } from "#assistant/api/assistant.ts";

/**
 * The writing assistant: its use cases on the language model and the image
 * model the environment names (or none, which turns each off), the daily
 * quota in Postgres, as large as the workspace's plan allows, the
 * platforms' limits from publishing, and the media library, which keeps
 * the images it makes; the image and text providers each workspace may
 * bring, their keys sealed on the channels context's `TokenCipher`, called
 * through the outbound guard; the day's count, for billing; and UsageRecords, for the
 * workspace context's exports and erasures. The composition root provides
 * `Drizzle`, the billing context's `WorkspaceEntitlements`, the media
 * context's `MediaLibrary`, the `TokenCipher` and the runtime's Dns (the
 * outbound guard checks the addresses a workspace types and those an image
 * provider answers with).
 */
export const AssistantLive = Layer.mergeAll(
  Layer.mergeAll(WritingAssistant.layer, AssistantRequests.layer).pipe(
    Layer.provide(
      Layer.mergeAll(
        WritingModelLive,
        ImageModelLive,
        OwnImageModelLive,
        DrizzleOwnImageCountsLive,
        OwnWritingModelLive,
        DrizzleOwnTextCountsLive,
        Layer.mergeAll(
          DrizzleImageProvidersLive,
          DrizzleTextProvidersLive
        ).pipe(Layer.provide(CipherProviderSecrets)),
        GuardedProviderAddressCheck.pipe(Layer.provide(OutboundGuard.layer)),
        CountedImageSlots,
        LibraryGeneratedImagesLive,
        DrizzleAssistantUsageLive,
        PlanAssistantAllowanceLive,
        PublishingPlatformLimitsLive
      )
    )
  ),
  DrizzleUsageRecordsLive
);
