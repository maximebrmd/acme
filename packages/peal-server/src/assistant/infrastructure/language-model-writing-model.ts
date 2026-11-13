import { Effect, Layer } from "effect";
import type { Duration, Schema } from "effect";
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

/**
 * How long the assistant waits for an answer. Models take their time over
 * a long post, but not this long. The provider may have run a request it
 * did not answer in time, so such a request counts toward the quota.
 * Whatever sits between the browser and the server must wait longer (see
 * the web app's next.config.ts).
 */
export const answerTimeout: Duration.Input = "90 seconds";

// The failures that come with an answer from the provider: it ran the
// request, so the request counts.
const answered: ReadonlySet<string> = new Set([
  "InvalidOutputError",
  "InvalidResponseError",
  "StructuredOutputError",
]);

/**
 * What a provider's failure means for the person who asked: anything but a
 * refusal or an answer that cannot be read means the request did not run.
 */
export const reasonOf = (error: AiError.AiError): WritingFailed["reason"] => {
  const kind = error.reason._tag;

  if (kind === "ContentPolicyError") {
    return "declined";
  }

  return answered.has(kind) ? "invalidAnswer" : "unreachable";
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
const failWith = (
  { model, provider }: ModelIdentity,
  kind: string,
  reason: WritingFailed["reason"]
) =>
  Effect.logWarning("The assistant's language model failed", {
    kind,
    model,
    provider,
    reason,
  }).pipe(
    Effect.andThen(Effect.annotateCurrentSpan("peal.assistant.failure", kind)),
    Effect.andThen(Effect.fail(new WritingFailed({ reason })))
  );

const failed = (identity: ModelIdentity) => (error: AiError.AiError) =>
  failWith(identity, error.reason._tag, reasonOf(error));

const tookTooLong = (identity: ModelIdentity) => () =>
  failWith(identity, "Timeout", "timedOut");

/**
 * Asks `model` for an answer in the shape of `answer`, the prompt's
 * instructions as the system message and its message as the user's, with
 * effect/ai's and the HTTP client's spans off (their errors can quote the
 * prompt or the answer): the current span gets the token counts and the
 * finish reason only.
 */
export const generateAnswer = <A, I extends Readonly<Record<string, unknown>>>(
  model: LanguageModel.LanguageModel,
  prompt: WritingPrompt,
  answer: Schema.Codec<A, I>
): Effect.Effect<A, AiError.AiError> =>
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
      Effect.map((response) => response.value)
    );

/**
 * The assistant's WritingModel on the LanguageModel a provider package
 * gives, asking for structured output that the answer's schema decodes,
 * and waiting `answerTimeout` for it at most.
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
      const timedOut = tookTooLong(identity);

      const write = <A, I extends Readonly<Record<string, unknown>>>(
        prompt: WritingPrompt,
        answer: Schema.Codec<A, I>
      ) =>
        generateAnswer(model, prompt, answer).pipe(
          Effect.catchTag("AiError", fail),
          // Interrupting the call aborts its HTTP request.
          Effect.timeoutOrElse({ duration: answerTimeout, orElse: timedOut }),
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
