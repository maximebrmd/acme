import { BunHttpServer } from "@effect/platform-bun";
import { Api } from "acme-contract";
import { Config, Effect, Layer } from "effect";
import { HttpRouter } from "effect/http";
import { HttpApiBuilder } from "effect/http-api";

import { ClusterLive } from "#app/cluster.ts";
import { CronsLive } from "#app/crons.ts";
import { ObservabilityLive } from "#app/observability.ts";
import { SystemHandlers } from "#app/system.ts";
import {
  PublishingLive,
  PublishingWorkersLive,
} from "#publishing/container.ts";
import { DatabaseLive } from "#shared/infrastructure/database.ts";
import { MigrationsLive } from "#shared/infrastructure/migrations.ts";
import { IdsLive } from "#shared/infrastructure/secure-random-ids.ts";
import { TransactionRunnerLive } from "#shared/infrastructure/transaction-runner-live.ts";

const ApiLive = HttpApiBuilder.layer(Api, {
  openapiPath: "/openapi.json",
}).pipe(Layer.provide(SystemHandlers));

const HttpServerLive = Layer.unwrap(
  Effect.gen(function* HttpServerLive() {
    const port = yield* Config.Port("PORT").pipe(Config.withDefault(3000));

    return BunHttpServer.layer({ port });
  })
);

// The durable jobs: workflows, cluster entities and crons.
const WorkersLive = Layer.mergeAll(PublishingWorkersLive, CronsLive);

// The contexts' use cases and adapters, which handlers and workers share.
const ContextsLive = PublishingLive.pipe(
  Layer.provideMerge(Layer.mergeAll(IdsLive, TransactionRunnerLive))
);

// Each layer is built after the ones it is provided with, from the bottom up:
// telemetry, the database pool, the migrations, the cluster, the contexts,
// then the HTTP server and the workers. Nothing listens or runs before the
// database is up to date, and the cluster shares the pool with Drizzle, so a
// use case can save a post and start its workflow in one transaction.
export const ServerLive = Layer.mergeAll(
  HttpRouter.serve(ApiLive).pipe(Layer.provide(HttpServerLive)),
  WorkersLive
).pipe(
  Layer.provide(ContextsLive),
  Layer.provide(ClusterLive),
  Layer.provide(MigrationsLive),
  Layer.provide(DatabaseLive),
  Layer.provide(ObservabilityLive)
);
