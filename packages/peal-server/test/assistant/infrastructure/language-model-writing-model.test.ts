import { assert, describe, it } from "@effect/vitest";
import { Cause, Effect, Exit, Logger, Result, Tracer } from "effect";
import { AiError } from "effect/ai";

import { WritingModel } from "#assistant/application/ports/writing-model.ts";
import { checkDraft } from "#assistant/domain/draft.ts";
import { TextAnswerSchema } from "#assistant/domain/suggestion.ts";
import { planFor } from "#assistant/domain/writing-prompt.ts";
import {
  answer,
  failure,
  FakeModel,
  FakeWritingModelLive,
  rawAnswer,
} from "#test/assistant/support.ts";
import type { Reply } from "#test/assistant/support.ts";

// Markers that would show if the draft or the answer reached a log or a
// trace.
const inDraft = "synthetic-draft-marker-4b1d";
const inAnswer = "synthetic-answer-marker-9c2e";

const { prompt } = planFor(
  { _tag: "rewrite", tone: "casual" },
  Result.getOrThrow(checkDraft(`Our launch is on Friday. ${inDraft}`)),
  []
);

// Everything a log line or a span would export, as text.
const spanText = (span: Tracer.NativeSpan): string =>
  [
    span.name,
    JSON.stringify([...span.attributes]),
    JSON.stringify(span.events),
    span.status._tag === "Ended" && Exit.isFailure(span.status.exit)
      ? Cause.pretty(span.status.exit.cause)
      : "",
  ].join("\n");

// Writes with the model answering `reply`, and returns what the logs and
// the spans recorded.
const recorded = (reply: Reply) =>
  Effect.gen(function* record() {
    const lines: string[] = [];
    const spans: Tracer.NativeSpan[] = [];

    const tracer = Tracer.make({
      span: (options) => {
        const span = new Tracer.NativeSpan(options);

        spans.push(span);

        return span;
      },
    });

    const logs = Logger.layer([
      Logger.make(({ cause, message }) => {
        lines.push(JSON.stringify(message), Cause.pretty(cause));
      }),
    ]);

    yield* FakeModel.use((model) => model.replyWith(reply));

    const outcome = yield* WritingModel.use((model) =>
      model.write(prompt, TextAnswerSchema)
    ).pipe(
      Effect.exit,
      Effect.withSpan("test.write"),
      Effect.withTracer(tracer),
      Effect.provide(logs)
    );

    return { lines, outcome, spans: spans.map(spanText) };
  }).pipe(Effect.provide(FakeWritingModelLive));

describe("the WritingModel on a language model", () => {
  // effect/ai's own spans record the errors they end with, and a provider's
  // error can quote what it was sent.
  it.effect.each([
    {
      kind: "StructuredOutputError",
      name: "an answer in the wrong shape",
      reply: answer({ text: { said: inAnswer } }),
    },
    {
      kind: "StructuredOutputError",
      name: "an answer that is not JSON",
      reply: rawAnswer(`Sure: ${inAnswer}`),
    },
    {
      kind: "ContentPolicyError",
      name: "a refusal that quotes the draft",
      reply: failure(
        new AiError.ContentPolicyError({ description: `flagged: ${inDraft}` })
      ),
    },
  ])("keeps the draft out of logs and traces after $name", ({ kind, reply }) =>
    Effect.gen(function* rejected() {
      const { lines, outcome, spans } = yield* recorded(reply);

      assert.isTrue(Exit.isFailure(outcome));
      assert.isTrue(lines.some((line) => line.includes(kind)));
      assert.isTrue(
        spans.some(
          (span) =>
            span.startsWith("WritingModel.write") &&
            span.includes("acme.assistant.failure")
        )
      );

      for (const text of [...lines, ...spans]) {
        assert.notInclude(text, inDraft);
        assert.notInclude(text, inAnswer);
      }
    })
  );

  it.effect("keeps the draft and the answer out of traces", () =>
    Effect.gen(function* accepted() {
      const { outcome, spans } = yield* recorded(
        answer({ text: `Friday's the day! ${inAnswer}` })
      );

      assert.isTrue(Exit.isSuccess(outcome));
      assert.isTrue(
        spans.some(
          (span) =>
            span.startsWith("WritingModel.write") &&
            span.includes("gen_ai.request.model")
        )
      );

      for (const span of spans) {
        assert.notInclude(span, inDraft);
        assert.notInclude(span, inAnswer);
      }
    })
  );
});
