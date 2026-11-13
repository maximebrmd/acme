// The alert rules query the server's metrics by the names Prometheus gives
// them. Those names come from what the server exports over OTLP (name, unit,
// kind) and from the collector's translation to Prometheus, which appends a
// unit suffix ("_seconds", "_ratio" for a gauge of unit "1") and "_total" to
// a monotonic sum. The server's metrics, declared as in src/, go through
// Effect's own OTLP export here, so a change in what it sends (as the unit of
// a unit-less metric) shows as a rule that queries a name nobody writes.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { assert, describe, it } from "@effect/vitest";
import { ConfigProvider, Effect, Layer, Metric, Schema } from "effect";
import { HttpClient, HttpClientResponse } from "effect/http";

import { OtlpExport } from "#app/observability.ts";

const sources = path.join(import.meta.dirname, "..", "..", "src");

const rules = readFileSync(
  path.join(
    import.meta.dirname,
    "..",
    "..",
    "..",
    "peal-docker",
    "config/production/grafana/alerting/rules.yaml"
  ),
  "utf-8"
);

// The host's gauges, which its scripts post (peal_backup, peal_disks):
// packages/peal-infra/ansible/tests tie them to the rules.
const postedByTheHost = /^peal_(?:backup|disks|host)(?:_|$)/u;

const queried = [
  ...new Set([...rules.matchAll(/\bpeal_\w+/gu)].map(([name]) => name)),
].filter((name) => !postedByTheHost.test(name));

interface Declared {
  readonly incremental: boolean;
  readonly kind: "counter" | "gauge";
  readonly name: string;
}

const filesIn = (folder: string): readonly string[] =>
  readdirSync(folder, { recursive: true, withFileTypes: true }).flatMap(
    (entry) =>
      entry.isFile() && entry.name.endsWith(".ts")
        ? [path.join(entry.parentPath, entry.name)]
        : []
  );

const declarations =
  /Metric\.(?<kind>counter|gauge)\(\s*"(?<name>[^"]+)",\s*\{(?<options>[^}]*)\}/gu;

const declared: readonly Declared[] = filesIn(sources).flatMap((file) =>
  [...readFileSync(file, "utf-8").matchAll(declarations)].map(({ groups }) => ({
    incremental: /incremental:\s*true/u.test(groups?.["options"] ?? ""),
    kind: groups?.["kind"] === "counter" ? "counter" : "gauge",
    name: groups?.["name"] ?? "",
  }))
);

const ExportedSchema = Schema.Struct({
  resourceMetrics: Schema.Array(
    Schema.Struct({
      scopeMetrics: Schema.Array(
        Schema.Struct({
          metrics: Schema.Array(
            Schema.Struct({
              gauge: Schema.optionalKey(Schema.Unknown),
              name: Schema.String,
              sum: Schema.optionalKey(
                Schema.Struct({ isMonotonic: Schema.Boolean })
              ),
              unit: Schema.optionalKey(Schema.String),
            })
          ),
        })
      ),
    })
  ),
});

const decodeExported = Schema.decodeUnknownSync(
  Schema.fromJsonString(ExportedSchema)
);

// The collector's units, as its Prometheus translator spells them.
const unitSuffixes = new Map([
  ["By", "bytes"],
  ["ms", "milliseconds"],
  ["ns", "nanoseconds"],
  ["s", "seconds"],
  ["us", "microseconds"],
]);

const prometheusName = (metric: {
  readonly gauge?: unknown;
  readonly name: string;
  readonly sum?: { readonly isMonotonic: boolean };
  readonly unit?: string;
}): string => {
  const unit = metric.unit ?? "";
  const ratio = unit === "1" && metric.sum === undefined ? "ratio" : "";

  const parts = [
    ...metric.name.split(/[^a-zA-Z0-9]+/u),
    unit === "1" ? ratio : (unitSuffixes.get(unit) ?? unit),
    metric.sum?.isMonotonic === true ? "total" : "",
  ];

  return parts.filter((part) => part !== "").join("_");
};

const decoder = new TextDecoder();

// A collector that accepts every export and keeps the metrics'.
const recordingCollector = (bodies: string[]) =>
  Layer.succeed(
    HttpClient.HttpClient,
    HttpClient.make((request, url) =>
      Effect.sync(() => {
        if (
          url.pathname === "/v1/metrics" &&
          request.body._tag === "Uint8Array"
        ) {
          bodies.push(decoder.decode(request.body.body));
        }

        return HttpClientResponse.fromWeb(
          request,
          new Response(null, { status: 200 })
        );
      })
    )
  );

describe("the alert rules' metric names", () => {
  it("reads the server's metrics and the rules' queries", () => {
    assert.isAbove(declared.length, 10);
    assert.isAbove(queried.length, 5);
  });

  it.live("are the names the server's metrics take in Prometheus", () =>
    Effect.gen(function* exported() {
      const bodies: string[] = [];

      yield* Effect.forEach(
        declared,
        ({ incremental, kind, name }) =>
          kind === "gauge"
            ? Metric.update(Metric.gauge(name), 1)
            : Metric.update(Metric.counter(name, { incremental }), 1),
        { discard: true }
      ).pipe(
        Effect.provide(
          OtlpExport.pipe(
            Layer.provide(recordingCollector(bodies)),
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

      const names = new Set(
        bodies.flatMap((body) =>
          decodeExported(body).resourceMetrics.flatMap(({ scopeMetrics }) =>
            scopeMetrics.flatMap(({ metrics }) => metrics.map(prometheusName))
          )
        )
      );

      assert.deepStrictEqual(
        queried.filter((name) => !names.has(name)),
        []
      );
    })
  );
});
