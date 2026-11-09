import { ConfigProvider, Layer } from "effect";
import { FetchHttpClient } from "effect/http";
import { Otlp, OtlpSerialization } from "effect/observability";

import { TraceSamplingLive } from "./trace-sampling.ts";

// Effect exports a signal only when its OTEL_<SIGNAL>_EXPORTER names otlp,
// where the OpenTelemetry specification defaults to it, and names the service
// from OTEL_SERVICE_NAME. These defaults sit behind the environment: setting
// OTEL_EXPORTER_OTLP_ENDPOINT alone turns export on, a signal set to "none"
// stays off, and OTEL_SERVICE_NAME renames the service.
const otelDefaults = ConfigProvider.layerAdd(
  ConfigProvider.fromEnv({
    env: {
      OTEL_LOGS_EXPORTER: "otlp",
      OTEL_METRICS_EXPORTER: "otlp",
      OTEL_SERVICE_NAME: "peal-server",
      OTEL_TRACES_EXPORTER: "otlp",
    },
  })
);

// Exports logs, metrics and traces to the OpenTelemetry Collector named by the
// standard OTEL_* variables (OTEL_EXPORTER_OTLP_ENDPOINT…), through whichever
// HttpClient it is given, and does nothing when no endpoint is set, so
// self-hosters need no collector.
// Traces are sampled as OTEL_TRACES_SAMPLER says (see ./trace-sampling.ts).
export const OtlpExport = TraceSamplingLive.pipe(
  Layer.provideMerge(Otlp.layerFromConfig()),
  Layer.provide(OtlpSerialization.layerJson),
  Layer.provide(otelDefaults)
);

export const ObservabilityLive = OtlpExport.pipe(
  Layer.provide(FetchHttpClient.layer)
);
