// What reaches an OpenTelemetry collector when the web app reports an error:
// the log, with its attributes, and the counter Prometheus reads as
// acme_client_errors_total, which the alert and the dashboard query.
import { assert, describe, it } from "@effect/vitest";
import { Api } from "acme-contract";
import { ConfigProvider, Effect, Layer } from "effect";
import { HttpClient, HttpClientResponse, HttpServer } from "effect/http";
import { HttpApiTest } from "effect/http-api";

import { ClientErrorsHandlers } from "#app/client-errors/handlers.ts";
import { OtlpExport } from "#app/observability.ts";
import { anonymousSecurityTest } from "#workspace/api/security.ts";

interface Export {
  readonly body: string;
  readonly path: string;
}

const decoder = new TextDecoder();

// A collector that accepts every export and records it.
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

const bodyOf = (exports: readonly Export[], path: string) =>
  exports.flatMap((sent) => (sent.path === path ? [sent.body] : [])).join("\n");

describe("an error report's telemetry", () => {
  it.live("reaches the collector as an error log and a counter", () =>
    Effect.gen(function* exported() {
      const exports: Export[] = [];

      yield* Effect.gen(function* report() {
        const client = yield* HttpApiTest.groups(Api, ["clientErrors"]);

        yield* client.reportClientError({
          payload: {
            digest: null,
            kind: "unhandledRejection",
            message: "Synthetic rejection",
            path: "/app",
            release: "2026.11.0",
            route: null,
            stack: null,
            userAgent: null,
          },
        });
      }).pipe(
        Effect.provide(
          Layer.mergeAll(
            ClientErrorsHandlers.pipe(
              Layer.provideMerge(anonymousSecurityTest)
            ),
            HttpServer.layerServices
          )
        ),
        Effect.provide(
          OtlpExport.pipe(
            Layer.provide(recordingCollector(exports)),
            Layer.provide(
              ConfigProvider.layer(
                ConfigProvider.fromEnv({
                  env: {
                    OTEL_EXPORTER_OTLP_ENDPOINT: "http://127.0.0.1:14318",
                  },
                })
              )
            )
          )
        )
      );

      const logs = bodyOf(exports, "/v1/logs");
      const metrics = bodyOf(exports, "/v1/metrics");

      assert.include(
        logs,
        '"key":"event.name","value":{"stringValue":"acme.client_error"}'
      );
      // Severity 17 and up, which Loki and the alerts read as errors.
      assert.include(logs, '"severityNumber":17');
      assert.include(logs, '"severityText":"Error"');
      assert.include(metrics, '"name":"acme.client_errors"');
      assert.include(metrics, '"isMonotonic":true');
    })
  );
});
