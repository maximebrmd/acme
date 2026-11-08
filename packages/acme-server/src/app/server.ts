import { BunHttpServer } from "@effect/platform-bun";
import { Api } from "acme-contract";
import { Config, Effect, Layer } from "effect";
import { FetchHttpClient, HttpRouter } from "effect/http";
import { HttpApiBuilder } from "effect/http-api";
import { Otlp, OtlpSerialization } from "effect/observability";

import { SystemHandlers } from "#app/system.ts";
import { DatabaseLive } from "#shared/infrastructure/database.ts";
import { MigrationsLive } from "#shared/infrastructure/migrations.ts";

const ApiLive = HttpApiBuilder.layer(Api, {
  openapiPath: "/openapi.json",
}).pipe(Layer.provide(SystemHandlers));

// Exports logs, metrics and traces to the OpenTelemetry Collector named by the
// standard OTEL_* variables (OTEL_EXPORTER_OTLP_ENDPOINT…), and does nothing
// when they are unset, so self-hosters need no collector.
const ObservabilityLive = Otlp.layerFromConfig({
  resource: { serviceName: "acme-server" },
}).pipe(
  Layer.provide(OtlpSerialization.layerJson),
  Layer.provide(FetchHttpClient.layer)
);

const HttpServerLive = Layer.unwrap(
  Effect.gen(function* HttpServerLive() {
    const port = yield* Config.Port("PORT").pipe(Config.withDefault(3000));

    return BunHttpServer.layer({ port });
  })
);

// Each layer is built after the ones it is provided with, from the bottom up:
// telemetry, the database pool, the migrations, then the HTTP server. The
// server only listens once the database is up to date.
export const ServerLive = HttpRouter.serve(ApiLive).pipe(
  Layer.provide(HttpServerLive),
  Layer.provide(MigrationsLive),
  Layer.provide(DatabaseLive),
  Layer.provide(ObservabilityLive)
);
