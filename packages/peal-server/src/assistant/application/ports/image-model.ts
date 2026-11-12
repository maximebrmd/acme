import { Context } from "effect";
import type { Effect } from "effect";

import type { AssistantUnavailable } from "#assistant/application/assistant-unavailable.ts";
import type { ImageFailed } from "#assistant/application/image-failed.ts";
import type { ImageAspect } from "#assistant/domain/image-aspect.ts";
import type { ImagePrompt } from "#assistant/domain/image-prompt.ts";

/** What to make: the description, and the image's aspect. */
export interface ImageRequest {
  readonly prompt: ImagePrompt;
  readonly aspect: ImageAspect;
}

/** The image the provider made, as its bytes, exactly as they came. */
export interface MadeImage {
  readonly bytes: Uint8Array;
}

/**
 * The model the assistant makes images with: an OpenAI-compatible
 * endpoint that serves `/images/generations`, or none, which turns images
 * off. It is set apart from the writing model, which may make no images.
 *
 * `generate` never logs or traces the prompt, the image or a provider's
 * error; it fails with AssistantUnavailable when the provider refuses the
 * server's credentials.
 */
export class ImageModel extends Context.Service<
  ImageModel,
  {
    /** Whether an image model is configured; when not, `generate` always fails. */
    readonly available: boolean;
    readonly generate: (
      request: ImageRequest
    ) => Effect.Effect<MadeImage, AssistantUnavailable | ImageFailed>;
  }
>()("peal-server/assistant/application/ImageModel") {}
