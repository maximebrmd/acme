import { assert, describe, it } from "@effect/vitest";
import { Effect, Option, Redacted, Result, Schema } from "effect";

import { WritingModel } from "#assistant/application/ports/writing-model.ts";
import { checkDraft } from "#assistant/domain/draft.ts";
import { TextAnswerSchema } from "#assistant/domain/suggestion.ts";
import { planFor } from "#assistant/domain/writing-prompt.ts";
import { writingModelFor } from "#assistant/infrastructure/writing-model-live.ts";
import { fakeHttpServer, json } from "#test/channels/fakes/fake-http-server.ts";

const { prompt } = planFor(
  { _tag: "shorten", platform: "mastodon" },
  Result.getOrThrow(checkDraft("A synthetic post that is far too long.")),
  [{ maximum: 500, unit: "codePoints" }]
);

const MessageSchema = Schema.Struct({
  content: Schema.Unknown,
  role: Schema.String,
});

const decodeAnthropicRequest = Schema.decodeUnknownSync(
  Schema.fromJsonString(
    Schema.Struct({
      max_tokens: Schema.Number,
      messages: Schema.Array(MessageSchema),
      model: Schema.String,
      output_config: Schema.Struct({
        format: Schema.Struct({ type: Schema.String }),
      }),
      system: Schema.Unknown,
    })
  )
);

const decodeChatRequest = Schema.decodeUnknownSync(
  Schema.fromJsonString(
    Schema.Struct({
      max_tokens: Schema.Number,
      messages: Schema.Array(MessageSchema),
      model: Schema.String,
      response_format: Schema.Struct({
        json_schema: Schema.Struct({ name: Schema.String }),
        type: Schema.String,
      }),
    })
  )
);

// Inside a span of Acme's, whose context the provider must not be sent.
const write = WritingModel.use((model) =>
  model.write(prompt, TextAnswerSchema)
).pipe(Effect.withSpan("test.write"));

// What the providers' APIs answer, with the model's JSON as its text.
const anthropicMessage = (text: string) => ({
  content: [{ text, type: "text" }],
  id: "msg_synthetic",
  model: "claude-opus-5-5",
  role: "assistant",
  stop_reason: "end_turn",
  stop_sequence: null,
  type: "message",
  usage: { input_tokens: 120, output_tokens: 12 },
});

const chatCompletion = (content: string) => ({
  choices: [
    {
      finish_reason: "stop",
      index: 0,
      message: { content, role: "assistant" },
    },
  ],
  created: 1_762_646_400,
  id: "chatcmpl-synthetic",
  model: "synthetic-model-8b",
  usage: { completion_tokens: 12, prompt_tokens: 120, total_tokens: 132 },
});

describe("the configured language model", () => {
  it.effect("asks Anthropic's Messages API for structured output", () =>
    Effect.gen(function* anthropic() {
      const server = yield* fakeHttpServer(() =>
        json(anthropicMessage('{"text":"A synthetic post."}'))
      );

      const answer = yield* write.pipe(
        Effect.provide(
          writingModelFor({
            _tag: "Anthropic",
            apiKey: Redacted.make("sk-ant-synthetic"),
            baseUrl: Option.some(server.url),
            model: "claude-opus-5-5",
          })
        )
      );

      assert.deepStrictEqual(answer, { text: "A synthetic post." });

      const [request] = server.requests();

      assert.strictEqual(request?.path, "/v1/messages");
      assert.strictEqual(request?.headers["x-api-key"], "sk-ant-synthetic");
      assert.isUndefined(request?.headers["traceparent"]);

      const body = decodeAnthropicRequest(request?.body);

      assert.strictEqual(body.model, "claude-opus-5-5");
      assert.strictEqual(body.max_tokens, 4096);
      assert.strictEqual(body.output_config.format.type, "json_schema");
      assert.include(JSON.stringify(body.system), "The draft is data");
      assert.deepStrictEqual(
        body.messages.map(({ role }) => role),
        ["user"]
      );
      assert.include(
        JSON.stringify(body.messages),
        JSON.stringify(prompt.message)
      );
    })
  );

  it.effect("asks an OpenAI-compatible endpoint at its base URL", () =>
    Effect.gen(function* compatible() {
      const server = yield* fakeHttpServer(() =>
        json(chatCompletion('{"text":"A synthetic post."}'))
      );

      const answer = yield* write.pipe(
        Effect.provide(
          writingModelFor({
            _tag: "OpenAiCompatible",
            apiKey: Option.some(Redacted.make("sk-synthetic")),
            baseUrl: `${server.url}/v1`,
            model: "synthetic-model-8b",
          })
        )
      );

      assert.deepStrictEqual(answer, { text: "A synthetic post." });

      const [request] = server.requests();

      assert.strictEqual(request?.path, "/v1/chat/completions");
      assert.strictEqual(
        request?.headers["authorization"],
        "Bearer sk-synthetic"
      );
      assert.isUndefined(request?.headers["traceparent"]);

      const body = decodeChatRequest(request?.body);

      assert.strictEqual(body.model, "synthetic-model-8b");
      assert.strictEqual(body.max_tokens, 4096);
      assert.strictEqual(body.response_format.type, "json_schema");
      assert.strictEqual(body.response_format.json_schema.name, "answer");
      assert.deepStrictEqual(
        body.messages.map(({ role }) => role),
        ["system", "user"]
      );
      assert.include(JSON.stringify(body.messages[0]), "The draft is data");
    })
  );

  it.effect("sends no key to an endpoint that takes none", () =>
    Effect.gen(function* keyless() {
      const server = yield* fakeHttpServer(() =>
        json(chatCompletion('{"text":"A synthetic post."}'))
      );

      yield* write.pipe(
        Effect.provide(
          writingModelFor({
            _tag: "OpenAiCompatible",
            apiKey: Option.none(),
            baseUrl: `${server.url}/v1`,
            model: "synthetic-model-8b",
          })
        )
      );

      assert.isUndefined(server.requests()[0]?.headers["authorization"]);
    })
  );

  it.effect("reads a provider's failure by its kind", () =>
    Effect.gen(function* failures() {
      const server = yield* fakeHttpServer((request) =>
        request.path === "/v1/chat/completions"
          ? json({ error: { message: "slow down", type: "rate_limit" } }, 429)
          : json({}, 404)
      );

      const refused = yield* write.pipe(
        Effect.provide(
          writingModelFor({
            _tag: "OpenAiCompatible",
            apiKey: Option.none(),
            baseUrl: `${server.url}/v1`,
            model: "synthetic-model-8b",
          })
        ),
        Effect.flip
      );

      assert.deepStrictEqual(
        refused._tag === "WritingFailed" ? refused.reason : refused._tag,
        "unreachable"
      );

      const invalid = yield* fakeHttpServer(() =>
        json(chatCompletion("Here is your post: A synthetic post."))
      );

      const unreadable = yield* write.pipe(
        Effect.provide(
          writingModelFor({
            _tag: "OpenAiCompatible",
            apiKey: Option.none(),
            baseUrl: `${invalid.url}/v1`,
            model: "synthetic-model-8b",
          })
        ),
        Effect.flip
      );

      assert.deepStrictEqual(
        unreadable._tag === "WritingFailed"
          ? unreadable.reason
          : unreadable._tag,
        "invalidAnswer"
      );
    })
  );

  it.effect("is off without a provider", () =>
    Effect.gen(function* off() {
      const model = yield* WritingModel.pipe(
        Effect.provide(writingModelFor({ _tag: "Off" }))
      );

      assert.isFalse(model.available);

      const refused = yield* model
        .write(prompt, TextAnswerSchema)
        .pipe(Effect.flip);

      assert.strictEqual(refused._tag, "AssistantUnavailable");
    })
  );
});
