import { Effect, Layer } from "effect";

import { AssistantUnavailable } from "#assistant/application/assistant-unavailable.ts";
import { ImageModel } from "#assistant/application/ports/image-model.ts";

/** No image model: the assistant makes no images, and every request says so. */
export const UnavailableImageModelLive = Layer.succeed(
  ImageModel,
  ImageModel.of({
    available: Effect.succeed(false),
    generate: () => Effect.fail(new AssistantUnavailable()),
  })
);
