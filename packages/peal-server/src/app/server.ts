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
import { MeterErrorsLive } from "#app/meter-errors/route.ts";
import { ObservabilityLive } from "#app/observability.ts";
import { countRequests } from "#app/request-metrics.ts";
import { ShortLinkRedirectsLive } from "#app/short-links/redirects.ts";
import { httpShutdownTimeout } from "#app/shutdown.ts";
import { SystemHandlers } from "#app/system.ts";
import { UntracedPathsLive } from "#app/untraced-paths.ts";
import { DigestUnsubscribeLive } from "#app/weekly-digest/unsubscribe.ts";
import { AssistantApiLive, AssistantLive } from "#assistant/container.ts";
import {
  BillingApiLive,
  StripePricesCheckedLive,
  BillingActionsApiLive,
  BillingLive,
  BillingMetersLive,
  BillingXPassThroughLive,
  BillingOverviewLive,
  PartnerUsageApiLive,
  UsageApiLive,
  ContractRequestsDeskApiLive,
  ContractRequestsLive as ContractRequestsUseCasesLive,
  BillingAccountsDeskApiLive,
  BillingAccountsDeskLive,
} from "#billing/container.ts";
import {
  ChannelOAuthApiLive,
  ChannelOverviewLive,
  ChannelsApiLive,
  ChannelsLive,
  SharedPlatformAccountsLive,
  ConnectLinkJournalLive,
  ConnectLinksApiLive,
  DataDeletionApiLive,
  TokenCipherLive,
} from "#channels/container.ts";
import {
  engagementLive,
  InboxApiLive,
  InboxMessagesApiLive,
  InboxReviewsApiLive,
  EngagementRecordsLive,
  EngagementWorkersLive,
  InboxWaitingLive,
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
  WeeklyDigestsLive,
} from "#notifications/container.ts";
import {
  CapabilitiesApiLive,
  GatedCommentSource,
  ChannelDefaultsApiLive,
  ChannelSetsApiLive,
  GatedMetricsReader,
  GatedReplySender,
  GatedMessages,
  GatedReviews,
  UnreadComments,
  LookupsApiLive,
  MediaInPostsLive,
  PostAttentionLive,
  PlatformQuotaLive,
  PostsApiLive,
  ArticlesApiLive,
  ArticleWorkersLive,
  ArticlesLive,
  PublishingLive,
  QueuesApiLive,
  RecyclingApiLive,
  FeedsApiLive,
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
  LinkStandingLive,
  ShortLinkSettingsLive,
  ShortLinksApiLive,
  ShortLinksLive,
} from "#shortlinks/container.ts";
import {
  BillingAccountAuditLive,
  CreditProblemAuditLive,
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
  OverviewApiLive,
  OverviewLive,
  PartnerOwnershipLive,
  WorkspaceOwnersLive,
  PartnerTenantsLive,
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
  ArticlesApiLive,
  MediaApiLive,
  NoticesApiLive,
  NotificationPreferencesApiLive,
  OverviewApiLive,
  AssistantApiLive,
  BillingApiLive,
  BillingActionsApiLive,
  UsageApiLive,
  PartnerUsageApiLive,
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
  InboxMessagesApiLive,
  InboxReviewsApiLive,
  ContractRequestsDeskApiLive,
  BillingAccountsDeskApiLive,
  TagsApiLive,
  SignaturesApiLive,
  ChannelSetsApiLive,
  QueuesApiLive,
  RecyclingApiLive,
  FeedsApiLive,
  ChannelDefaultsApiLive,
  AdsApiLive,
  ShortLinksApiLive
).pipe(Layer.provideMerge(WorkspaceApiLive));

// `/openapi.json` is served with the discovery documents, the same as
// `/api/openapi.json`: the API's document with the events webhooks send.
const ApiLive = HttpApiBuilder.layer(Api).pipe(
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
  ShortLinkRedirectsLive,
  UntracedPathsLive,
  DigestUnsubscribeLive,
  MeterErrorsLive,
  ApiAnswersLive
);

// Billing, which reads the checkouts the workspace context's Stripe plugin
// keeps, and whose plan a partner's workspace is on.
const BillingContextsLive = BillingLive.pipe(
  Layer.provide(
    Layer.mergeAll(
      StripeCheckoutsLive,
      PartnerOwnershipLive,
      WorkspaceOwnersLive
    )
  )
);

// The request counts and the workspaces' activity logs, which name the
// keys and applications behind requests as the workspace context does.
const ActivityContextLive = ActivityLive.pipe(
  Layer.provide(CredentialNamesLive),
  Layer.provide(BillingContextsLive)
);

// Webhooks, whose signing secrets the channels context's cipher encrypts.
const WebhooksContextLive = WebhooksLive.pipe(Layer.provide(TokenCipherLive));

// The workspace context with the notifications it sends, the plans that
// limit it, the audit log of staff's impersonations it records and the
// legal records of the connections that change content, the count of
// the requests each key and application sends and the activity logs of the
// changes they ask for, then the notices, which read the workspace's
// members, then the webhooks, which tell a workspace through them that an
// endpoint was turned off.
const NoticesContextLive = WebhooksContextLive.pipe(
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

// The meters the assistant, the inbox and ads claim, on billing's
// accounts, telling billing managers through the notices when one pauses.
// Below the channels context, which gives back through them what a
// channel that leaves had not sent.
const MetersContextLive = BillingMetersLive.pipe(
  Layer.provide(
    Layer.mergeAll(
      NoticesContextLive,
      PartnerOwnershipLive,
      WorkspaceOwnersLive
    )
  )
);

// What engagement keeps that other contexts erase or end: a channel gone
// or a workspace erased gives back the outbound messages of what never
// set out, on the meters.
const EngagementRecordsContextLive = EngagementRecordsLive.pipe(
  Layer.provide(MetersContextLive)
);

// The channels context, over those, which sends notices and webhook
// events, as publishing does.
const ChannelsWithNoticesLive = ChannelsLive.pipe(
  // A connect link's connections go to the workspace's activity log.
  Layer.provide(ConnectLinkJournalLive),
  // A channel gone or back is told to analytics, and a channel gone to
  // engagement, in its transaction.
  Layer.provide(AnalyticsRecordsLive),
  Layer.provide(EngagementRecordsContextLive),
  // Meta's requests about a Facebook user reach their sign-ins to its ad
  // network too, which the ads context holds.
  Layer.provide(AdsPlatformUserGrants),
  Layer.provideMerge(NoticesContextLive)
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
// nor the inbox, and none is while a boost of the ads context shows it. A
// new post that does not say takes the workspace's short links default.
const PublishingContextLive = Layer.merge(PublishingLive, ArticlesLive).pipe(
  Layer.provide(
    Layer.mergeAll(
      // X's posts claimed on billing's meters, which scheduling reads.
      MetersContextLive,
      BillingXPassThroughLive,
      ChannelsWithNoticesLive,
      MediaContextLive,
      ReviewGateContextLive,
      AnalyticsRecordsLive,
      EngagementRecordsContextLive,
      PostBoostsLive,
      ShortLinkSettingsLive
    )
  )
);

// Short links, which answer only while the part of the post that holds
// them is live (publishing) and their workspace in good standing (the
// workspace context).
const ShortLinksContextLive = ShortLinksLive.pipe(
  Layer.provide(
    LinkStandingLive.pipe(
      Layer.provide(
        Layer.mergeAll(PublishingContextLive, ChannelsWithNoticesLive)
      )
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
// notices and the webhooks; each reply claims an outbound message.
// `gated` is how it reaches the platforms.
const engagementOver = <E, R>(
  gated: Layer.Layer<Layer.Success<typeof UnreadComments>, E, R>
) =>
  engagementLive(gated).pipe(
    Layer.provide(
      Layer.mergeAll(
        ChannelsWithNoticesLive,
        PublishingContextLive,
        MetersContextLive
      )
    )
  );

// As the server runs it: through the channels' gates.
const EngagementContextLive = engagementOver(
  Layer.mergeAll(
    GatedCommentSource,
    GatedReplySender,
    GatedReviews,
    GatedMessages
  )
);

// As AppLive runs it, without workers: nothing is read or sent.
const EngagementWithoutPlatformsLive = engagementOver(UnreadComments);

// The assistant, whose daily quota is the workspace plan's, or billing's
// meters on a server that bills, whose images the media context keeps,
// and whose workspaces' provider keys the channels context's cipher
// seals.
const AssistantContextLive = AssistantLive.pipe(
  Layer.provide(MediaContextLive),
  Layer.provide(TokenCipherLive),
  Layer.provide(MetersContextLive),
  Layer.provideMerge(BillingContextsLive)
);

// Ads, on the gate given: with the cluster, each ad account's own gate;
// without it, as in tests of the routes, the calls run where they are
// asked. They reach networks with the tokens the channels context
// encrypts, promote the posts publishing lists, show the counts analytics
// keeps beside theirs, and tell workspaces through the notices and the
// webhooks; each ad seen running in a month claims a managed ad.
const adsContext = <GOut, GE, GR>(gate: Layer.Layer<GOut, GE, GR>) =>
  adsLive(gate).pipe(
    Layer.provide(
      Layer.mergeAll(
        ChannelsWithNoticesLive,
        PublishingContextLive,
        AnalyticsLive,
        MetersContextLive
      )
    )
  );

const AdsRoutesContextLive = adsContext(DirectAds);

// Workspace and account settings, which erase and export what every context
// keeps, billing's included, which the workspace context brings, the staff
// audit log's, the short links', and the legal records, which keep who held
// a closed account.
const SettingsContextLive = WorkspaceSettingsLive.pipe(
  Layer.provide(
    Layer.mergeAll(
      ChannelsWithNoticesLive,
      PublishingContextLive,
      MediaContextLive,
      AssistantContextLive,
      AnalyticsLive,
      EngagementRecordsContextLive,
      StaffRecordsLive,
      ReviewGateContextLive,
      AdsRoutesContextLive,
      ShortLinksContextLive
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
  EngagementRecordsContextLive,
  StaffRecordsLive,
  ReviewGateContextLive,
  AdsRoutesContextLive,
  ShortLinksContextLive
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
      AdsRoutesContextLive,
      // The short links it turns off.
      ShortLinksContextLive
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
// notices; and a partner's usage per customer, from the workspaces the
// workspace context says it holds.
const BillingContextLive = BillingOverviewLive.pipe(
  Layer.provide(
    Layer.mergeAll(
      PartnerTenantsLive,
      WorkspaceOwnersLive,
      SharedPlatformAccountsLive
    )
  ),
  Layer.provide(
    Layer.mergeAll(
      ChannelsWithNoticesLive,
      PublishingContextLive,
      MediaContextLive,
      AssistantContextLive
    )
  )
);

// What a person reads across their workspaces: each decided as the
// workspace context decides any request, with the posts publishing counts
// and lists, the channels and their platforms, the inbox's waiting threads,
// analytics' report across workspaces and each workspace's standing
// against its plan, as billing tells it.
const OverviewContextLive = OverviewLive.pipe(
  Layer.provide(
    Layer.mergeAll(
      ChannelsWithNoticesLive,
      BillingContextLive,
      AnalyticsLive,
      PostAttentionLive,
      ChannelOverviewLive,
      InboxWaitingLive
    )
  )
);

// The weekly digest, which reads the members and their workspaces from the
// workspace context, the posts publishing counts and lists, analytics'
// engagement, and sends through the notifications' mailer.
const WeeklyDigestContextLive = WeeklyDigestsLive.pipe(
  Layer.provide(
    Layer.mergeAll(ChannelsWithNoticesLive, PostAttentionLive, AnalyticsLive)
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

// What staff do about one free tier per person, from the platform accounts
// the channels context holds and the owners the workspace context knows,
// recorded in the staff audit log.
const BillingAccountsDeskContextLive = BillingAccountsDeskLive.pipe(
  Layer.provide(
    Layer.mergeAll(
      ChannelsWithNoticesLive,
      SharedPlatformAccountsLive,
      PartnerOwnershipLive,
      WorkspaceOwnersLive,
      BillingAccountAuditLive,
      CreditProblemAuditLive
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
  BillingAccountsDeskContextLive,
  AdsRoutesContextLive,
  ShortLinksContextLive,
  OverviewContextLive
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

    return BunHttpServer.layer({
      gracefulShutdownTimeout: httpShutdownTimeout,
      port,
    });
  })
);

// The durable jobs: workflows, cluster entities and crons. The channels'
// gates publish, read analytics' counts with the platforms' readers, and
// read and answer comments with engagement's.
const WorkersLive = Layer.mergeAll(
  publishingWorkersReading(
    PlatformMetricsReaderLive,
    // YouTube's comment reads count their units in the server's ledger of
    // the project's day, which publishing keeps.
    PlatformEngagementLive.pipe(Layer.provide(PlatformQuotaLive))
  ),
  ArticleWorkersLive,
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

/**
 * The contexts' use cases and adapters, which handlers and workers share:
 * what `ServerLive` runs its routes and workers on. Exported for the test
 * that builds it.
 */
export const ContextsLive = Layer.mergeAll(
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
  BillingAccountsDeskContextLive,
  // On the cluster, every call to an ad account goes through its gate.
  adsContext(GatedAds),
  ShortLinksContextLive,
  OverviewContextLive,
  WeeklyDigestContextLive,
  // Billing's meters and X's pass-through, which the workers' platforms
  // and readers claim on: X's posts and, where the server bills, its reads.
  MetersContextLive,
  BillingXPassThroughLive
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
