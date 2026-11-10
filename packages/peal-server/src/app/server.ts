import { BunDns, BunHttpServer } from "@effect/platform-bun";
import { Config, Effect, Layer } from "effect";
import { MessageStorage, ShardingConfig } from "effect/cluster";
import { HttpRouter } from "effect/http";
import { HttpApiBuilder } from "effect/http-api";
import { WorkflowEngine } from "effect/workflow";
import { Api } from "peal-contract";

import {
  AnalyticsApiLive,
  analyticsCollection,
  AnalyticsLive,
  PlatformMetricsReaderLive,
} from "#analytics/container.ts";
import { ClientErrorsLive } from "#app/client-errors/live.ts";
import { ClusterLive } from "#app/cluster.ts";
import { CronsLive } from "#app/crons.ts";
import { McpLive } from "#app/mcp/server.ts";
import { ObservabilityLive } from "#app/observability.ts";
import { SystemHandlers } from "#app/system.ts";
import { AssistantApiLive, AssistantLive } from "#assistant/container.ts";
import {
  BillingApiLive,
  BillingActionsApiLive,
  BillingLive,
  BillingOverviewLive,
} from "#billing/container.ts";
import {
  ChannelOAuthApiLive,
  ChannelsApiLive,
  ChannelsLive,
  DataDeletionApiLive,
} from "#channels/container.ts";
import {
  LegalApiLive,
  LegalLive,
  LegalRequestsLive,
} from "#legal/container.ts";
import { MediaApiLive, MediaLive } from "#media/container.ts";
import {
  NoticesApiLive,
  NoticesLive,
  NotificationPreferencesApiLive,
  NotificationsLive,
  NotificationsWorkersLive,
} from "#notifications/container.ts";
import {
  CapabilitiesApiLive,
  GatedMetricsReader,
  LookupsApiLive,
  MediaInPostsLive,
  PostsApiLive,
  PublishingLive,
  TikTokApiLive,
  publishingWorkersReading,
} from "#publishing/container.ts";
import { DatabaseLive } from "#shared/infrastructure/database.ts";
import { MigrationsLive } from "#shared/infrastructure/migrations.ts";
import { IdsLive } from "#shared/infrastructure/secure-random-ids.ts";
import { TransactionRunnerLive } from "#shared/infrastructure/transaction-runner-live.ts";
import {
  ImpersonationAuditLive,
  LegalDisclosureAuditLive,
  StaffApiLive,
  StaffLive,
  StaffRecordsLive,
} from "#staff/container.ts";
import {
  AuthRoutesLive,
  StripeCheckoutsLive,
  WorkspaceApiLive,
  WorkspaceLive,
  WorkspaceSettingsLive,
} from "#workspace/container.ts";

// The groups of the workspace endpoints, the signed-in user's notices and
// the staff console, behind the Authentication, WorkspaceAccess and
// StaffAccess middleware that WorkspaceApiLive provides.
const WorkspaceGroupsLive = Layer.mergeAll(
  ChannelsApiLive,
  PostsApiLive,
  MediaApiLive,
  NoticesApiLive,
  NotificationPreferencesApiLive,
  AssistantApiLive,
  BillingApiLive,
  BillingActionsApiLive,
  AnalyticsApiLive,
  TikTokApiLive,
  CapabilitiesApiLive,
  LookupsApiLive,
  StaffApiLive,
  LegalApiLive
).pipe(Layer.provideMerge(WorkspaceApiLive));

const ApiLive = HttpApiBuilder.layer(Api, {
  openapiPath: "/openapi.json",
}).pipe(
  Layer.provide([
    SystemHandlers,
    ClientErrorsLive,
    ChannelOAuthApiLive,
    DataDeletionApiLive,
    WorkspaceGroupsLive,
  ])
);

/**
 * Every route the server answers: the HTTP API, Better Auth's, and the MCP
 * endpoint.
 */
export const RoutesLive = Layer.mergeAll(ApiLive, AuthRoutesLive, McpLive);

// Billing, which reads the checkouts the workspace context's Stripe plugin
// keeps.
const BillingContextsLive = BillingLive.pipe(
  Layer.provide(StripeCheckoutsLive)
);

// The workspace context with the notifications it sends, the plans that
// limit it, the audit log of staff's impersonations it records and the
// legal records of the connections that change content, then the
// notices, which read the workspace's members, then the channels context,
// which sends them, as publishing does.
const ChannelsWithNoticesLive = ChannelsLive.pipe(
  Layer.provideMerge(NoticesLive),
  Layer.provideMerge(
    WorkspaceLive.pipe(
      Layer.provideMerge(NotificationsLive),
      Layer.provideMerge(BillingContextsLive),
      Layer.provide(ImpersonationAuditLive),
      Layer.provideMerge(LegalLive)
    )
  )
);

// The media context, which asks publishing which posts show an asset before
// deleting it, and billing how much a workspace may store.
const MediaContextLive = MediaLive.pipe(
  Layer.provide(Layer.mergeAll(MediaInPostsLive, BillingContextsLive))
);

// Publishing posts to the channels the channels context lists, with the
// media the media context holds.
const PublishingContextLive = PublishingLive.pipe(
  Layer.provide(Layer.mergeAll(ChannelsWithNoticesLive, MediaContextLive))
);

// The assistant, whose daily quota is the workspace plan's.
const AssistantContextLive = AssistantLive.pipe(
  Layer.provideMerge(BillingContextsLive)
);

// Workspace and account settings, which erase and export what every context
// keeps, billing's included, which the workspace context brings, the staff
// audit log's, and the legal records, which keep who held a closed account.
const SettingsContextLive = WorkspaceSettingsLive.pipe(
  Layer.provide(
    Layer.mergeAll(
      ChannelsWithNoticesLive,
      PublishingContextLive,
      MediaContextLive,
      AssistantContextLive,
      AnalyticsLive,
      StaffRecordsLive
    )
  )
);

// The staff console, which reads accounts and workspaces from the workspace
// context, and each workspace's plan, channels and posts from billing, the
// channels context and publishing.
const StaffContextLive = StaffLive.pipe(
  Layer.provide(Layer.mergeAll(ChannelsWithNoticesLive, PublishingContextLive))
);

// Legal requests, for staff holding the legal role, as the workspace
// context tells, each answer shown in the staff audit log.
const LegalRequestsContextLive = LegalRequestsLive.pipe(
  Layer.provide(
    Layer.mergeAll(ChannelsWithNoticesLive, LegalDisclosureAuditLive)
  )
);

// The billing page, which counts what each context holds, and its
// orders, cancellations and withdrawals, which tell members through the
// notices.
const BillingContextLive = BillingOverviewLive.pipe(
  Layer.provide(
    Layer.mergeAll(
      ChannelsWithNoticesLive,
      PublishingContextLive,
      MediaContextLive,
      AssistantContextLive
    )
  )
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
  MediaContextLive,
  AssistantContextLive,
  SettingsContextLive,
  BillingContextLive,
  AnalyticsLive,
  StaffContextLive,
  LegalRequestsContextLive
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

// The durable jobs: workflows, cluster entities and crons. The channels'
// gates publish, and read analytics' counts with the platforms' readers.
const WorkersLive = Layer.mergeAll(
  publishingWorkersReading(PlatformMetricsReaderLive),
  NotificationsWorkersLive,
  CronsLive
);

// Analytics follows the posts publishing lists, and reads their counts
// through the channels' gates.
const AnalyticsContextLive = Layer.merge(
  AnalyticsLive,
  analyticsCollection(GatedMetricsReader)
).pipe(Layer.provide(PublishingContextLive));

// The contexts' use cases and adapters, which handlers and workers share.
const ContextsLive = Layer.mergeAll(
  ChannelsWithNoticesLive,
  PublishingContextLive,
  MediaContextLive,
  AssistantContextLive,
  SettingsContextLive,
  BillingContextLive,
  AnalyticsContextLive,
  StaffContextLive,
  LegalRequestsContextLive
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
