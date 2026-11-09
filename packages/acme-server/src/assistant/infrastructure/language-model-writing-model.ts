import { Effect, Layer } from "effect";
import type { Schema } from "effect";
import { LanguageModel, Prompt } from "effect/ai";
import type { AiError, Response } from "effect/ai";

import { WritingModel } from "#assistant/application/ports/writing-model.ts";
import { WritingFailed } from "#assistant/application/writing-failed.ts";
import type { WritingPrompt } from "#assistant/domain/writing-prompt.ts";

/** The provider and model a WritingModel asks, as its traces name them. */
export interface ModelIdentity {
  readonly model: string;
  readonly provider: string;
}

// What a provider's failure means for the person who asked: anything but a
// refusal or an answer in the wrong shape means the request did not run.
const reasonOf = (error: AiError.AiError): WritingFailed["reason"] => {
  const kind = error.reason._tag;

  if (kind === "ContentPolicyError") {
    return "declined";
  }

  return kind === "InvalidOutputError" || kind === "StructuredOutputError"
    ? "invalidAnswer"
    : "unreachable";
};

// The system message holds the instructions alone; the user message holds
// the draft, as data.
const promptOf = ({ instructions, message }: WritingPrompt): Prompt.Prompt =>
  Prompt.fromMessages([
    Prompt.systemMessage({ content: instructions }),
    Prompt.userMessage({ content: [Prompt.textPart({ text: message })] }),
  ]);

// The token counts the provider reported, as OpenTelemetry names them.
interface UsageAttributes {
  "gen_ai.usage.input_tokens"?: number;
  "gen_ai.usage.output_tokens"?: number;
}

const usageOf = ({ inputTokens, outputTokens }: Response.Usage) => {
  const attributes: UsageAttributes = {};

  if (inputTokens.total !== undefined) {
    attributes["gen_ai.usage.input_tokens"] = inputTokens.total;
  }

  if (outputTokens.total !== undefined) {
    attributes["gen_ai.usage.output_tokens"] = outputTokens.total;
  }

  return attributes;
};

// The log and the span name the kind of failure, never its message.
const failed =
  ({ model, provider }: ModelIdentity) =>
  (error: AiError.AiError) => {
    const reason = reasonOf(error);
    const kind = error.reason._tag;

    return Effect.logWarning("The assistant's language model failed", {
      kind,
      model,
      provider,
      reason,
    }).pipe(
      Effect.andThen(
        Effect.annotateCurrentSpan("acme.assistant.failure", kind)
      ),
      Effect.andThen(Effect.fail(new WritingFailed({ reason })))
    );
  };

/**
 * The assistant's WritingModel on the LanguageModel a provider package
 * gives, asking for structured output that the answer's schema decodes.
 *
 * Prompts and answers stay out of logs and traces. Provider errors can
 * quote either (a structured output error carries the answer), and the
 * spans of effect/ai and of the HTTP client record their errors, so those
 * spans are turned off around the call: its own span records the
 * provider, the model, the token counts and why a call failed, by kind
 * only.
 */
export const languageModelWritingModel = (identity: ModelIdentity) =>
  Layer.effect(
    WritingModel,
    Effect.gen(function* makeWritingModel() {
      const model = yield* LanguageModel.LanguageModel;
      const fail = failed(identity);

      const write = <A, I extends Readonly<Record<string, unknown>>>(
        prompt: WritingPrompt,
        answer: Schema.Codec<A, I>
      ) =>
        model
          .generateObject({
            objectName: "answer",
            prompt: promptOf(prompt),
            schema: answer,
          })
          .pipe(
            Effect.withTracerEnabled(false),
            Effect.tap((response) =>
              Effect.annotateCurrentSpan({
                ...usageOf(response.usage),
                "gen_ai.response.finish_reasons": [response.finishReason],
              })
            ),
            Effect.map((response) => response.value),
            Effect.catchTag("AiError", fail),
            Effect.withSpan("WritingModel.write", {
              attributes: {
                "gen_ai.provider.name": identity.provider,
                "gen_ai.request.model": identity.model,
              },
            })
          );

      return WritingModel.of({ available: true, write });
    })
  );
