import { BunDns, BunHttpServer } from "@effect/platform-bun";
import { Api } from "acme-contract";
import { Config, Effect, Layer } from "effect";
import { MessageStorage, ShardingConfig } from "effect/cluster";
import { HttpRouter } from "effect/http";
import { HttpApiBuilder } from "effect/http-api";
import { WorkflowEngine } from "effect/workflow";

import { ClusterLive } from "#app/cluster.ts";
import { CronsLive } from "#app/crons.ts";
import { McpLive } from "#app/mcp/server.ts";
import { ObservabilityLive } from "#app/observability.ts";
import { SystemHandlers } from "#app/system.ts";
import { AssistantApiLive, AssistantLive } from "#assistant/container.ts";
import {
  ChannelOAuthApiLive,
  ChannelsApiLive,
  ChannelsLive,
} from "#channels/container.ts";
import { MediaApiLive, MediaLive } from "#media/container.ts";
import {
  NoticesApiLive,
  NoticesLive,
  NotificationPreferencesApiLive,
  NotificationsLive,
  NotificationsWorkersLive,
} from "#notifications/container.ts";
import {
  PostsApiLive,
  PublishingLive,
  PublishingWorkersLive,
} from "#publishing/container.ts";
import { DatabaseLive } from "#shared/infrastructure/database.ts";
import { MigrationsLive } from "#shared/infrastructure/migrations.ts";
import { IdsLive } from "#shared/infrastructure/secure-random-ids.ts";
import { TransactionRunnerLive } from "#shared/infrastructure/transaction-runner-live.ts";
import {
  AuthRoutesLive,
  WorkspaceApiLive,
  WorkspaceLive,
} from "#workspace/container.ts";

// The groups of the workspace endpoints, and the signed-in user's notices,
// behind the Authentication and WorkspaceAccess middleware that
// WorkspaceApiLive provides.
const WorkspaceGroupsLive = Layer.mergeAll(
  ChannelsApiLive,
  PostsApiLive,
  MediaApiLive,
  NoticesApiLive,
  NotificationPreferencesApiLive,
  AssistantApiLive
).pipe(Layer.provideMerge(WorkspaceApiLive));

const ApiLive = HttpApiBuilder.layer(Api, {
  openapiPath: "/openapi.json",
}).pipe(
  Layer.provide([SystemHandlers, ChannelOAuthApiLive, WorkspaceGroupsLive])
);

/**
 * Every route the server answers: the HTTP API, Better Auth's, and the MCP
 * endpoint.
 */
export const RoutesLive = Layer.mergeAll(ApiLive, AuthRoutesLive, McpLive);

// The workspace context with the notifications it sends, then the notices,
// which read the workspace's members, then the channels context, which
// sends them, as publishing does.
const ChannelsWithNoticesLive = ChannelsLive.pipe(
  Layer.provideMerge(NoticesLive),
  Layer.provideMerge(WorkspaceLive.pipe(Layer.provideMerge(NotificationsLive)))
);

// Publishing posts to the channels the channels context lists, with the
// media the media context holds.
const PublishingContextLive = PublishingLive.pipe(
  Layer.provide(Layer.mergeAll(ChannelsWithNoticesLive, MediaLive))
);

// Durable jobs as AppLive runs them, for tests that write and read posts and
// notices: the engine in memory has no workflow registered, so scheduling a
// post, or emailing a notice, through AppLive fails. Tests that schedule use
// test/publishing/posts-server.ts.
const JobsWithoutWorkersLive = Layer.mergeAll(
  IdsLive,
  TransactionRunnerLive
).pipe(
  Layer.provideMerge(
    Layer.mergeAll(
      WorkflowEngine.layerMemory,
      MessageStorage.layerMemory.pipe(Layer.provide(ShardingConfig.layer()))
    )
  )
);

// The services the routes need, each built after the ones below it: the
// database pool, the migrations, then the contexts. Better Auth checks its
// tables against the database, so it starts once they are migrated. The
// media store's settings are read here: in production, a server without
// them does not start (see src/media/infrastructure/s3-media-storage.ts).
const ServicesLive = Layer.mergeAll(
  ChannelsWithNoticesLive,
  PublishingContextLive,
  MediaLive,
  AssistantLive
).pipe(
  Layer.provide(Layer.mergeAll(JobsWithoutWorkersLive, BunDns.layer)),
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

// The durable jobs: workflows, cluster entities and crons.
const WorkersLive = Layer.mergeAll(
  PublishingWorkersLive,
  NotificationsWorkersLive,
  CronsLive
);

// The contexts' use cases and adapters, which handlers and workers share.
const ContextsLive = Layer.mergeAll(
  ChannelsWithNoticesLive,
  PublishingContextLive,
  MediaLive,
  AssistantLive
).pipe(
  Layer.provideMerge(
    Layer.mergeAll(IdsLive, TransactionRunnerLive, BunDns.layer)
  )
);

// Each layer is built after the ones it is provided with, from the bottom up:
// telemetry, the database pool, the migrations, the cluster, the contexts,
// then the HTTP server and the workers. Nothing listens or runs before the
// database is up to date, and the cluster shares the pool with Drizzle, so a
// use case can save a post and start its workflow in one transaction.
export const ServerLive = Layer.mergeAll(
  HttpRouter.serve(RoutesLive).pipe(Layer.provide(HttpServerLive)),
  WorkersLive
).pipe(
  Layer.provide(ContextsLive),
  Layer.provide(ClusterLive),
  Layer.provide(MigrationsLive),
  Layer.provide(DatabaseLive),
  Layer.provide(ObservabilityLive)
);
