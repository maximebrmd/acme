import { BunDns, BunHttpServer } from "@effect/platform-bun";
import { Config, Effect, Layer } from "effect";
import { MessageStorage, ShardingConfig } from "effect/cluster";
import { HttpRouter } from "effect/http";
import { HttpApiBuilder } from "effect/http-api";
import { WorkflowEngine } from "effect/workflow";
import { Api } from "peal-contract";

import { ActivityApiLive, ActivityLive } from "#activity/container.ts";
import {
  AdsApiLive,
  adsLive,
  AdsPlatformUserGrants,
  AdsWorkersLive,
  DirectAds,
  GatedAds,
  PostBoostsLive,
} from "#ads/container.ts";
import {
  AnalyticsApiLive,
  analyticsCollection,
  AnalyticsLive,
  AnalyticsRecordsLive,
  PlatformMetricsReaderLive,
} from "#analytics/container.ts";
import { ApiAnswersLive } from "#app/answers.ts";
import { ClientErrorsLive } from "#app/client-errors/live.ts";
import { ClusterLive } from "#app/cluster.ts";
import { HostedConnectLive } from "#app/connect-links/live.ts";
import { ContractRequestsLive } from "#app/contract-requests/live.ts";
import { CronsLive } from "#app/crons.ts";
import { DiscoveryLive } from "#app/discovery/live.ts";
import { McpLive } from "#app/mcp/server.ts";
import { ObservabilityLive } from "#app/observability.ts";
import { countRequests } from "#app/request-metrics.ts";
import { SystemHandlers } from "#app/system.ts";
import { AssistantApiLive, AssistantLive } from "#assistant/container.ts";
import {
  BillingApiLive,
  StripePricesCheckedLive,
  BillingActionsApiLive,
  BillingLive,
  BillingOverviewLive,
  UsageApiLive,
  ContractRequestsDeskApiLive,
  ContractRequestsLive as ContractRequestsUseCasesLive,
} from "#billing/container.ts";
import {
  ChannelOAuthApiLive,
  ChannelsApiLive,
  ChannelsLive,
  ConnectLinkJournalLive,
  ConnectLinksApiLive,
  DataDeletionApiLive,
  TokenCipherLive,
} from "#channels/container.ts";
import {
  engagementLive,
  InboxApiLive,
  EngagementRecordsLive,
  EngagementWorkersLive,
  PlatformEngagementLive,
} from "#engagement/container.ts";
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
  GatedCommentSource,
  ChannelDefaultsApiLive,
  ChannelSetsApiLive,
  GatedMetricsReader,
  GatedReplySender,
  UnreadComments,
  LookupsApiLive,
  MediaInPostsLive,
  PostsApiLive,
  PublishingLive,
  QueuesApiLive,
  SignaturesApiLive,
  TagsApiLive,
  TikTokApiLive,
  publishingWorkersReading,
} from "#publishing/container.ts";
import {
  ReviewApiLive,
  ReviewGateLive,
  ReviewLinkApiLive,
  ReviewLive,
} from "#review/container.ts";
import { DatabaseLive } from "#shared/infrastructure/database.ts";
import { MigrationsLive } from "#shared/infrastructure/migrations.ts";
import { IdsLive } from "#shared/infrastructure/secure-random-ids.ts";
import { TransactionRunnerLive } from "#shared/infrastructure/transaction-runner-live.ts";
import {
  ContractRequestAuditLive,
  ImpersonationAuditLive,
  LegalDisclosureAuditLive,
  StaffApiLive,
  StaffLive,
  StaffRecordsLive,
} from "#staff/container.ts";
import {
  WebhooksApiLive,
  WebhooksLive,
  WebhooksWorkersLive,
} from "#webhooks/container.ts";
import {
  AccountLookupLive,
  AuthRoutesLive,
  CredentialNamesLive,
  ErasureReplayLive,
  PartnerOwnershipLive,
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
  ConnectLinksApiLive,
  PostsApiLive,
  MediaApiLive,
  NoticesApiLive,
  NotificationPreferencesApiLive,
  AssistantApiLive,
  BillingApiLive,
  BillingActionsApiLive,
  UsageApiLive,
  AnalyticsApiLive,
  TikTokApiLive,
  CapabilitiesApiLive,
  LookupsApiLive,
  StaffApiLive,
  LegalApiLive,
  ReviewApiLive,
  WebhooksApiLive,
  ActivityApiLive,
  InboxApiLive,
  ContractRequestsDeskApiLive,
  TagsApiLive,
  SignaturesApiLive,
  ChannelSetsApiLive,
  QueuesApiLive,
  ChannelDefaultsApiLive,
  AdsApiLive
).pipe(Layer.provideMerge(WorkspaceApiLive));

const ApiLive = HttpApiBuilder.layer(Api, {
  openapiPath: "/openapi.json",
}).pipe(
  Layer.provide([
    SystemHandlers,
    ClientErrorsLive,
    ContractRequestsLive,
    HostedConnectLive,
    ChannelOAuthApiLive,
    DataDeletionApiLive,
    ReviewLinkApiLive,
    WorkspaceGroupsLive,
  ])
);

/**
 * Every route the server answers: the HTTP API, Better Auth's, the MCP
 * endpoint and the documents that say where they are, each answer with its
 * request id.
 */
export const RoutesLive = Layer.mergeAll(
  ApiLive,
  AuthRoutesLive,
  McpLive,
  DiscoveryLive,
  ApiAnswersLive
);

// Billing, which reads the checkouts the workspace context's Stripe plugin
// keeps, and whose plan a partner's workspace is on.
const BillingContextsLive = BillingLive.pipe(
  Layer.provide(Layer.mergeAll(StripeCheckoutsLive, PartnerOwnershipLive))
);

// The request counts and the workspaces' activity logs, which name the
// keys and applications behind requests as the workspace context does.
const ActivityContextLive = ActivityLive.pipe(
  Layer.provide(CredentialNamesLive)
);

// Webhooks, whose signing secrets the channels context's cipher encrypts.
const WebhooksContextLive = WebhooksLive.pipe(Layer.provide(TokenCipherLive));

// The workspace context with the notifications it sends, the plans that
// limit it, the audit log of staff's impersonations it records and the
// legal records of the connections that change content, the count of
// the requests each key and application sends and the activity logs of the
// changes they ask for, then the
// notices, which read the workspace's members, then the webhooks, which
// tell a workspace through them that an endpoint was turned off, then the
// channels context, which sends notices and webhook events, as publishing
// does.
const ChannelsWithNoticesLive = ChannelsLive.pipe(
  // A connect link's connections go to the workspace's activity log.
  Layer.provide(ConnectLinkJournalLive),
  // A channel gone or back is told to analytics, in its transaction.
  Layer.provide(AnalyticsRecordsLive),
  // Meta's requests about a Facebook user reach their sign-ins to its ad
  // network too, which the ads context holds.
  Layer.provide(AdsPlatformUserGrants),
  Layer.provideMerge(WebhooksContextLive),
  Layer.provideMerge(NoticesLive),
  Layer.provideMerge(
    WorkspaceLive.pipe(
      Layer.provideMerge(NotificationsLive),
      Layer.provideMerge(BillingContextsLive),
      Layer.provide(ImpersonationAuditLive),
      Layer.provideMerge(LegalLive),
      Layer.provideMerge(ActivityContextLive)
    )
  )
);

// The media context, which asks publishing which posts show an asset before
// deleting it, and billing how much a workspace may store, and tells the
// webhooks how uploads end.
const MediaContextLive = MediaLive.pipe(
  Layer.provide(
    Layer.mergeAll(
      MediaInPostsLive,
      BillingContextsLive,
      ChannelsWithNoticesLive
    )
  )
);

// What the review context decides before publishing schedules a post (its
// approval gate), told through the notices, with its records and their
// retention.
const ReviewGateContextLive = ReviewGateLive.pipe(
  Layer.provide(ChannelsWithNoticesLive)
);

// Publishing posts to the channels the channels context lists, with the
// media the media context holds, once the review context's gate admits
// them.
// A post deleted from its platform is no longer followed by analytics
// nor the inbox, and none is while a boost of the ads context shows it.
const PublishingContextLive = PublishingLive.pipe(
  Layer.provide(
    Layer.mergeAll(
      ChannelsWithNoticesLive,
      MediaContextLive,
      ReviewGateContextLive,
      AnalyticsRecordsLive,
      EngagementRecordsLive,
      PostBoostsLive
    )
  )
);

// Reviews: links, comments and approvals of the posts publishing holds,
// with their channels' names, their media and their members' names.
const ReviewContextLive = ReviewLive.pipe(
  Layer.provide(
    Layer.mergeAll(
      ChannelsWithNoticesLive,
      MediaContextLive,
      PublishingContextLive
    )
  )
);

// Engagement: the comments under the posts publishing lists, read and
// answered on the channels of the channels context, and told through the
// notices and the webhooks. `gated` is how it reaches the platforms.
const engagementOver = <E, R>(
  gated: Layer.Layer<Layer.Success<typeof UnreadComments>, E, R>
) =>
  engagementLive(gated).pipe(
    Layer.provide(
      Layer.mergeAll(ChannelsWithNoticesLive, PublishingContextLive)
    )
  );

// As the server runs it: through the channels' gates.
const EngagementContextLive = engagementOver(
  Layer.merge(GatedCommentSource, GatedReplySender)
);

// As AppLive runs it, without workers: nothing is read or sent.
const EngagementWithoutPlatformsLive = engagementOver(UnreadComments);

// The assistant, whose daily quota is the workspace plan's.
const AssistantContextLive = AssistantLive.pipe(
  Layer.provideMerge(BillingContextsLive)
);

// Ads, on the gate given: with the cluster, each ad account's own gate;
// without it, as in tests of the routes, the calls run where they are
// asked. They reach networks with the tokens the channels context
// encrypts, promote the posts publishing lists, show the counts analytics
// keeps beside theirs, and tell workspaces through the notices and the
// webhooks.
const adsContext = <GOut, GE, GR>(gate: Layer.Layer<GOut, GE, GR>) =>
  adsLive(gate).pipe(
    Layer.provide(
      Layer.mergeAll(
        ChannelsWithNoticesLive,
        PublishingContextLive,
        AnalyticsLive
      )
    )
  );

const AdsRoutesContextLive = adsContext(DirectAds);

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
      EngagementRecordsLive,
      StaffRecordsLive,
      ReviewGateContextLive,
      AdsRoutesContextLive
    )
  )
);

// What an erasure reaches in every context, as the settings do.
const ErasedContextsLive = Layer.mergeAll(
  ChannelsWithNoticesLive,
  PublishingContextLive,
  MediaContextLive,
  AssistantContextLive,
  AnalyticsLive,
  EngagementRecordsLive,
  StaffRecordsLive,
  ReviewGateContextLive,
  AdsRoutesContextLive
);

// The staff console, which reads accounts and workspaces from the workspace
// context, and each workspace's plan, channels and posts from billing, the
// channels context and publishing.
const StaffContextLive = StaffLive.pipe(
  Layer.provide(
    Layer.mergeAll(
      ChannelsWithNoticesLive,
      PublishingContextLive,
      // Its ad accounts and boosts, as metadata.
      AdsRoutesContextLive
    )
  )
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

// The cancel and withdraw functions anyone reaches, which find the account
// an address signs in to in the workspace context, tell members and write
// acknowledgements through the notifications, and record what staff do
// with requests in the audit log.
const ContractRequestsContextLive = ContractRequestsUseCasesLive.pipe(
  Layer.provide(
    Layer.mergeAll(
      ChannelsWithNoticesLive,
      AccountLookupLive,
      ContractRequestAuditLive
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
  EngagementWithoutPlatformsLive,
  StaffContextLive,
  LegalRequestsContextLive,
  ReviewGateContextLive,
  ReviewContextLive,
  ContractRequestsContextLive,
  AdsRoutesContextLive
).pipe(
  Layer.provide(Layer.mergeAll(JobsWithoutWorkersLive, BunDns.layer)),
  Layer.provideMerge(MigrationsLive),
  Layer.provideMerge(DatabaseLive)
);

/**
 * Applying the erasure ledger again after the database was restored
 * (`src/replay-erasures.ts`): the contexts an erasure reaches, on the
 * migrated database, with no HTTP server, worker or cron, so nothing is
 * published or answered meanwhile. The jobs of the posts it erases stay in
 * the cluster's tables: each wakes to a post that is gone, and is
 * superseded.
 */
export const ErasureReplayServicesLive = ErasureReplayLive.pipe(
  Layer.provide(ErasedContextsLive),
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
// gates publish, read analytics' counts with the platforms' readers, and
// read and answer comments with engagement's.
const WorkersLive = Layer.mergeAll(
  publishingWorkersReading(PlatformMetricsReaderLive, PlatformEngagementLive),
  NotificationsWorkersLive,
  EngagementWorkersLive,
  WebhooksWorkersLive,
  AdsWorkersLive,
  CronsLive
);

// Analytics follows the posts publishing lists and the channels the
// channels context lists, and reads their numbers through the channels'
// gates.
const AnalyticsContextLive = Layer.merge(
  AnalyticsLive,
  analyticsCollection(GatedMetricsReader)
).pipe(
  Layer.provide(PublishingContextLive),
  Layer.provide(ChannelsWithNoticesLive)
);

// The contexts' use cases and adapters, which handlers and workers share.
const ContextsLive = Layer.mergeAll(
  ChannelsWithNoticesLive,
  PublishingContextLive,
  MediaContextLive,
  AssistantContextLive,
  SettingsContextLive,
  BillingContextLive,
  AnalyticsContextLive,
  EngagementContextLive,
  StaffContextLive,
  LegalRequestsContextLive,
  ReviewGateContextLive,
  ReviewContextLive,
  ContractRequestsContextLive,
  // On the cluster, every call to an ad account goes through its gate.
  adsContext(GatedAds)
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
  HttpRouter.serve(RoutesLive, { middleware: countRequests }).pipe(
    Layer.provide(HttpServerLive)
  ),
  WorkersLive
).pipe(
  Layer.provide(ContextsLive),
  // Before anything listens: a server that bills starts only with
  // Stripe's prices as it publishes them.
  Layer.provide(StripePricesCheckedLive),
  Layer.provide(ClusterLive),
  Layer.provide(MigrationsLive),
  Layer.provide(DatabaseLive),
  Layer.provide(ObservabilityLive)
);
