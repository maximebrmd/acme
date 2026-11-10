import { assert, describe, it } from "@effect/vitest";
import {
  ConfigProvider,
  Duration,
  Effect,
  Fiber,
  Layer,
  Schema,
  Tracer,
} from "effect";
import { HttpClient, HttpClientResponse } from "effect/http";
import { TestClock } from "effect/testing";

import { OtlpExport } from "#app/observability.ts";
import {
  alwaysSampledSpans,
  defaultProductionRatio,
  slowSpan,
} from "#app/trace-sampling.ts";

// The spans of an OTLP/JSON traces export, as far as these tests read them.
const ExportedSpans = Schema.fromJsonString(
  Schema.Struct({
    resourceSpans: Schema.Array(
      Schema.Struct({
        scopeSpans: Schema.Array(
          Schema.Struct({
            spans: Schema.Array(
              Schema.Struct({
                name: Schema.String,
                parentSpanId: Schema.optionalKey(Schema.String),
                spanId: Schema.String,
                traceId: Schema.String,
              })
            ),
          })
        ),
      })
    ),
  })
);

type Exported =
  (typeof ExportedSpans.Type)["resourceSpans"][number]["scopeSpans"][number]["spans"][number];

const decodeSpans = Schema.decodeUnknownSync(ExportedSpans);

const decoder = new TextDecoder();

// A collector that accepts every export and keeps the spans it was sent.
const recordingCollector = (spans: Exported[]) =>
  Layer.succeed(
    HttpClient.HttpClient,
    HttpClient.make((request, url) =>
      Effect.sync(() => {
        if (
          url.pathname === "/v1/traces" &&
          request.body._tag === "Uint8Array"
        ) {
          for (const resource of decodeSpans(decoder.decode(request.body.body))
            .resourceSpans) {
            for (const scope of resource.scopeSpans) {
              spans.push(...scope.spans);
            }
          }
        }

        return HttpClientResponse.fromWeb(
          request,
          new Response(null, { status: 200 })
        );
      })
    )
  );

const endpoint = "http://127.0.0.1:14318";

// Runs `traced` with the exporters built from `env` alone, shuts them
// down, which flushes what they hold, and answers the spans exported.
const spansWith = <A, E>(
  env: Record<string, string>,
  traced: Effect.Effect<A, E>
) =>
  Effect.gen(function* recordSpans() {
    const spans: Exported[] = [];

    yield* traced.pipe(
      Effect.exit,
      Effect.provide(
        OtlpExport.pipe(
          Layer.provide(recordingCollector(spans)),
          Layer.provide(
            ConfigProvider.layer(
              ConfigProvider.fromEnv({
                env: {
                  OTEL_EXPORTER_OTLP_ENDPOINT: endpoint,
                  OTEL_LOGS_EXPORTER: "none",
                  OTEL_METRICS_EXPORTER: "none",
                  ...env,
                },
              })
            )
          )
        )
      )
    );

    return spans;
  });

const namesOf = (spans: readonly Exported[]) =>
  spans.map(({ name }) => name).toSorted();

// `count` requests, each a root span with two spans under it.
const requests = (count: number) =>
  Effect.forEach(
    Array.from({ length: count }, (_, index) => index),
    () =>
      Effect.void.pipe(
        Effect.withSpan("child"),
        Effect.withSpan("parent"),
        Effect.withSpan("request")
      ),
    { discard: true }
  );

const none = {
  OTEL_TRACES_SAMPLER: "traceidratio",
  OTEL_TRACES_SAMPLER_ARG: "0",
};

const remote = (sampled: boolean) =>
  Tracer.externalSpan({
    sampled,
    spanId: "00f067aa0ba902b7",
    traceId: "4bf92f3577b34da6a3ce929d0e0e4736",
  });

// A request handled for a caller that sampled its trace, or did not.
const under = (parent: Tracer.ExternalSpan) =>
  Effect.void.pipe(
    Effect.withSpan("inner"),
    Effect.withSpan("handled", { parent })
  );

describe("trace sampling", () => {
  it.live("samples every trace outside production", () =>
    Effect.gen(function* everywhereElse() {
      const spans = yield* spansWith({}, requests(50));

      assert.lengthOf(spans, 150);
    })
  );

  it.live("samples one trace in ten in production, whole or not at all", () =>
    Effect.gen(function* production() {
      const spans = yield* spansWith(
        { NODE_ENV: "production" },
        requests(3000)
      );

      const roots = spans.filter(({ name }) => name === "request");

      // 300 expected of 3,000; six standard deviations either way.
      assert.strictEqual(defaultProductionRatio, 0.1);
      assert.isAbove(roots.length, 200);
      assert.isBelow(roots.length, 400);

      // A trace is kept with every span under it, or dropped with them.
      assert.lengthOf(spans, roots.length * 3);

      const exported = new Set(spans.map(({ spanId }) => spanId));

      assert.isTrue(
        spans.every(
          ({ name, parentSpanId }) =>
            name === "request" ||
            (parentSpanId !== undefined && exported.has(parentSpanId))
        )
      );
    })
  );

  it.live("takes the ratio OTEL_TRACES_SAMPLER_ARG gives", () =>
    Effect.gen(function* ratio() {
      const half = yield* spansWith(
        {
          OTEL_TRACES_SAMPLER: "parentbased_traceidratio",
          OTEL_TRACES_SAMPLER_ARG: "0.5",
        },
        requests(2000)
      );

      const all = yield* spansWith(
        { NODE_ENV: "production", OTEL_TRACES_SAMPLER_ARG: "1" },
        requests(20)
      );

      const roots = half.filter(({ name }) => name === "request").length;

      assert.isAbove(roots, 850);
      assert.isBelow(roots, 1150);
      assert.lengthOf(all, 60);
    })
  );

  it.live("samples nothing when the sampler is always_off", () =>
    Effect.gen(function* off() {
      const spans = yield* spansWith(
        { OTEL_TRACES_SAMPLER: "always_off" },
        Effect.all([
          requests(20),
          Effect.void.pipe(Effect.withSpan("Publishing.publishAttempt")),
          Effect.die("a bug").pipe(Effect.withSpan("failing")),
        ])
      );

      assert.deepStrictEqual(spans, []);
    })
  );

  it.live(
    "follows the caller's decision when the sampler is parent-based",
    () =>
      Effect.gen(function* parentBased() {
        const env = {
          OTEL_TRACES_SAMPLER: "parentbased_traceidratio",
          OTEL_TRACES_SAMPLER_ARG: "0",
        };

        assert.deepStrictEqual(
          namesOf(yield* spansWith(env, under(remote(true)))),
          ["handled", "inner"]
        );
        assert.deepStrictEqual(yield* spansWith(env, under(remote(false))), []);

        // Not parent-based: the ratio decides, whatever the caller sampled.
        assert.deepStrictEqual(yield* spansWith(none, under(remote(true))), []);
        assert.deepStrictEqual(
          namesOf(
            yield* spansWith(
              { OTEL_TRACES_SAMPLER: "always_on" },
              under(remote(false))
            )
          ),
          ["handled", "inner"]
        );
      })
  );

  it.live("tells the services it calls what it decided, kept span or not", () =>
    Effect.gen(function* propagates() {
      const decisions: boolean[] = [];

      yield* spansWith(
        none,
        Effect.currentSpan.pipe(
          Effect.tap((span) =>
            Effect.sync(() => {
              decisions.push(span.sampled);
            })
          ),
          Effect.andThen(Effect.die("a bug")),
          Effect.withSpan("unsampled")
        )
      );

      assert.deepStrictEqual(decisions, [false]);
    })
  );

  it.live("always traces a publishing attempt and what it calls", () =>
    Effect.gen(function* publishing() {
      assert.include(alwaysSampledSpans, "Publishing.publishAttempt");

      const spans = yield* spansWith(
        none,
        Effect.void.pipe(
          Effect.withSpan("platform call"),
          Effect.withSpan("Publishing.publishAttempt"),
          Effect.withSpan("workflow")
        )
      );

      // The job around it follows the ratio: only the attempt is kept.
      assert.deepStrictEqual(namesOf(spans), [
        "Publishing.publishAttempt",
        "platform call",
      ]);
    })
  );

  it.live(
    "keeps the spans that ended in a defect, up to their root, in a trace it did not sample",
    () =>
      Effect.gen(function* defects() {
        const spans = yield* spansWith(
          none,
          Effect.all([
            Effect.void.pipe(Effect.withSpan("fine")),
            // An expected failure, as a refusal the caller handles.
            Effect.fail("refused").pipe(
              Effect.withSpan("refused"),
              Effect.ignore
            ),
            Effect.die("a bug").pipe(Effect.withSpan("broken")),
          ]).pipe(Effect.withSpan("handler"), Effect.withSpan("request"))
        );

        assert.deepStrictEqual(namesOf(spans), [
          "broken",
          "handler",
          "request",
        ]);

        // One trace, each span under the next.
        assert.lengthOf(new Set(spans.map(({ traceId }) => traceId)), 1);

        const byName = new Map(spans.map((span) => [span.name, span]));

        assert.strictEqual(
          byName.get("broken")?.parentSpanId,
          byName.get("handler")?.spanId
        );
        assert.strictEqual(
          byName.get("handler")?.parentSpanId,
          byName.get("request")?.spanId
        );
      })
  );

  it.live(
    "keeps a request the server failed, in a trace it did not sample",
    () =>
      Effect.gen(function* serverErrors() {
        const spans = yield* spansWith(
          none,
          Effect.all(
            [
              Effect.fail("unavailable").pipe(
                Effect.withSpan("http.server POST", { kind: "server" })
              ),
              Effect.void.pipe(
                Effect.withSpan("http.server GET", { kind: "server" })
              ),
            ],
            { mode: "result" }
          )
        );

        assert.deepStrictEqual(namesOf(spans), ["http.server POST"]);
      })
  );

  it.effect(
    "keeps the spans that were slow, up to their root, in a trace it did not sample",
    () =>
      Effect.gen(function* slow() {
        const justUnder = Duration.subtract(slowSpan, Duration.millis(1));

        const spans = yield* spansWith(
          none,
          Effect.gen(function* working() {
            const quick = yield* Effect.sleep(justUnder).pipe(
              Effect.withSpan("quick"),
              Effect.withSpan("quick request"),
              Effect.forkChild
            );

            const stuck = yield* Effect.sleep(slowSpan).pipe(
              Effect.withSpan("stuck"),
              Effect.andThen(Effect.void.pipe(Effect.withSpan("after"))),
              Effect.withSpan("slow request"),
              Effect.forkChild
            );

            yield* TestClock.adjust(slowSpan);
            yield* Fiber.join(quick);
            yield* Fiber.join(stuck);
          })
        );

        assert.deepStrictEqual(namesOf(spans), ["slow request", "stuck"]);
      })
  );

  it.live("stops the server on a sampler or a ratio it does not know", () =>
    Effect.gen(function* malformed() {
      for (const env of [
        { OTEL_TRACES_SAMPLER: "sometimes" },
        { OTEL_TRACES_SAMPLER_ARG: "often" },
        { OTEL_TRACES_SAMPLER_ARG: "1.5" },
        { OTEL_TRACES_SAMPLER_ARG: "-0.1" },
      ]) {
        const built = yield* Layer.build(
          OtlpExport.pipe(
            Layer.provide(recordingCollector([])),
            Layer.provide(ConfigProvider.layer(ConfigProvider.fromEnv({ env })))
          )
        ).pipe(Effect.scoped, Effect.exit);

        assert.strictEqual(built._tag, "Failure");
      }
    })
  );
});
