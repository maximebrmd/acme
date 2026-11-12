import { Effect, Layer, Match } from "effect";
import { FetchHttpClient } from "effect/http";

import { imageProviderConfig } from "#assistant/infrastructure/assistant-settings.ts";
import type { ImageProvider } from "#assistant/infrastructure/assistant-settings.ts";
import { openAiCompatibleImageModel } from "#assistant/infrastructure/openai-compatible-image-model.ts";
import { UnavailableImageModelLive } from "#assistant/infrastructure/unavailable-image-model.ts";
import { OutboundGuard } from "#shared/infrastructure/platforms/outbound-guard.ts";

/**
 * The ImageModel for a provider's settings. The address a provider answers
 * with goes through the OutboundGuard, which resolves names with the
 * runtime's Dns.
 */
export const imageModelFor = (provider: ImageProvider) =>
  Match.valueTags(provider, {
    Off: () => UnavailableImageModelLive,
    OpenAiCompatible: (endpoint) =>
      openAiCompatibleImageModel(endpoint).pipe(
        Layer.provide(OutboundGuard.layer),
        Layer.provide(FetchHttpClient.layer)
      ),
  });

/** The image model the environment names, or none (see assistant-settings.ts). */
export const ImageModelLive = Layer.unwrap(
  imageProviderConfig.pipe(Effect.map(imageModelFor))
);
