import { Context } from "effect";
import type { Effect, Redacted, Schema } from "effect";

import type { TextProviderRefused } from "#assistant/application/text-provider-refused.ts";
import type { WritingFailed } from "#assistant/application/writing-failed.ts";
import type {
  ProviderAddress,
  ProviderModel,
} from "#assistant/domain/image-provider.ts";
import type { TextProviderKind } from "#assistant/domain/text-provider.ts";
import type { WritingPrompt } from "#assistant/domain/writing-prompt.ts";

/** Where a workspace's own text provider is, what it speaks, which model, and its key. */
export interface OwnTextEndpoint {
  readonly apiKey: Redacted.Redacted;
  readonly baseUrl: ProviderAddress;
  readonly kind: TextProviderKind;
  readonly model: ProviderModel;
}

/**
 * The text provider a workspace brought: Anthropic's API or an
 * OpenAI-compatible endpoint, at an address a member typed. `write` asks
 * as the server's WritingModel does (the instructions as the system
 * message, the draft as data, an answer in the shape of `answer`), but
 * every call goes through the outbound guard, follows no redirect and
 * reads a bounded answer. It keeps no state: a refusal is said and the
 * next call tries again. Never logs or traces the prompt, the answer, the
 * provider's error, the key, the provider's host or its model.
 */
export class OwnWritingModel extends Context.Service<
  OwnWritingModel,
  {
    readonly write: <A, I extends Readonly<Record<string, unknown>>>(
      endpoint: OwnTextEndpoint,
      prompt: WritingPrompt,
      answer: Schema.Codec<A, I>
    ) => Effect.Effect<A, TextProviderRefused | WritingFailed>;
  }
>()("peal-server/assistant/application/OwnWritingModel") {}
