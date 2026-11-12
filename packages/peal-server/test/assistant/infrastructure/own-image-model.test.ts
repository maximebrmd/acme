import { once } from "node:events";
import { createServer } from "node:http";
import type { IncomingHttpHeaders, ServerResponse } from "node:http";

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
  Schema,
  Tracer,
} from "effect";
import { Base64 } from "effect/encoding";
import { FetchHttpClient } from "effect/http";
import { Dns } from "effect/net";

import { OwnImageModel } from "#assistant/application/ports/own-image-model.ts";
import type { OwnImageEndpoint } from "#assistant/application/ports/own-image-model.ts";
import { maxImageBytes } from "#assistant/domain/image-limits.ts";
import { ImagePromptSchema } from "#assistant/domain/image-prompt.ts";
import {
  ProviderAddressSchema,
  ProviderModelSchema,
} from "#assistant/domain/image-provider.ts";
import { openAiCompatibleOwnImageModel } from "#assistant/infrastructure/openai-compatible-own-image-model.ts";
import { OutboundGuard } from "#shared/infrastructure/platforms/outbound-guard.ts";
import { OpenOutboundGuard } from "#test/channels/support.ts";

// A workspace's own provider against a fake on loopback, reached through
// a guard that lets loopback through; one test keeps the real guard, which
// refuses it. Nothing here calls a real provider.

// Markers that would show if the prompt or the key reached a log or a
// trace.
const inPrompt = "synthetic-prompt-marker-41c9";
const syntheticKey = "synthetic-workspace-image-key";

const prompt = ImagePromptSchema.make(
  `A harbour at night, in ink. ${inPrompt}`
);

const pngBytes = Uint8Array.from(
  { length: 2048 },
  (_, index) =>
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][index] ?? index % 251
);

type Answer = (response: ServerResponse, origin: string) => void;

interface Received {
  readonly headers: IncomingHttpHeaders;
  readonly url: string;
}

const decodeAddress = Schema.decodeUnknownSync(
  Schema.Struct({ port: Schema.Number })
);

// A provider answering each path as `answers` says, recording what it was
// sent; closed with the scope.
const provider = (answers: Readonly<Record<string, Answer>>) =>
  Effect.acquireRelease(
    Effect.promise(async () => {
      const received: Received[] = [];

      const server = createServer((request, response) => {
        request.resume();
        request.on("end", () => {
          received.push({ headers: request.headers, url: request.url ?? "" });

          const answer = answers[request.url ?? ""];

          if (answer === undefined) {
            response.writeHead(418).end();
          } else {
            answer(
              response,
              `http://127.0.0.1:${decodeAddress(server.address()).port}`
            );
          }
        });
      });

      server.listen(0, "127.0.0.1");
      await once(server, "listening");

      const origin = `http://127.0.0.1:${decodeAddress(server.address()).port}`;

      return { origin, received, server, url: `${origin}/v1` };
    }),
    ({ server }) =>
      Effect.promise(async () => {
        server.closeAllConnections();
        server.close();
        await once(server, "close");
      })
  );

const json =
  (status: number, value: typeof Schema.Json.Type): Answer =>
  (response) => {
    response
      .writeHead(status, { "content-type": "application/json" })
      .end(JSON.stringify(value));
  };

const base64Image = (bytes: Uint8Array) =>
  json(200, { created: 1, data: [{ b64_json: Base64.encode(bytes) }] });

const endpointAt = (baseUrl: string): OwnImageEndpoint => ({
  apiKey: Redacted.make(syntheticKey),
  baseUrl: ProviderAddressSchema.make(baseUrl),
  model: ProviderModelSchema.make("synthetic-image-model"),
});

const modelWith = ({
  guard = OpenOutboundGuard,
  timeout = "5 seconds",
}: {
  readonly guard?: Layer.Layer<OutboundGuard>;
  readonly timeout?: Duration.Input;
} = {}) =>
  openAiCompatibleOwnImageModel({ timeout }).pipe(
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

// Asks the workspace's provider at `baseUrl` for an image, and returns
// what came back, what the logs said and what the spans recorded.
const generate = (
  baseUrl: string,
  layer: Layer.Layer<OwnImageModel> = modelWith()
) =>
  Effect.gen(function* generating() {
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

    const outcome = yield* OwnImageModel.use((model) =>
      model.generate(endpointAt(baseUrl), { aspect: "square", prompt })
    ).pipe(
      Effect.exit,
      Effect.withSpan("test.generate"),
      Effect.withTracer(tracer),
      Effect.provide(Layer.merge(layer, logs))
    );

    return { lines, outcome, spans: spans.map(spanText) };
  });

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
          error._tag === "ImageProviderRefused"
            ? `refused ${error.status ?? "null"}`
            : (error.reason ?? error._tag),
      })
    : "success";

// Nothing of the prompt, the key or the provider's address in what was
// logged or traced.
const assertQuiet = (
  { lines, spans }: { readonly lines: string[]; readonly spans: string[] },
  origin: string
) => {
  for (const text of [...lines, ...spans]) {
    assert.notInclude(text, inPrompt);
    assert.notInclude(text, syntheticKey);
    assert.notInclude(text, new URL(origin).host);
  }
};

describe("a workspace's own image provider", () => {
  it.live("sends the workspace's key, and reads a base64 answer", () =>
    Effect.gen(function* base64() {
      const host = yield* provider({
        "/v1/images/generations": base64Image(pngBytes),
      });

      const made = yield* generate(host.url);

      assert.deepStrictEqual(
        Exit.isSuccess(made.outcome) ? made.outcome.value.bytes : null,
        pngBytes
      );
      assert.strictEqual(
        host.received[0]?.headers.authorization,
        `Bearer ${syntheticKey}`
      );
      assert.isUndefined(host.received[0]?.headers["traceparent"]);
      assertQuiet(made, host.origin);
    })
  );

  it.live("fetches a url answer through the guard", () =>
    Effect.gen(function* url() {
      const host = yield* provider({
        "/files/made.png": (response) => {
          response
            .writeHead(200, { "content-type": "image/png" })
            .end(pngBytes);
        },
        "/v1/images/generations": (response, origin) => {
          json(200, { data: [{ url: `${origin}/files/made.png` }] })(
            response,
            origin
          );
        },
      });

      const made = yield* generate(host.url);

      assert.deepStrictEqual(
        Exit.isSuccess(made.outcome) ? made.outcome.value.bytes : null,
        pngBytes
      );
    })
  );

  it.live.each([
    {
      answer: json(401, { error: `Bad key ${syntheticKey}` }),
      says: "refused 401",
    },
    { answer: json(402, { error: "Pay" }), says: "refused 402" },
    { answer: json(403, { error: "No" }), says: "refused 403" },
    { answer: json(404, { error: "No model" }), says: "refused 404" },
    { answer: json(429, { error: "Slow down" }), says: "unreachable" },
    { answer: json(503, { error: "Down" }), says: "unreachable" },
    {
      answer: json(400, { error: `Rejected: ${inPrompt}` }),
      says: "refused",
    },
    { answer: json(200, { data: [] }), says: "unusableAnswer" },
  ])(
    "says $says, keeping the prompt, the key and the host out of logs",
    ({ answer, says }) =>
      Effect.gen(function* statuses() {
        const host = yield* provider({ "/v1/images/generations": answer });

        const made = yield* generate(host.url);

        assert.strictEqual(failureOf(made.outcome), says);
        assertQuiet(made, host.origin);
      })
  );

  it.live("tries again after a refusal: it keeps no state", () =>
    Effect.gen(function* again() {
      const host = yield* provider({
        "/v1/images/generations": json(401, { error: "No" }),
        "/v2/images/generations": base64Image(pngBytes),
      });

      const layer = modelWith();

      yield* Effect.gen(function* twice() {
        const model = yield* OwnImageModel;

        const refused = yield* model
          .generate(endpointAt(host.url), { aspect: "square", prompt })
          .pipe(Effect.flip);

        assert.strictEqual(refused._tag, "ImageProviderRefused");

        const made = yield* model.generate(
          endpointAt(host.url.replace("/v1", "/v2")),
          { aspect: "square", prompt }
        );

        assert.deepStrictEqual(made.bytes, pngBytes);
      }).pipe(Effect.provide(layer));
    })
  );

  it.live("follows no redirect", () =>
    Effect.gen(function* redirect() {
      const host = yield* provider({
        "/elsewhere/images/generations": base64Image(pngBytes),
        "/v1/images/generations": (response, origin) => {
          response
            .writeHead(307, {
              location: `${origin}/elsewhere/images/generations`,
            })
            .end();
        },
      });

      const made = yield* generate(host.url);

      assert.strictEqual(failureOf(made.outcome), "refused");
      assert.deepStrictEqual(
        host.received.map(({ url }) => url),
        ["/v1/images/generations"]
      );
    })
  );

  it.live("stops reading an answer past its bound", () =>
    Effect.gen(function* bounded() {
      const host = yield* provider({
        "/v1/images/generations": base64Image(
          new Uint8Array(maxImageBytes + 1)
        ),
        "/v2/images/generations": (response) => {
          response.writeHead(200, { "content-type": "application/json" });
          // Far more than any answer may hold, sent until the client
          // stops reading.
          const chunk = "x".repeat(1024 * 1024);

          const write = () => {
            while (response.write(chunk)) {
              if (response.writableLength > 64 * 1024 * 1024) {
                response.end();

                return;
              }
            }

            response.once("drain", write);
          };

          response.on("close", () => {
            response.removeAllListeners("drain");
          });
          write();
        },
      });

      const tooLarge = yield* generate(host.url);
      const endless = yield* generate(host.url.replace("/v1", "/v2"));

      assert.deepStrictEqual(
        [tooLarge, endless].map(({ outcome }) => failureOf(outcome)),
        ["unusableAnswer", "unusableAnswer"]
      );
    })
  );

  it.live("times out on a provider that never answers", () =>
    Effect.gen(function* silent() {
      const host = yield* provider({
        "/v1/images/generations": () => {
          // Never answered.
        },
      });

      const made = yield* generate(
        host.url,
        modelWith({ timeout: "300 millis" })
      );

      assert.strictEqual(failureOf(made.outcome), "timedOut");
    })
  );

  it.live("is unreachable when nothing listens", () =>
    Effect.gen(function* closed() {
      const made = yield* generate("http://127.0.0.1:9/v1");

      assert.strictEqual(failureOf(made.outcome), "unreachable");
    })
  );

  it.live(
    "refuses a loopback or private address with the real guard, before any request leaves",
    () =>
      Effect.gen(function* guarded() {
        const host = yield* provider({
          "/v1/images/generations": base64Image(pngBytes),
        });

        // Names resolve as an attacker would set them up: inside.
        const realGuard = OutboundGuard.layer.pipe(
          Layer.provide(
            Dns.layerStatic({
              hosts: { "images.internal.example": ["10.0.0.8"] },
            })
          ),
          Layer.orDie
        );

        const outcomes = yield* Effect.forEach(
          [
            host.url,
            "https://127.0.0.1/v1",
            "https://10.0.0.8/v1",
            "https://[::1]/v1",
            "https://images.internal.example/v1",
          ],
          (baseUrl) =>
            generate(baseUrl, modelWith({ guard: realGuard })).pipe(
              Effect.map(({ outcome }) => failureOf(outcome))
            )
        );

        assert.deepStrictEqual(outcomes, [
          "refused null",
          "refused null",
          "refused null",
          "refused null",
          "refused null",
        ]);
        assert.lengthOf(host.received, 0);
      })
  );
});
