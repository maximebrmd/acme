import { BunHttpServer } from "@effect/platform-bun";
import { Api } from "acme-contract";
import { Config, Effect, Layer } from "effect";
import { HttpRouter } from "effect/http";
import { HttpApiBuilder } from "effect/http-api";

import { ObservabilityLive } from "#app/observability.ts";
import { SystemHandlers } from "#app/system.ts";
import { NotificationsLive } from "#notifications/container.ts";
import { DatabaseLive } from "#shared/infrastructure/database.ts";
import { MigrationsLive } from "#shared/infrastructure/migrations.ts";
import { AuthRoutesLive, WorkspaceLive } from "#workspace/container.ts";

const ApiLive = HttpApiBuilder.layer(Api, {
  openapiPath: "/openapi.json",
}).pipe(Layer.provide(SystemHandlers));

/** Every route the server answers: the HTTP API and Better Auth's. */
export const RoutesLive = Layer.mergeAll(ApiLive, AuthRoutesLive);

// The services the routes need, each built after the ones below it: the
// database pool, the migrations, then the contexts. Better Auth checks its
// tables against the database, so it starts once they are migrated.
const ServicesLive = WorkspaceLive.pipe(
  Layer.provideMerge(NotificationsLive),
  Layer.provideMerge(MigrationsLive),
  Layer.provideMerge(DatabaseLive)
);

/** The routes with their services, without an HTTP server: for tests. */
export const AppLive = RoutesLive.pipe(Layer.provide(ServicesLive));

const HttpServerLive = Layer.unwrap(
  Effect.gen(function* HttpServerLive() {
    const port = yield* Config.Port("PORT").pipe(Config.withDefault(3000));

    return BunHttpServer.layer({ port });
  })
);

// Each layer is built after the ones it is provided with, from the bottom up:
// telemetry, the services, then the HTTP server. The server only listens once
// the database is up to date.
export const ServerLive = HttpRouter.serve(RoutesLive).pipe(
  Layer.provide(HttpServerLive),
  Layer.provide(ServicesLive),
  Layer.provide(ObservabilityLive)
);
