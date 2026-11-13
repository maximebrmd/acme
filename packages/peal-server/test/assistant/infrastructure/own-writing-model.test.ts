import { once } from "node:events";
import { createServer } from "node:http";

import { assert, describe, it } from "@effect/vitest";
import type { Duration } from "effect";
import {
  Cause,
  Effect,
  Exit,
  Layer,
  Logger,
  Option,
  Redacted,
  Ref,
  Result,
  Schema,
  Tracer,
} from "effect";
import { FetchHttpClient } from "effect/http";
import { Dns } from "effect/net";

import { OwnWritingModel } from "#assistant/application/ports/own-writing-model.ts";
import type { OwnTextEndpoint } from "#assistant/application/ports/own-writing-model.ts";
import { checkDraft } from "#assistant/domain/draft.ts";
import {
  ProviderAddressSchema,
  ProviderModelSchema,
} from "#assistant/domain/image-provider.ts";
import { TextAnswerSchema } from "#assistant/domain/suggestion.ts";
import type { TextProviderKind } from "#assistant/domain/text-provider.ts";
import { planFor } from "#assistant/domain/writing-prompt.ts";
import { ownWritingModel } from "#assistant/infrastructure/own-writing-model.ts";
import { OutboundGuard } from "#shared/infrastructure/platforms/outbound-guard.ts";
import { OutboundRequestRefused } from "#shared/infrastructure/platforms/outbound-request-refused.ts";
import { fakeHttpServer, json } from "#test/channels/fakes/fake-http-server.ts";
import type { FakeResponse } from "#test/channels/fakes/fake-http-server.ts";
import { OpenOutboundGuard } from "#test/channels/support.ts";

// A workspace's own text provider against fakes on loopback, reached
// through a guard that lets loopback through; one test keeps the real
// guard, which refuses it. Nothing here calls a real provider.

// Markers that would show if the draft or the key reached a log or a
// trace.
const inDraft = "synthetic-draft-marker-7d21";
const syntheticKey = "synthetic-workspace-text-key";
const syntheticModel = "synthetic-text-model-3c";

const { prompt } = planFor(
  { _tag: "shorten", platform: "mastodon" },
  Result.getOrThrow(checkDraft(`A synthetic post far too long. ${inDraft}`)),
  [{ maximum: 500, unit: "codePoints" }]
);

const anthropicMessage = (text: string) => ({
  content: [{ text, type: "text" }],
  id: "msg_synthetic",
  model: syntheticModel,
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
  model: syntheticModel,
  usage: { completion_tokens: 12, prompt_tokens: 120, total_tokens: 132 },
});

const decodeAddress = Schema.decodeUnknownSync(
  Schema.Struct({ port: Schema.Number })
);

// A provider that takes every request and never answers, for the life of
// the scope: its origin.
const silentServer = Effect.acquireRelease(
  Effect.promise(async () => {
    const server = createServer(() => {
      // Never answers.
    });

    server.listen(0, "127.0.0.1");
    await once(server, "listening");

    return server;
  }),
  (server) =>
    Effect.promise(async () => {
      server.closeAllConnections();
      server.close();
      await once(server, "close");
    })
).pipe(
  Effect.map(
    (server) => `http://127.0.0.1:${decodeAddress(server.address()).port}`
  )
);

const endpointAt = (
  kind: TextProviderKind,
  baseUrl: string
): OwnTextEndpoint => ({
  apiKey: Redacted.make(syntheticKey),
  baseUrl: ProviderAddressSchema.make(baseUrl),
  kind,
  model: ProviderModelSchema.make(syntheticModel),
});

const modelWith = ({
  guard = OpenOutboundGuard,
  timeout = "5 seconds",
}: {
  readonly guard?: Layer.Layer<OutboundGuard>;
  readonly timeout?: Duration.Input;
} = {}) =>
  ownWritingModel({ timeout }).pipe(
    Layer.provide(guard),
    Layer.provide(FetchHttpClient.layer)
  );

const spanText = (span: Tracer.NativeSpan): string =>
  [
    span.name,
    JSON.stringify([...span.attributes]),
    JSON.stringify(span.events),
    span.status._tag === "Ended" && Exit.isFailure(span.status.exit)
      ? Cause.pretty(span.status.exit.cause)
      : "",
  ].join("\n");

// Asks the workspace's provider for a suggestion, and returns what came
// back, what the logs said and what the spans recorded.
const write = (
  endpoint: OwnTextEndpoint,
  layer: Layer.Layer<OwnWritingModel> = modelWith()
) =>
  Effect.gen(function* writing() {
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

    const outcome = yield* OwnWritingModel.use((model) =>
      model.write(endpoint, prompt, TextAnswerSchema)
    ).pipe(
      Effect.exit,
      Effect.withSpan("test.write"),
      Effect.withTracer(tracer),
      Effect.provide(Layer.merge(layer, logs))
    );

    return { lines, outcome, spans: spans.map(spanText) };
  });

// What a call ended with, in a word.
const failureOf = <A>(
  outcome: Exit.Exit<
    A,
    {
      readonly _tag: string;
      readonly reason?: string;
      readonly status?: number | null;
    }
  >
) =>
  Exit.isFailure(outcome)
    ? Option.match(Cause.findErrorOption(outcome.cause), {
        onNone: () => "defect",
        onSome: (error) =>
          error._tag === "TextProviderRefused"
            ? `${error.reason} ${error.status ?? "null"}`
            : (error.reason ?? error._tag),
      })
    : "success";

// Neither the draft, the key, the model nor the host ever reaches a log
// line or a span.
const assertNothingLeaked = (
  { lines, spans }: { readonly lines: string[]; readonly spans: string[] },
  host: string
) => {
  for (const text of [...lines, ...spans]) {
    assert.notInclude(text, inDraft);
    assert.notInclude(text, syntheticKey);
    assert.notInclude(text, syntheticModel);
    assert.notInclude(text, host);
  }
};

describe("a workspace's own text provider", () => {
  it.effect("asks Anthropic's Messages API with the workspace's key", () =>
    Effect.gen(function* anthropic() {
      const server = yield* fakeHttpServer(() =>
        json(anthropicMessage('{"text":"A synthetic post."}'))
      );

      const written = yield* write(endpointAt("anthropic", server.url));

      assert.deepStrictEqual(
        Exit.isSuccess(written.outcome) ? written.outcome.value : null,
        { text: "A synthetic post." }
      );

      const [request] = server.requests();

      assert.strictEqual(request?.path, "/v1/messages");
      assert.strictEqual(request?.headers["x-api-key"], syntheticKey);
      assert.isUndefined(request?.headers["traceparent"]);
      assert.include(request?.body ?? "", syntheticModel);
      assertNothingLeaked(written, "127.0.0.1");
      assert.isTrue(
        written.spans.some(
          (span) =>
            span.startsWith("OwnWritingModel.write") &&
            span.includes('"peal.assistant.text_source","workspace"')
        )
      );
    })
  );

  it.effect("asks an OpenAI-compatible endpoint at its address", () =>
    Effect.gen(function* compatible() {
      const server = yield* fakeHttpServer(() =>
        json(chatCompletion('{"text":"A synthetic post."}'))
      );

      const written = yield* write(
        endpointAt("openai-compatible", `${server.url}/v1`)
      );

      assert.strictEqual(failureOf(written.outcome), "success");

      const [request] = server.requests();

      assert.strictEqual(request?.path, "/v1/chat/completions");
      assert.strictEqual(
        request?.headers["authorization"],
        `Bearer ${syntheticKey}`
      );
      assert.isUndefined(request?.headers["traceparent"]);
      assertNothingLeaked(written, "127.0.0.1");
    })
  );

  it.effect(
    "says the provider refused its settings, by status alone, and logs nothing of it",
    () =>
      Effect.gen(function* refused() {
        for (const status of [401, 402, 403, 404]) {
          const server = yield* fakeHttpServer(() =>
            json(
              {
                error: {
                  message: `bad key ${syntheticKey} for ${inDraft}`,
                  type: "authentication_error",
                },
                type: "error",
              },
              status
            )
          );

          for (const kind of ["anthropic", "openai-compatible"] as const) {
            const written = yield* write(
              endpointAt(
                kind,
                kind === "anthropic" ? server.url : `${server.url}/v1`
              )
            );

            assert.strictEqual(
              failureOf(written.outcome),
              `settingsRefused ${status}`,
              `${kind} ${status}`
            );
            assertNothingLeaked(written, "127.0.0.1");
          }
        }
      })
  );

  it.effect("never follows a redirect, and says so", () =>
    Effect.gen(function* redirected() {
      const elsewhere = yield* fakeHttpServer(() =>
        json(chatCompletion('{"text":"From elsewhere."}'))
      );

      const redirect: FakeResponse = {
        headers: { location: `${elsewhere.url}/v1/chat/completions` },
        status: 307,
      };

      const server = yield* fakeHttpServer(() => redirect);

      const written = yield* write(
        endpointAt("openai-compatible", `${server.url}/v1`)
      );

      assert.strictEqual(failureOf(written.outcome), "redirected 307");
      assert.lengthOf(elsewhere.requests(), 0);
    })
  );

  it.effect("tells a provider that failed from one that refused", () =>
    Effect.gen(function* failed() {
      const limited = yield* fakeHttpServer(() =>
        json({ error: { message: "slow down", type: "rate_limit" } }, 429)
      );

      assert.strictEqual(
        failureOf(
          (yield* write(endpointAt("openai-compatible", `${limited.url}/v1`)))
            .outcome
        ),
        "unreachable"
      );

      const broken = yield* fakeHttpServer(() =>
        json({ error: { message: "down", type: "server_error" } }, 500)
      );

      assert.strictEqual(
        failureOf((yield* write(endpointAt("anthropic", broken.url))).outcome),
        "unreachable"
      );

      const unreadable = yield* fakeHttpServer(() =>
        json(chatCompletion("Here is your post: no JSON at all."))
      );

      assert.strictEqual(
        failureOf(
          (yield* write(
            endpointAt("openai-compatible", `${unreadable.url}/v1`)
          )).outcome
        ),
        "invalidAnswer"
      );
    })
  );

  it.live("gives up after its timeout, as the request may have run", () =>
    Effect.gen(function* slow() {
      const server = yield* silentServer;

      const silent = yield* write(
        endpointAt("openai-compatible", `${server}/v1`),
        modelWith({ timeout: "200 millis" })
      );

      assert.strictEqual(failureOf(silent.outcome), "timedOut");
    })
  );

  it.effect(
    "checks the request as the provider package sends it, after the address passed",
    () =>
      Effect.gen(function* twice() {
        const server = yield* fakeHttpServer(() =>
          json(chatCompletion('{"text":"A synthetic post."}'))
        );

        // A name whose answer changed between the adapter's check and the
        // request: the first check passes, every later one refuses.
        const checks = yield* Ref.make(0);

        const changing = Layer.succeed(
          OutboundGuard,
          OutboundGuard.of({
            check: (url) =>
              Ref.getAndUpdate(checks, (count) => count + 1).pipe(
                Effect.flatMap((count) =>
                  count === 0
                    ? Effect.void
                    : Effect.fail(
                        new OutboundRequestRefused({
                          host: url.host,
                          reason: "notPublic",
                        })
                      )
                )
              ),
          })
        );

        const written = yield* write(
          endpointAt("openai-compatible", `${server.url}/v1`),
          modelWith({ guard: changing })
        );

        assert.strictEqual(failureOf(written.outcome), "unreachable");
        assert.isAtLeast(yield* Ref.get(checks), 2);
        assert.lengthOf(server.requests(), 0);
      })
  );

  it.effect(
    "sends nothing to an address the outbound guard refuses, and names no host",
    () =>
      Effect.gen(function* guarded() {
        const server = yield* fakeHttpServer(() =>
          json(chatCompletion('{"text":"A synthetic post."}'))
        );

        const written = yield* write(
          endpointAt("openai-compatible", `${server.url}/v1`),
          modelWith({
            guard: OutboundGuard.layer.pipe(
              Layer.provide(Dns.layerStatic({ hosts: {} })),
              Layer.orDie
            ),
          })
        );

        assert.strictEqual(failureOf(written.outcome), "addressRefused null");
        assert.lengthOf(server.requests(), 0);
        assertNothingLeaked(written, "127.0.0.1");
      })
  );
});
