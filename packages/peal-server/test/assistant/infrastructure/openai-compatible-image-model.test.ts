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

import { ImageModel } from "#assistant/application/ports/image-model.ts";
import type { ImageRequest } from "#assistant/application/ports/image-model.ts";
import type { ImageAspect } from "#assistant/domain/image-aspect.ts";
import { maxImageBytes } from "#assistant/domain/image-limits.ts";
import { ImagePromptSchema } from "#assistant/domain/image-prompt.ts";
import { openAiCompatibleImageModel } from "#assistant/infrastructure/openai-compatible-image-model.ts";
import { maxByteSize } from "#media/domain/media-format.ts";
import { OutboundGuard } from "#shared/infrastructure/platforms/outbound-guard.ts";
import { OutboundRequestRefused } from "#shared/infrastructure/platforms/outbound-request-refused.ts";
import { OpenOutboundGuard } from "#test/channels/support.ts";

// The adapter against a provider on loopback: it never calls a real one.

// A marker that would show if the prompt reached a log or a trace.
const inPrompt = "synthetic-prompt-marker-7f3a";

const prompt = ImagePromptSchema.make(
  `A lighthouse at dawn, in watercolour. ${inPrompt}`
);

// Bytes that start as a PNG does; the adapter does not read them.
const pngBytes = Uint8Array.from(
  { length: 2048 },
  (_, index) =>
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][index] ?? index % 251
);

type Answer = (response: ServerResponse, origin: string) => void;

interface Received {
  readonly body: string;
  readonly headers: IncomingHttpHeaders;
  readonly method: string;
  readonly url: string;
}

const decodeAddress = Schema.decodeUnknownSync(
  Schema.Struct({ port: Schema.Number })
);

const decodeBody = Schema.decodeUnknownSync(
  Schema.fromJsonString(
    Schema.Struct({
      model: Schema.String,
      n: Schema.Number,
      prompt: Schema.String,
      size: Schema.String,
    })
  )
);

// A provider answering each path as `answers` says, recording what it was
// sent; closed with the scope.
const provider = (answers: Readonly<Record<string, Answer>>) =>
  Effect.acquireRelease(
    Effect.promise(async () => {
      const received: Received[] = [];

      const server = createServer((request, response) => {
        const chunks: Buffer[] = [];

        request.on("data", (chunk: Buffer) => {
          chunks.push(chunk);
        });
        request.on("end", () => {
          received.push({
            body: Buffer.concat(chunks).toString("utf-8"),
            headers: request.headers,
            method: request.method ?? "",
            url: request.url ?? "",
          });

          const answer = answers[request.url ?? ""];

          if (answer === undefined) {
            response.writeHead(404).end();
          } else {
            answer(
              response,
              `http://127.0.0.1:${decodeAddress(server.address()).port}`
            );
          }
        });
      });

      const port = () => decodeAddress(server.address()).port;

      server.listen(0, "127.0.0.1");
      await once(server, "listening");

      return { received, server, url: `http://127.0.0.1:${port()}/v1` };
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

const raw =
  (status: number, body: string): Answer =>
  (response) => {
    response.writeHead(status, { "content-type": "text/plain" }).end(body);
  };

const base64Image = (bytes: Uint8Array) =>
  json(200, { created: 1, data: [{ b64_json: Base64.encode(bytes) }] });

// A guard that refuses every address, as it does loopback ones in
// production.
const ClosedOutboundGuard = Layer.succeed(
  OutboundGuard,
  OutboundGuard.of({
    check: () =>
      Effect.fail(
        new OutboundRequestRefused({ host: "127.0.0.1", reason: "notPublic" })
      ),
  })
);

const modelAt = (
  baseUrl: string,
  {
    apiKey = Option.none(),
    guard = OpenOutboundGuard,
    timeout = "5 seconds",
  }: {
    readonly apiKey?: Option.Option<Redacted.Redacted>;
    readonly guard?: Layer.Layer<OutboundGuard>;
    readonly timeout?: Duration.Input;
  } = {}
) =>
  openAiCompatibleImageModel(
    { apiKey, baseUrl, model: "synthetic-image-model" },
    { timeout }
  ).pipe(Layer.provide(guard), Layer.provide(FetchHttpClient.layer));

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

// Asks the model for an image, and returns what came back, what the logs
// said and what the spans recorded.
const squareImage: ImageRequest = { aspect: "square", prompt };

const generate = (
  layer: Layer.Layer<ImageModel>,
  request: ImageRequest = squareImage
) =>
  Effect.gen(function* generating() {
    const lines: string[] = [];
    const levels: string[] = [];
    const spans: Tracer.NativeSpan[] = [];

    const tracer = Tracer.make({
      span: (options) => {
        const span = new Tracer.NativeSpan(options);

        spans.push(span);

        return span;
      },
    });

    const logs = Logger.layer([
      Logger.make(({ cause, logLevel, message }) => {
        levels.push(logLevel);
        lines.push(JSON.stringify(message), Cause.pretty(cause));
      }),
    ]);

    const outcome = yield* ImageModel.use((model) =>
      model.generate(request)
    ).pipe(
      Effect.exit,
      Effect.withSpan("test.generate"),
      Effect.withTracer(tracer),
      Effect.provide(Layer.merge(layer, logs))
    );

    return { levels, lines, outcome, spans: spans.map(spanText) };
  });

const failureOf = <A>(
  outcome: Exit.Exit<A, { readonly _tag: string; readonly reason?: string }>
) =>
  Exit.isFailure(outcome)
    ? Option.match(Cause.findErrorOption(outcome.cause), {
        onNone: () => "defect",
        onSome: (error) => error.reason ?? error._tag,
      })
    : "success";

describe("the image model on an OpenAI-compatible endpoint", () => {
  it.live.each<{ readonly aspect: ImageAspect; readonly size: string }>([
    { aspect: "square", size: "1024x1024" },
    { aspect: "landscape", size: "1536x1024" },
    { aspect: "portrait", size: "1024x1536" },
  ])("makes a $aspect image from a base64 answer", ({ aspect, size }) =>
    Effect.gen(function* base64() {
      const host = yield* provider({
        "/v1/images/generations": base64Image(pngBytes),
      });

      const { outcome } = yield* generate(
        modelAt(host.url, {
          apiKey: Option.some(Redacted.make("sk_test_synthetic_image_key")),
        }),
        { aspect, prompt }
      );

      assert.deepStrictEqual(
        Exit.isSuccess(outcome) ? outcome.value.bytes : null,
        pngBytes
      );

      const [sent] = host.received;

      assert.strictEqual(sent?.method, "POST");
      assert.strictEqual(
        sent?.headers.authorization,
        "Bearer sk_test_synthetic_image_key"
      );
      assert.isUndefined(sent?.headers["traceparent"]);
      assert.deepStrictEqual(decodeBody(sent?.body), {
        model: "synthetic-image-model",
        n: 1,
        prompt,
        size,
      });
      assert.notInclude(sent?.body ?? "", "response_format");
    })
  );

  it.live("sends no key to an endpoint that takes none", () =>
    Effect.gen(function* keyless() {
      const host = yield* provider({
        "/v1/images/generations": base64Image(pngBytes),
      });

      yield* generate(modelAt(host.url));

      assert.isUndefined(host.received[0]?.headers.authorization);
    })
  );

  it.live("fetches a url answer through the outbound guard", () =>
    Effect.gen(function* url() {
      const host = yield* provider({
        "/files/made.png": (response) => {
          response
            .writeHead(200, { "content-type": "image/png" })
            .end(pngBytes);
        },
        "/v1/images/generations": (response, origin) => {
          json(200, {
            created: 1,
            data: [{ url: `${origin}/files/made.png` }],
          })(response, origin);
        },
      });

      const fetched = yield* generate(modelAt(host.url));

      assert.deepStrictEqual(
        Exit.isSuccess(fetched.outcome) ? fetched.outcome.value.bytes : null,
        pngBytes
      );

      // The provider's host is the operator's; the address it answers is
      // not, and a guard that refuses it leaves no image.
      const guarded = yield* generate(
        modelAt(host.url, { guard: ClosedOutboundGuard })
      );

      assert.strictEqual(failureOf(guarded.outcome), "unusableAnswer");
    })
  );

  it.live.each([
    {
      answer: json(429, { error: { message: "slow down" } }),
      reason: "unreachable",
    },
    {
      answer: json(500, { error: { message: "down" } }),
      reason: "unreachable",
    },
    {
      answer: json(400, { error: { message: `Rejected: ${inPrompt}` } }),
      reason: "refused",
    },
    { answer: raw(200, "Here is your image!"), reason: "unusableAnswer" },
    { answer: json(200, { created: 1, data: [] }), reason: "unusableAnswer" },
    {
      answer: json(200, { created: 1, data: [{ b64_json: "not base64!" }] }),
      reason: "unusableAnswer",
    },
  ])(
    "fails as $reason, keeping the prompt out of logs and traces",
    ({ answer, reason }) =>
      Effect.gen(function* failing() {
        const host = yield* provider({ "/v1/images/generations": answer });

        const { lines, outcome, spans } = yield* generate(modelAt(host.url));

        assert.strictEqual(failureOf(outcome), reason);

        for (const text of [...lines, ...spans]) {
          assert.notInclude(text, inPrompt);
        }
      })
  );

  it.live.each([401, 402, 403, 404])(
    "says images are off when the provider refuses the server's settings (%d)",
    (status) =>
      Effect.gen(function* credentials() {
        const host = yield* provider({
          "/v1/images/generations": json(status, {
            error: { message: `Invalid key for ${inPrompt}` },
          }),
        });

        const { levels, lines, outcome } = yield* generate(modelAt(host.url));

        assert.strictEqual(failureOf(outcome), "AssistantUnavailable");
        // For the operator, by status alone.
        assert.include(levels, "Error");
        assert.isTrue(lines.some((line) => line.includes(String(status))));

        for (const line of lines) {
          assert.notInclude(line, inPrompt);
          assert.notInclude(line, "Invalid key");
        }
      })
  );

  it.live("stays off once the provider refused the server's settings", () =>
    Effect.gen(function* sticky() {
      const host = yield* provider({
        "/v1/images/generations": json(401, { error: { message: "No." } }),
      });

      yield* Effect.gen(function* twice() {
        const model = yield* ImageModel;

        assert.isTrue(yield* model.available);

        const first = yield* model.generate(squareImage).pipe(Effect.flip);
        const second = yield* model.generate(squareImage).pipe(Effect.flip);

        assert.deepStrictEqual(
          [first._tag, second._tag],
          ["AssistantUnavailable", "AssistantUnavailable"]
        );
        assert.isFalse(yield* model.available);
        // The second never reached the provider.
        assert.lengthOf(host.received, 1);
      }).pipe(Effect.provide(modelAt(host.url)));
    })
  );

  it.live(
    "reads an answer that also says null for the field it leaves out",
    () =>
      Effect.gen(function* nulls() {
        const host = yield* provider({
          "/files/made.png": (response) => {
            response
              .writeHead(200, { "content-type": "image/png" })
              .end(pngBytes);
          },
          "/v1/images/generations": json(200, {
            created: 1,
            data: [{ b64_json: Base64.encode(pngBytes), url: null }],
          }),
          "/v2/images/generations": (response, origin) => {
            json(200, {
              created: 1,
              data: [{ b64_json: null, url: `${origin}/files/made.png` }],
            })(response, origin);
          },
        });

        const outcomes = yield* Effect.all([
          generate(modelAt(host.url)),
          generate(modelAt(host.url.replace("/v1", "/v2"))),
        ]);

        for (const { outcome } of outcomes) {
          assert.deepStrictEqual(
            Exit.isSuccess(outcome) ? outcome.value.bytes : null,
            pngBytes
          );
        }
      })
  );

  it.live("finds an address that is not absolute unusable", () =>
    Effect.gen(function* relative() {
      const host = yield* provider({
        "/v1/images/generations": json(200, {
          created: 1,
          data: [{ url: "/files/made.png" }],
        }),
      });

      const { outcome } = yield* generate(modelAt(host.url));

      assert.strictEqual(failureOf(outcome), "unusableAnswer");
    })
  );

  it.live("times out on a provider that never answers", () =>
    Effect.gen(function* silent() {
      const host = yield* provider({
        "/v1/images/generations": () => {
          // Never answered.
        },
      });

      const { outcome } = yield* generate(
        modelAt(host.url, { timeout: "300 millis" })
      );

      assert.strictEqual(failureOf(outcome), "timedOut");
    })
  );

  it.live("is unreachable when nothing listens", () =>
    Effect.gen(function* closed() {
      const { outcome } = yield* generate(modelAt("http://127.0.0.1:9/v1"));

      assert.strictEqual(failureOf(outcome), "unreachable");
    })
  );

  it.live("reads no more than its bounds", () =>
    Effect.gen(function* bounded() {
      const host = yield* provider({
        "/files/huge.png": (response) => {
          response
            .writeHead(200, { "content-type": "image/png" })
            .end(new Uint8Array(maxImageBytes + 1));
        },
        // An answer larger than any image's, base64 and JSON included.
        "/v1/images/generations": raw(200, "x".repeat(25 * 1024 * 1024)),
        "/v2/images/generations": (response, origin) => {
          json(200, {
            created: 1,
            data: [{ url: `${origin}/files/huge.png` }],
          })(response, origin);
        },
        "/v3/images/generations": base64Image(
          new Uint8Array(maxImageBytes + 1)
        ),
      });

      const tooLong = yield* generate(modelAt(host.url));

      const tooLarge = yield* generate(modelAt(host.url.replace("/v1", "/v2")));

      const decodedTooLarge = yield* generate(
        modelAt(host.url.replace("/v1", "/v3"))
      );

      assert.deepStrictEqual(
        [tooLong, tooLarge, decodedTooLarge].map(({ outcome }) =>
          failureOf(outcome)
        ),
        ["unusableAnswer", "unusableAnswer", "unusableAnswer"]
      );
      assert.strictEqual(maxImageBytes, maxByteSize.image);
    })
  );
});
