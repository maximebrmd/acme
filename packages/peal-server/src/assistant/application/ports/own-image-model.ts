import { Context } from "effect";
import type { Effect, Redacted } from "effect";

import type { ImageFailed } from "#assistant/application/image-failed.ts";
import type { ImageProviderRefused } from "#assistant/application/image-provider-refused.ts";
import type {
  ImageRequest,
  MadeImage,
} from "#assistant/application/ports/image-model.ts";
import type {
  ProviderAddress,
  ProviderModel,
} from "#assistant/domain/image-provider.ts";

/** Where a workspace's own provider is, which model, and its key. */
export interface OwnImageEndpoint {
  readonly apiKey: Redacted.Redacted;
  readonly baseUrl: ProviderAddress;
  readonly model: ProviderModel;
}

/**
 * The image provider a workspace brought: an endpoint that speaks the
 * OpenAI images API, at an address a member typed. Every call goes
 * through the outbound guard, follows no redirect and reads a bounded
 * answer. It keeps no state: a refusal is said and the next call tries
 * again. Never logs or traces the prompt, the image, the provider's
 * answer, the key or the provider's host.
 */
export class OwnImageModel extends Context.Service<
  OwnImageModel,
  {
    readonly generate: (
      endpoint: OwnImageEndpoint,
      request: ImageRequest
    ) => Effect.Effect<MadeImage, ImageFailed | ImageProviderRefused>;
  }
>()("peal-server/assistant/application/OwnImageModel") {}
