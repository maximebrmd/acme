import { Layer } from "effect";
import { Digest, Mac, SecureRandom } from "effect/crypto";
import { FetchHttpClient } from "effect/http";

import { AccountRules } from "#publishing/application/account-rules.ts";
import { AccountStandings } from "#publishing/application/account-standings.ts";
import { ApprovalGate } from "#publishing/application/approval-gate.ts";
import type { AttachableMedia } from "#publishing/application/attachable-media.ts";
import { ChannelDefaults } from "#publishing/application/channel-defaults.ts";
import { ChannelLookups } from "#publishing/application/channel-lookups.ts";
import { ChannelSets } from "#publishing/application/channel-sets.ts";
import { FeedNotices } from "#publishing/application/feed-notices.ts";
import { FeedPictures } from "#publishing/application/feed-pictures.ts";
import { FeedSource } from "#publishing/application/feed-source.ts";
import { Feeds } from "#publishing/application/feeds.ts";
import { FollowUpChannels } from "#publishing/application/follow-up-channels.ts";
import { FollowUpCounts } from "#publishing/application/follow-up-counts.ts";
import { FollowUpNotices } from "#publishing/application/follow-up-notices.ts";
import { FollowUpPublisher } from "#publishing/application/follow-up-publisher.ts";
import { FollowUpRules } from "#publishing/application/follow-up-rules.ts";
import { FollowUps } from "#publishing/application/follow-ups.ts";
import { HeldPosts } from "#publishing/application/held-posts.ts";
import { LivePostChanges } from "#publishing/application/live-post-changes.ts";
import { LivePostClients } from "#publishing/application/live-post-clients.ts";
import { LivePostEdits } from "#publishing/application/live-post-edits.ts";
import { LivePostEvents } from "#publishing/application/live-post-events.ts";
import { LivePostHolds } from "#publishing/application/live-post-holds.ts";
import { LiveTargetParts } from "#publishing/application/live-target-parts.ts";
import { MediaInPosts } from "#publishing/application/media-in-posts.ts";
import { pacedLookups } from "#publishing/application/paced-lookups.ts";
import { PlatformCredentials } from "#publishing/application/platform-credentials.ts";
import type { PlatformPublisher } from "#publishing/application/platform-publisher.ts";
import type { PostAllowance } from "#publishing/application/post-allowance.ts";
import { PostAttention } from "#publishing/application/post-attention.ts";
import { PostBatches } from "#publishing/application/post-batches.ts";
import { PostChecks } from "#publishing/application/post-checks.ts";
import { PostDrafts } from "#publishing/application/post-drafts.ts";
import { PostEvents } from "#publishing/application/post-events.ts";
import { PostFollowUp } from "#publishing/application/post-follow-up.ts";
import { PostMeter } from "#publishing/application/post-meter.ts";
import { PostOrigins } from "#publishing/application/post-origins.ts";
import { PostOutcomesLive } from "#publishing/application/post-outcomes.ts";
import { PostPresets } from "#publishing/application/post-presets.ts";
import { PostQueries } from "#publishing/application/post-queries.ts";
import { PostRecords } from "#publishing/application/post-records.ts";
import { PostScheduling } from "#publishing/application/post-scheduling.ts";
import { PostSearch } from "#publishing/application/post-search.ts";
import { PostTags } from "#publishing/application/post-tags.ts";
import { PostUsage } from "#publishing/application/post-usage.ts";
import { PostingCapabilities } from "#publishing/application/posting-capabilities.ts";
import { Queues } from "#publishing/application/queues.ts";
import { RecyclingActors } from "#publishing/application/recycling-actors.ts";
import { RecyclingNotices } from "#publishing/application/recycling-notices.ts";
import { Recycling } from "#publishing/application/recycling.ts";
import { RoutedFollowUpPublisher } from "#publishing/application/routed-follow-up-publisher.ts";
import { RoutedPlatformPublisher } from "#publishing/application/routed-platform-publisher.ts";
import { SendFollowUp } from "#publishing/application/send-follow-up.ts";
import type { ShortLinkDefaults } from "#publishing/application/short-link-defaults.ts";
import { Signatures } from "#publishing/application/signatures.ts";
import { TikTokCreatorInfo } from "#publishing/application/tiktok-creator-info.ts";
import type { WorkspaceChannels } from "#publishing/application/workspace-channels.ts";
import { AdsLivePostHolds } from "#publishing/infrastructure/ads-live-post-holds.ts";
import { AnalyticsCountedPlatforms } from "#publishing/infrastructure/analytics-counted-platforms.ts";
import { AnalyticsFollowUpCounts } from "#publishing/infrastructure/analytics-follow-up-counts.ts";
import { ChannelAccessCredentials } from "#publishing/infrastructure/channel-access-credentials.ts";
import { ChannelAccessGrants } from "#publishing/infrastructure/channel-access-grants.ts";
import {
  ChannelGateLive,
  GatedFollowUpPublisher,
  GatedLivePostClients,
  GatedPlatformPublisher,
  UnreadComments,
  UnreadMetrics,
} from "#publishing/infrastructure/channel-gate.ts";
import {
  FeedsCron,
  FollowUpsCron,
  IdempotencyRetentionCron,
  QuotaRetentionCron,
  RecyclingCron,
} from "#publishing/infrastructure/crons.ts";
import { DrizzleChannelDefaultsStore } from "#publishing/infrastructure/drizzle-channel-defaults-store.ts";
import { DrizzleChannelSetStore } from "#publishing/infrastructure/drizzle-channel-set-store.ts";
import { DrizzleContentFingerprints } from "#publishing/infrastructure/drizzle-content-fingerprints.ts";
import { DrizzleFeedReads } from "#publishing/infrastructure/drizzle-feed-reads.ts";
import { DrizzleFeedStore } from "#publishing/infrastructure/drizzle-feed-store.ts";
import { DrizzleFollowUpStore } from "#publishing/infrastructure/drizzle-follow-up-store.ts";
import { DrizzleIdempotencyKeys } from "#publishing/infrastructure/drizzle-idempotency-keys.ts";
import { DrizzleLivePostChangeStore } from "#publishing/infrastructure/drizzle-live-post-change-store.ts";
import { DrizzlePlatformQuota } from "#publishing/infrastructure/drizzle-platform-quota.ts";
import { DrizzlePostOversight } from "#publishing/infrastructure/drizzle-post-oversight.ts";
import { DrizzlePostRepository } from "#publishing/infrastructure/drizzle-post-repository.ts";
import { DrizzlePublicationJournal } from "#publishing/infrastructure/drizzle-publication-journal.ts";
import { DrizzlePublicationProgress } from "#publishing/infrastructure/drizzle-publication-progress.ts";
import { DrizzlePublishedTargets } from "#publishing/infrastructure/drizzle-published-targets.ts";
import { DrizzleQueueStore } from "#publishing/infrastructure/drizzle-queue-store.ts";
import { DrizzleRecordedPosts } from "#publishing/infrastructure/drizzle-recorded-posts.ts";
import { DrizzleRecyclingStore } from "#publishing/infrastructure/drizzle-recycling-store.ts";
import { DrizzleSignatureStore } from "#publishing/infrastructure/drizzle-signature-store.ts";
import { DrizzleTagStore } from "#publishing/infrastructure/drizzle-tag-store.ts";
import { DrizzleUploadSessions } from "#publishing/infrastructure/drizzle-upload-sessions.ts";
import { DrizzleWorkspacePostStore } from "#publishing/infrastructure/drizzle-workspace-post-store.ts";
import { HttpFeedSource } from "#publishing/infrastructure/feeds/http-feed-source.ts";
import { armedOutcomes } from "#publishing/infrastructure/follow-up-outcomes.ts";
import { LibraryAttachableMedia } from "#publishing/infrastructure/library-attachable-media.ts";
import { LibraryFeedPictures } from "#publishing/infrastructure/library-feed-pictures.ts";
import { LibraryMediaForPublishing } from "#publishing/infrastructure/library-media-for-publishing.ts";
import { ListedChannelConnections } from "#publishing/infrastructure/listed-channel-connections.ts";
import { ListedWorkspaceChannels } from "#publishing/infrastructure/listed-workspace-channels.ts";
import { LoggedChannelHealth } from "#publishing/infrastructure/logged-channel-health.ts";
import { LoggedOperatorAlerts } from "#publishing/infrastructure/logged-operator-alerts.ts";
import { meteredOutcomes } from "#publishing/infrastructure/metered-publication-outcomes.ts";
import { MeteredXPostsLive } from "#publishing/infrastructure/metered-x-posts.ts";
import { NamedPostOrigins } from "#publishing/infrastructure/named-post-origins.ts";
import { NotifiedFeedNotices } from "#publishing/infrastructure/notified-feed-notices.ts";
import { NotifiedFollowUpNotices } from "#publishing/infrastructure/notified-follow-up-notices.ts";
import { NotifiedPublicationOutcomes } from "#publishing/infrastructure/notified-publication-outcomes.ts";
import { NotifiedRecyclingNotices } from "#publishing/infrastructure/notified-recycling-notices.ts";
import { PlanPostAllowanceLive } from "#publishing/infrastructure/plan-post-allowance.ts";
import { LivePostClientsLive } from "#publishing/infrastructure/platforms/live-post-clients-live.ts";
import { PlatformClientsLive } from "#publishing/infrastructure/platforms/platform-clients-live.ts";
import { PlatformLookupsLive } from "#publishing/infrastructure/platforms/platform-lookups-live.ts";
import { PlatformRepostsLive } from "#publishing/infrastructure/platforms/platform-reposts-live.ts";
import { TikTokCreatorsLive } from "#publishing/infrastructure/platforms/tiktok/tiktok-creators.ts";
import { ShortLinksLinkShortener } from "#publishing/infrastructure/shortlinks-link-shortener.ts";
import { ShortLinksShortLinkDefaults } from "#publishing/infrastructure/shortlinks-short-link-defaults.ts";
import { SqlPostAttentionReads } from "#publishing/infrastructure/sql-post-attention-reads.ts";
import { ToldLivePostEvents } from "#publishing/infrastructure/told-live-post-events.ts";
import { limitedUploads } from "#publishing/infrastructure/upload-slots.ts";
import {
  webhookOutcomes,
  WebhookPostEvents,
} from "#publishing/infrastructure/webhook-post-events.ts";
import { WorkflowFollowUpJobs } from "#publishing/infrastructure/workflow-follow-up-jobs.ts";
import { WorkflowLivePostJobs } from "#publishing/infrastructure/workflow-live-post-jobs.ts";
import { WorkflowPublicationScheduler } from "#publishing/infrastructure/workflow-publication-scheduler.ts";
import { ChangeLivePostV1Live } from "#publishing/infrastructure/workflows/change-live-post.ts";
import { PublishTargetV2Live } from "#publishing/infrastructure/workflows/publish-parts.ts";
import { PublishPostV1Live } from "#publishing/infrastructure/workflows/publish-post.ts";
import { PublishTargetV1Live } from "#publishing/infrastructure/workflows/publish-target.ts";
import { SendFollowUpV1Live } from "#publishing/infrastructure/workflows/send-follow-up.ts";
import { WorkspaceRecyclingActors } from "#publishing/infrastructure/workspace-recycling-actors.ts";
import { XThreadsLive } from "#publishing/infrastructure/x-threads.ts";
import { OutboundGuard } from "#shared/infrastructure/platforms/outbound-guard.ts";

// The use cases over their adapters, asking whatever ApprovalGate they are
// given before a post is scheduled.
// What changes of live posts need beside publishing's own adapters: what
// holds a post (a boost), who hears how a change ended, and the channels'
// credentials, which say whether a channel can be used.
type LiveServices = LivePostEvents | LivePostHolds | PlatformCredentials;

// What recycling rules need beside publishing's own adapters: who a rule's
// starter is now, and who hears that a rule ended.
type RecyclingServices = RecyclingActors | RecyclingNotices;

// What feeds need beside publishing's own adapters: what reads them, who
// hears that one stopped, and what brings an item's picture in.
type FeedServices = FeedNotices | FeedPictures | FeedSource;

// What follow-up rules need beside publishing's own adapters: what each
// channel can carry, the likes analytics counted, and who hears what a
// rule did not do.
type FollowUpServices = FollowUpChannels | FollowUpCounts | FollowUpNotices;

/**
 * For tests that count nothing: every channel carries what its platform
 * supports, no post has likes, and nobody hears.
 */
export const FollowUpsUnused = Layer.mergeAll(
  FollowUpChannels.supported,
  FollowUpCounts.none,
  FollowUpNotices.none
);

/**
 * For tests that read no feed: every host is out of reach, nobody hears
 * that a feed stopped, and no picture is ever had.
 */
export const FeedsUnused = Layer.mergeAll(
  FeedSource.none,
  FeedNotices.none,
  FeedPictures.none
);

/**
 * For tests that make no occurrence: every starter is gone, and nobody
 * hears that a rule ended.
 */
export const RecyclingUnused = Layer.merge(
  RecyclingActors.none,
  RecyclingNotices.none
);

/**
 * For tests that change no live post: nothing holds a post, nobody hears,
 * and no channel can be used, so every change is refused
 * `channelUnavailable`.
 */
export const LivePostsUnused = Layer.mergeAll(
  LivePostEvents.none,
  LivePostHolds.none,
  PlatformCredentials.unusable
);

const publishingOver = <E, R, E2, R2, E3, R3, H, R4, R5, R6, E7, R7, E8, R8>(
  references: Layer.Layer<
    AttachableMedia | PostAllowance | ShortLinkDefaults | WorkspaceChannels,
    E,
    R
  >,
  accounts: Layer.Layer<AccountRules, E2, R2>,
  origins: Layer.Layer<PostOrigins, E3, R3>,
  events: Layer.Layer<PostEvents | H, never, R4>,
  live: Layer.Layer<LiveServices, never, R5>,
  recycling: Layer.Layer<RecyclingServices, never, R6>,
  feeds: Layer.Layer<FeedServices, E7, R7>,
  followUps: Layer.Layer<FollowUpServices, E8, R8>
) =>
  Layer.mergeAll(
    FollowUpRules.layer.pipe(Layer.provideMerge(FollowUps.layer)),
    Layer.mergeAll(PostBatches.layer, Recycling.layer, Feeds.layer).pipe(
      Layer.provideMerge(
        Layer.mergeAll(PostChecks.layer, PostScheduling.layer, PostDrafts.layer)
      )
    ),
    PostOutcomesLive,
    PostQueries.layer,
    PostRecords.layer,
    PostSearch.layer,
    PostTags.layer,
    Signatures.layer,
    ChannelSets.layer,
    Queues.layer,
    ChannelDefaults.layer,
    HeldPosts.layer,
    PostFollowUp.layer,
    PostUsage.layer,
    LivePostChanges.layer,
    LiveTargetParts.layer
  ).pipe(
    Layer.provideMerge(PostPresets.layer),
    Layer.provideMerge(
      Layer.mergeAll(
        DrizzleChannelDefaultsStore,
        DrizzleChannelSetStore,
        DrizzleContentFingerprints,
        DrizzleFeedReads,
        DrizzleFeedStore,
        DrizzleFollowUpStore,
        DrizzleIdempotencyKeys,
        DrizzleLivePostChangeStore,
        DrizzlePostOversight,
        DrizzlePostRepository,
        DrizzlePublicationJournal,
        DrizzlePublishedTargets,
        DrizzleQueueStore,
        DrizzleRecyclingStore,
        DrizzleSignatureStore,
        DrizzleTagStore,
        DrizzleWorkspacePostStore,
        LoggedChannelHealth,
        LoggedOperatorAlerts,
        WorkflowPublicationScheduler,
        WorkflowLivePostJobs,
        WorkflowFollowUpJobs,
        live,
        recycling,
        feeds,
        followUps,
        references,
        accounts,
        origins,
        // What is told of a post may name its channels.
        events.pipe(Layer.provide(DrizzlePostRepository))
      )
    )
  );

/**
 * The publishing context's use cases (`PostBatches`, `PostChecks`,
 * `PostDrafts`, `PostOutcomes`, `PostQueries`, `PostSearch`,
 * `PostScheduling`, `PostFollowUp`, `PostTags`, `Signatures`, `ChannelSets`,
 * `Queues`, `ChannelDefaults`, for the handlers, and `PostPresets`, which fills a
 * new post in from them; `HeldPosts`, for the
 * review context; `PostRecords`, for the workspace context's exports and
 * erasures; `PostUsage`, for billing; `PublishedTargets`, which analytics
 * follows; `PostOversight`, for the staff console; in `PublishingLive`,
 * `PostingCapabilities` and `ChannelLookups`, which tell clients what a
 * post may hold) and the adapters behind its ports, with `references` for
 * the channels and media posts refer to, the posts a month allows and the
 * workspaces' short links default,
 * `accounts` for what each account refuses (by default, nothing), `origins`
 * for the names of the keys and applications that write posts (by default,
 * none) and `events` for who hears what happens to posts (by default,
 * nobody). No post waits for an approval here (`ApprovalGate.open`). Needs
 * the database (Drizzle), the workflow engine, a TransactionRunner and Ids,
 * and PublicationOutcomes for PostFollowUp.
 */
export const publishingWith = <
  E,
  R,
  E2 = never,
  R2 = never,
  E3 = never,
  R3 = never,
  R4 = never,
  R5 = never,
  R6 = never,
  R7 = never,
  R8 = never,
>(
  references: Layer.Layer<
    AttachableMedia | PostAllowance | ShortLinkDefaults | WorkspaceChannels,
    E,
    R
  >,
  accounts: Layer.Layer<AccountRules, E2, R2> = AccountRules.none,
  origins: Layer.Layer<PostOrigins, E3, R3> = PostOrigins.unnamed,
  events: Layer.Layer<PostEvents, never, R4> = PostEvents.none,
  live: Layer.Layer<LiveServices, never, R5> = LivePostsUnused,
  recycling: Layer.Layer<RecyclingServices, never, R6> = RecyclingUnused,
  feeds: Layer.Layer<FeedServices, never, R7> = FeedsUnused,
  followUps: Layer.Layer<FollowUpServices, never, R8> = FollowUpsUnused
) =>
  publishingOver(
    references,
    accounts,
    origins,
    events,
    live,
    recycling,
    feeds,
    followUps
  ).pipe(
    Layer.provideMerge(ApprovalGate.open),
    // No platform's posts are billed to warn of here.
    Layer.provide(PostMeter.unmetered)
  );

/**
 * The same behind `gate`, which says which posts wait for an approval, and
 * may bring what a test reads it with; `events` hears what happens to
 * posts, and may bring what a test reads that with too; `live` is what
 * changes of live posts need (by default, nothing can change one).
 */
export const publishingBehind = <
  G,
  E3,
  R3,
  E,
  R,
  H,
  R4,
  R5 = never,
  R6 = never,
  R7 = never,
  R8 = never,
>(
  gate: Layer.Layer<ApprovalGate | G, E3, R3>,
  references: Layer.Layer<
    AttachableMedia | PostAllowance | ShortLinkDefaults | WorkspaceChannels,
    E,
    R
  >,
  events: Layer.Layer<PostEvents | H, never, R4>,
  live: Layer.Layer<LiveServices, never, R5> = LivePostsUnused,
  recycling: Layer.Layer<RecyclingServices, never, R6> = RecyclingUnused,
  feeds: Layer.Layer<FeedServices, never, R7> = FeedsUnused,
  followUps: Layer.Layer<FollowUpServices, never, R8> = FollowUpsUnused
) =>
  publishingOver(
    references,
    AccountRules.none,
    PostOrigins.unnamed,
    events,
    live,
    recycling,
    feeds,
    followUps
  ).pipe(Layer.provideMerge(gate), Layer.provide(PostMeter.unmetered));

/**
 * The use cases as the server runs them: channels are those the channels
 * context lists, media the ready media its library holds, and the posts a
 * month allows the workspace's plan, which the composition root provides
 * (ListChannels, MediaLibrary, WorkspaceEntitlements), a new post that does
 * not say takes the workspace's short links default as the shortlinks
 * context keeps it (ShortLinkSettings), and a post names the
 * key or application that wrote it as the workspace context does
 * (CredentialNames). How each target ends
 * is told through the notifications context (Notify), naming channels as
 * the channels context has them (ChannelRepository), once billing counted
 * the posts that went out (RecordedUsage), and those on platforms that bill
 * per post (MeteredPosts),
 * and the workspace's webhook endpoints hear what happens to its posts
 * (WebhookEvents). Which posts wait for an approval is the ApprovalGate's
 * say, which the composition root provides from the review context.
 */
// The platforms' lookups as the server paces them, one pace and one memory
// of answers for all who ask: the lookups members run, and the standing a
// channel's description reads.
const PacedLookupsLive = pacedLookups(
  PlatformLookupsLive.pipe(Layer.provide(ChannelAccessCredentials))
).pipe(Layer.provide(DrizzlePlatformQuota));

// What follow-up rules read on the server: what a channel can carry, from
// its grants, the operator's threads and analytics' coverage, and the
// likes analytics counted (PostLikes, from the composition root); and the
// notices that tell what a rule did not do.
const FollowUpServicesLive = Layer.mergeAll(
  FollowUpChannels.layer.pipe(
    Layer.provide(
      Layer.mergeAll(
        ChannelAccessGrants,
        AnalyticsCountedPlatforms,
        XThreadsLive
      )
    )
  ),
  AnalyticsFollowUpCounts,
  NotifiedFollowUpNotices
);

// The follow-ups that arm a target as it is published, beside the use
// cases' own: the same adapters, for the outcomes publishing tells.
const ArmingFollowUpsLive = FollowUps.layer.pipe(
  Layer.provide(
    Layer.mergeAll(
      DrizzleFollowUpStore,
      DrizzlePostRepository,
      ChannelAccessCredentials,
      WorkspaceRecyclingActors,
      WorkflowFollowUpJobs,
      FollowUpServicesLive
    )
  )
);

export const PublishingLive = publishingOver(
  Layer.mergeAll(
    ListedWorkspaceChannels,
    LibraryAttachableMedia,
    PlanPostAllowanceLive,
    ShortLinksShortLinkDefaults
  ),
  AccountRules.layer.pipe(Layer.provide(ChannelAccessGrants)),
  NamedPostOrigins,
  WebhookPostEvents,
  // Changes of live posts: the channels context says whether a channel
  // can be used, the ads context which posts a boost shows, and the
  // webhooks, analytics and the inbox hear how a change ended.
  Layer.mergeAll(
    ChannelAccessCredentials,
    AdsLivePostHolds,
    ToldLivePostEvents
  ),
  // Recycling rules: the workspace context says who a starter is now, and
  // the notices tell that a rule ended.
  Layer.merge(WorkspaceRecyclingActors, NotifiedRecyclingNotices),
  // Feeds: read over the guarded public client, the notices tell that one
  // stopped, and the media context's import brings an item's picture in.
  Layer.mergeAll(
    HttpFeedSource.pipe(
      Layer.provide(OutboundGuard.layer),
      Layer.provide(Layer.merge(FetchHttpClient.layer, Digest.layerWebCrypto))
    ),
    NotifiedFeedNotices,
    LibraryFeedPictures
  ),
  // Follow-up rules: what a channel can carry, and the likes analytics
  // counted.
  FollowUpServicesLive
).pipe(
  // The operator's X_THREADS, which scheduling reads.
  Layer.provide(XThreadsLive),
  Layer.provideMerge(
    TikTokCreatorInfo.layer.pipe(Layer.provide(ListedWorkspaceChannels))
  ),
  Layer.provideMerge(
    Layer.mergeAll(
      PostingCapabilities.layer.pipe(
        Layer.provide(
          Layer.mergeAll(
            AccountStandings.layer.pipe(
              Layer.provide(Layer.merge(PacedLookupsLive, ChannelAccessGrants))
            ),
            AnalyticsCountedPlatforms,
            XThreadsLive
          )
        )
      ),
      ChannelLookups.layer.pipe(Layer.provide(PacedLookupsLive))
    ).pipe(
      Layer.provide(
        Layer.merge(ListedWorkspaceChannels, ListedChannelConnections)
      )
    )
  ),
  Layer.provideMerge(
    TikTokCreatorsLive.pipe(Layer.provide(ChannelAccessCredentials))
  ),
  Layer.provideMerge(
    webhookOutcomes(
      meteredOutcomes(
        armedOutcomes(NotifiedPublicationOutcomes).pipe(
          Layer.provide(ArmingFollowUpsLive)
        )
      )
    ).pipe(Layer.provide(DrizzlePostRepository))
  ),
  // Scheduling warns of X's posts the billing account cannot pay for.
  Layer.provide(MeteredXPostsLive)
);

/**
 * Which posts show a media asset, for the media context to ask before it
 * deletes one (MediaInPosts). Needs the database (Drizzle) and a
 * TransactionRunner.
 */
export const MediaInPostsLive = MediaInPosts.layer.pipe(
  Layer.provide(DrizzlePostRepository)
);

/**
 * The posts of several workspaces at once, counted and by time, for the
 * view across a person's workspaces (PostAttention). Needs the database
 * (Drizzle).
 */
export const PostAttentionLive = PostAttention.layer.pipe(
  Layer.provide(SqlPostAttentionReads)
);

// The posts endpoints. They need the use cases PublishingLive provides, and
// the Authentication and WorkspaceAccess middleware of the workspace context,
// which the composition root brings.
export { PostsHandlers as PostsApiLive } from "#publishing/api/posts.ts";

// The workspace's signatures and channel sets, behind the same middleware.
export { SignaturesHandlers as SignaturesApiLive } from "#publishing/api/signatures.ts";

export { ChannelSetsHandlers as ChannelSetsApiLive } from "#publishing/api/channel-sets.ts";

export { QueuesHandlers as QueuesApiLive } from "#publishing/api/queues.ts";

export { RecyclingHandlers as RecyclingApiLive } from "#publishing/api/recycling.ts";

export { FollowUpsHandlers as FollowUpsApiLive } from "#publishing/api/follow-ups.ts";

export { FeedsHandlers as FeedsApiLive } from "#publishing/api/feeds.ts";

export { ChannelDefaultsHandlers as ChannelDefaultsApiLive } from "#publishing/api/channel-defaults.ts";

// The workspace's tags, behind the same middleware.
export { TagsHandlers as TagsApiLive } from "#publishing/api/tags.ts";

// TikTok's creator info for the composer, behind the same middleware.
export { TikTokHandlers as TikTokApiLive } from "#publishing/api/tiktok.ts";

// What a post may hold on each platform and channel, and the lookups that
// answer the values its options take, behind the same middleware.
export { CapabilitiesHandlers as CapabilitiesApiLive } from "#publishing/api/capabilities.ts";

export { LookupsHandlers as LookupsApiLive } from "#publishing/api/lookups.ts";

// What the gates read analytics' counts with (MetricsReader): the readers
// the composition root brings, or none.
type GateReaders<E, R> = Layer.Layer<Layer.Success<typeof UnreadMetrics>, E, R>;

// What the gates read comments and answer them with (CommentSource,
// ReplySender): engagement's platforms, or none.
type GateEngagement<E, R> = Layer.Layer<
  Layer.Success<typeof UnreadComments>,
  E,
  R
>;

/**
 * Registers the publishing workflows and the channel gates, which call the
 * platforms through `platforms`, and read counts for analytics with
 * `readers` (by default, none), and comments for engagement with
 * `engagement` (by default, none). Needs the cluster and what
 * PublishingLive provides, PublicationOutcomes included.
 */
export const publishingWorkers = <
  E,
  R,
  E2 = never,
  R2 = never,
  E3 = never,
  R3 = never,
  E4 = never,
  R4 = never,
  E5 = never,
  R5 = never,
>(
  platforms: Layer.Layer<PlatformPublisher, E, R>,
  readers: GateReaders<E2, R2> = UnreadMetrics,
  engagement: GateEngagement<E3, R3> = UnreadComments,
  live: Layer.Layer<LivePostClients, E4, R4> = LivePostClients.none,
  followUps: Layer.Layer<FollowUpPublisher, E5, R5> = FollowUpPublisher.none
) =>
  Layer.mergeAll(
    PublishPostV1Live,
    PublishTargetV1Live,
    PublishTargetV2Live
  ).pipe(
    Layer.provide(GatedPlatformPublisher),
    Layer.merge(ChangeLivePostV1Live.pipe(Layer.provide(GatedLivePostClients))),
    Layer.merge(
      SendFollowUpV1Live.pipe(
        Layer.provide(SendFollowUp.layer),
        Layer.provide(GatedFollowUpPublisher)
      )
    ),
    Layer.merge(
      ChannelGateLive.pipe(
        Layer.provide(
          Layer.mergeAll(platforms, readers, engagement, live, followUps)
        )
      )
    )
  );

/**
 * The platforms the gates publish to, Mastodon, Bluesky, LinkedIn, X,
 * Threads, Instagram, Facebook Pages, TikTok, YouTube and Pinterest, with
 * the tokens
 * the channels context hands out (ChannelAccess) and the files the media
 * context does (MediaForPlatforms), the large ones a few at a time
 * (`limitedUploads`), and the short links the shortlinks context issues
 * (ShortLinks, ShortLinkBase), and X's posts claimed on billing's meters
 * (MeteredUsage, XPassThrough), which the composition root provides with
 * Dns, the database and the PostRepository.
 */
export const PlatformsLive = RoutedPlatformPublisher.pipe(
  // The operator's X_THREADS: a part already scheduled is not sent either.
  Layer.provide(XThreadsLive),
  // X's posts, claimed on the billing account's meter at X's rates.
  Layer.provide(MeteredXPostsLive),
  Layer.provide(ShortLinksLinkShortener),
  Layer.provide(PlatformClientsLive),
  Layer.provide(
    Layer.mergeAll(
      ChannelAccessCredentials,
      limitedUploads.pipe(Layer.provide(LibraryMediaForPublishing)),
      DrizzlePublicationProgress,
      DrizzleUploadSessions,
      DrizzlePlatformQuota,
      DrizzleRecordedPosts
    )
  ),
  Layer.provide(OutboundGuard.layer),
  Layer.provide(
    Layer.mergeAll(
      FetchHttpClient.layer,
      Mac.layerWebCrypto,
      Digest.layerWebCrypto
    ).pipe(Layer.provideMerge(SecureRandom.layerWebCrypto))
  )
);

/**
 * What the gates carry follow-ups out with: comments through the same
 * platform clients a post's parts go through, reposts through the
 * platforms' repost clients, X's comments claimed on billing's meters, as
 * PlatformsLive's are.
 */
export const FollowUpPlatformsLive = RoutedFollowUpPublisher.pipe(
  Layer.provide(XThreadsLive),
  Layer.provide(MeteredXPostsLive),
  Layer.provide(Layer.merge(PlatformClientsLive, PlatformRepostsLive)),
  Layer.provide(
    Layer.mergeAll(
      ChannelAccessCredentials,
      limitedUploads.pipe(Layer.provide(LibraryMediaForPublishing)),
      DrizzlePublicationProgress,
      DrizzleUploadSessions,
      DrizzlePlatformQuota,
      DrizzleRecordedPosts,
      DrizzleFollowUpStore
    )
  ),
  Layer.provide(OutboundGuard.layer),
  Layer.provide(
    Layer.mergeAll(
      FetchHttpClient.layer,
      Mac.layerWebCrypto,
      Digest.layerWebCrypto
    ).pipe(Layer.provideMerge(SecureRandom.layerWebCrypto))
  )
);

/**
 * The workers as the server runs them, publishing to the platforms, with
 * the readers analytics' counts come from (MetricsReader), which the
 * composition root provides.
 */
export const publishingWorkersReading = <E, R, E2, R2>(
  readers: GateReaders<E, R>,
  engagement: GateEngagement<E2, R2>
) =>
  publishingWorkers(
    PlatformsLive,
    readers,
    engagement,
    // What deletes the posts members unpublish, and edits those they
    // edit, with the channels' tokens and the edits' texts.
    LivePostClientsLive.pipe(
      Layer.provide(Layer.merge(ChannelAccessCredentials, LivePostEdits.layer))
    ),
    FollowUpPlatformsLive
  );

/**
 * The server's ledger of the platforms' daily quotas, in Postgres: for
 * engagement's reads of YouTube's comments, which share the project's
 * day with publishing. Needs the database (Drizzle).
 */
export { DrizzlePlatformQuota as PlatformQuotaLive } from "#publishing/infrastructure/drizzle-platform-quota.ts";

/**
 * The MetricsReader that sends each read through its channel's gate, for
 * analytics' collection.
 */
export { GatedMetricsReader } from "#publishing/infrastructure/channel-gate.ts";

/**
 * The CommentSource and ReplySender, the ReviewSource and
 * ReviewReplySender (GatedReviews), and the MessageSource and
 * MessageSender (GatedMessages), that send each call through its
 * channel's gate, for engagement.
 */
export {
  GatedCommentSource,
  GatedReplySender,
  GatedMessages,
  GatedReviews,
  UnreadComments,
} from "#publishing/infrastructure/channel-gate.ts";

/**
 * The idempotency keys' daily retention, the recycling rules'
 * occurrences and the feeds' reads every ten minutes. Needs
 * PostScheduling, Recycling and Feeds.
 */
export const PublishingCronsLive = Layer.mergeAll(
  IdempotencyRetentionCron,
  RecyclingCron,
  FollowUpsCron,
  FeedsCron,
  QuotaRetentionCron.pipe(Layer.provide(DrizzlePlatformQuota))
);
