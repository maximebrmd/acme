import { Context } from "effect";
import type { Effect, Schema } from "effect";

import type { AssistantUnavailable } from "#assistant/application/assistant-unavailable.ts";
import type { WritingFailed } from "#assistant/application/writing-failed.ts";
import type { WritingPrompt } from "#assistant/domain/writing-prompt.ts";

/**
 * The language model the assistant writes with: Anthropic's API, an
 * OpenAI-compatible endpoint, or none, which turns the assistant off.
 *
 * `write` sends the prompt's instructions as the system message and its
 * message as the user's, and asks for an answer in the shape of `answer`,
 * which it decodes. It never logs or traces the prompt or the answer.
 */
export class WritingModel extends Context.Service<
  WritingModel,
  {
    /** Whether a model is configured; when not, `write` always fails. */
    readonly available: boolean;
    readonly write: <A, I extends Readonly<Record<string, unknown>>>(
      prompt: WritingPrompt,
      answer: Schema.Codec<A, I>
    ) => Effect.Effect<A, AssistantUnavailable | WritingFailed>;
  }
>()("peal-server/assistant/application/WritingModel") {}
