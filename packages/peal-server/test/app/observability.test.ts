import { assert, describe, it } from "@effect/vitest";
import { ConfigProvider, Effect, Layer } from "effect";
import { HttpClient, HttpClientResponse } from "effect/http";

import { OtlpExport } from "#app/observability.ts";

interface Export {
  readonly body: string;
  readonly path: string;
}

const decoder = new TextDecoder();

// A collector that accepts every export and records where it went.
const recordingCollector = (exports: Export[]) =>
  Layer.succeed(
    HttpClient.HttpClient,
    HttpClient.make((request, url) =>
      Effect.sync(() => {
        exports.push({
          body:
            request.body._tag === "Uint8Array"
              ? decoder.decode(request.body.body)
              : "",
          path: url.pathname,
        });

        return HttpClientResponse.fromWeb(
          request,
          new Response(null, { status: 200 })
        );
      })
    )
  );

// Logs once inside a span with only `env` set, then shuts the exporters down,
// which flushes what they hold, and returns what reached the collector.
const exportsWith = (env: Record<string, string>) =>
  Effect.gen(function* recordExports() {
    const exports: Export[] = [];

    yield* Effect.logInfo("probe").pipe(
      Effect.withSpan("probe"),
      Effect.provide(
        OtlpExport.pipe(
          Layer.provide(recordingCollector(exports)),
          Layer.provide(ConfigProvider.layer(ConfigProvider.fromEnv({ env })))
        )
      )
    );

    return exports;
  });

const pathsOf = (exports: readonly Export[]) =>
  [...new Set(exports.map((sent) => sent.path))].toSorted();

const traceBody = (exports: readonly Export[]) =>
  exports.find((sent) => sent.path === "/v1/traces")?.body ?? "";

const endpoint = "http://127.0.0.1:14318";

describe("OTLP export", () => {
  it.live("exports every signal once the endpoint alone is set", () =>
    Effect.gen(function* endpointAlone() {
      const exports = yield* exportsWith({
        OTEL_EXPORTER_OTLP_ENDPOINT: endpoint,
      });

      assert.deepStrictEqual(pathsOf(exports), [
        "/v1/logs",
        "/v1/metrics",
        "/v1/traces",
      ]);
    })
  );

  it.live("sends nothing without an endpoint", () =>
    Effect.gen(function* noEndpoint() {
      assert.deepStrictEqual(yield* exportsWith({}), []);
    })
  );

  it.live("keeps a signal set to none off", () =>
    Effect.gen(function* signalOff() {
      const exports = yield* exportsWith({
        OTEL_EXPORTER_OTLP_ENDPOINT: endpoint,
        OTEL_TRACES_EXPORTER: "none",
      });

      assert.deepStrictEqual(pathsOf(exports), ["/v1/logs", "/v1/metrics"]);
    })
  );

  it.live("names the service peal-server unless OTEL_SERVICE_NAME is set", () =>
    Effect.gen(function* serviceName() {
      const byDefault = yield* exportsWith({
        OTEL_EXPORTER_OTLP_ENDPOINT: endpoint,
      });

      const renamed = yield* exportsWith({
        OTEL_EXPORTER_OTLP_ENDPOINT: endpoint,
        OTEL_SERVICE_NAME: "peal-sandbox",
      });

      assert.include(traceBody(byDefault), '"stringValue":"peal-server"');
      assert.include(traceBody(renamed), '"stringValue":"peal-sandbox"');
      assert.notInclude(traceBody(renamed), '"stringValue":"peal-server"');
    })
  );
});
