import { Layer } from "effect";
import { Digest, Mac, SecureRandom } from "effect/crypto";
import { FetchHttpClient } from "effect/http";

import { AccountRules } from "#publishing/application/account-rules.ts";
import { AccountStandings } from "#publishing/application/account-standings.ts";
import { ApprovalGate } from "#publishing/application/approval-gate.ts";
import type { AttachableMedia } from "#publishing/application/attachable-media.ts";
import { ChannelLookups } from "#publishing/application/channel-lookups.ts";
import { HeldPosts } from "#publishing/application/held-posts.ts";
import { MediaInPosts } from "#publishing/application/media-in-posts.ts";
import { pacedLookups } from "#publishing/application/paced-lookups.ts";
import type { PlatformPublisher } from "#publishing/application/platform-publisher.ts";
import type { PostAllowance } from "#publishing/application/post-allowance.ts";
import { PostDrafts } from "#publishing/application/post-drafts.ts";
import { PostEvents } from "#publishing/application/post-events.ts";
import { PostFollowUp } from "#publishing/application/post-follow-up.ts";
import { PostOrigins } from "#publishing/application/post-origins.ts";
import { PostQueries } from "#publishing/application/post-queries.ts";
import { PostRecords } from "#publishing/application/post-records.ts";
import { PostScheduling } from "#publishing/application/post-scheduling.ts";
import { PostUsage } from "#publishing/application/post-usage.ts";
import { PostingCapabilities } from "#publishing/application/posting-capabilities.ts";
import { RoutedPlatformPublisher } from "#publishing/application/routed-platform-publisher.ts";
import { TikTokCreatorInfo } from "#publishing/application/tiktok-creator-info.ts";
import type { WorkspaceChannels } from "#publishing/application/workspace-channels.ts";
import { AnalyticsCountedPlatforms } from "#publishing/infrastructure/analytics-counted-platforms.ts";
import { ChannelAccessCredentials } from "#publishing/infrastructure/channel-access-credentials.ts";
import {
  ChannelGateLive,
  GatedPlatformPublisher,
  UnreadComments,
  UnreadMetrics,
} from "#publishing/infrastructure/channel-gate.ts";
import { DrizzleIdempotencyKeys } from "#publishing/infrastructure/drizzle-idempotency-keys.ts";
import { DrizzlePlatformQuota } from "#publishing/infrastructure/drizzle-platform-quota.ts";
import { DrizzlePostOversight } from "#publishing/infrastructure/drizzle-post-oversight.ts";
import { DrizzlePostRepository } from "#publishing/infrastructure/drizzle-post-repository.ts";
import { DrizzlePublicationJournal } from "#publishing/infrastructure/drizzle-publication-journal.ts";
import { DrizzlePublicationProgress } from "#publishing/infrastructure/drizzle-publication-progress.ts";
import { DrizzlePublishedTargets } from "#publishing/infrastructure/drizzle-published-targets.ts";
import { DrizzleRecordedPosts } from "#publishing/infrastructure/drizzle-recorded-posts.ts";
import { DrizzleUploadSessions } from "#publishing/infrastructure/drizzle-upload-sessions.ts";
import { DrizzleWorkspacePostStore } from "#publishing/infrastructure/drizzle-workspace-post-store.ts";
import { LibraryAttachableMedia } from "#publishing/infrastructure/library-attachable-media.ts";
import { LibraryMediaForPublishing } from "#publishing/infrastructure/library-media-for-publishing.ts";
import { ListedChannelConnections } from "#publishing/infrastructure/listed-channel-connections.ts";
import { ListedWorkspaceChannels } from "#publishing/infrastructure/listed-workspace-channels.ts";
import { LoggedChannelHealth } from "#publishing/infrastructure/logged-channel-health.ts";
import { LoggedOperatorAlerts } from "#publishing/infrastructure/logged-operator-alerts.ts";
import { meteredOutcomes } from "#publishing/infrastructure/metered-publication-outcomes.ts";
import { NamedPostOrigins } from "#publishing/infrastructure/named-post-origins.ts";
import { NotifiedPublicationOutcomes } from "#publishing/infrastructure/notified-publication-outcomes.ts";
import { PlanPostAllowanceLive } from "#publishing/infrastructure/plan-post-allowance.ts";
import { PlatformClientsLive } from "#publishing/infrastructure/platforms/platform-clients-live.ts";
import { PlatformLookupsLive } from "#publishing/infrastructure/platforms/platform-lookups-live.ts";
import { TikTokCreatorsLive } from "#publishing/infrastructure/platforms/tiktok/tiktok-creators.ts";
import { limitedUploads } from "#publishing/infrastructure/upload-slots.ts";
import {
  webhookOutcomes,
  WebhookPostEvents,
} from "#publishing/infrastructure/webhook-post-events.ts";
import { WorkflowPublicationScheduler } from "#publishing/infrastructure/workflow-publication-scheduler.ts";
import { PublishPostV1Live } from "#publishing/infrastructure/workflows/publish-post.ts";
import { PublishTargetV1Live } from "#publishing/infrastructure/workflows/publish-target.ts";
import { OutboundGuard } from "#shared/infrastructure/platforms/outbound-guard.ts";

// The use cases over their adapters, asking whatever ApprovalGate they are
// given before a post is scheduled.
const publishingOver = <E, R, E2, R2, E3, R3, H, R4>(
  references: Layer.Layer<
    AttachableMedia | PostAllowance | WorkspaceChannels,
    E,
    R
  >,
  accounts: Layer.Layer<AccountRules, E2, R2>,
  origins: Layer.Layer<PostOrigins, E3, R3>,
  events: Layer.Layer<PostEvents | H, never, R4>
) =>
  Layer.mergeAll(
    PostDrafts.layer,
    PostQueries.layer,
    PostRecords.layer,
    PostScheduling.layer,
    HeldPosts.layer,
    PostFollowUp.layer,
    PostUsage.layer
  ).pipe(
    Layer.provideMerge(
      Layer.mergeAll(
        DrizzleIdempotencyKeys,
        DrizzlePostOversight,
        DrizzlePostRepository,
        DrizzlePublicationJournal,
        DrizzlePublishedTargets,
        DrizzleWorkspacePostStore,
        LoggedChannelHealth,
        LoggedOperatorAlerts,
        WorkflowPublicationScheduler,
        references,
        accounts,
        origins,
        events
      )
    )
  );

/**
 * The publishing context's use cases (`PostDrafts`, `PostQueries`,
 * `PostScheduling`, `PostFollowUp`, for the handlers; `HeldPosts`, for the
 * review context; `PostRecords`, for the workspace context's exports and
 * erasures; `PostUsage`, for billing; `PublishedTargets`, which analytics
 * follows; `PostOversight`, for the staff console; in `PublishingLive`,
 * `PostingCapabilities` and `ChannelLookups`, which tell clients what a
 * post may hold) and the adapters behind its ports, with `references` for
 * the channels and media posts refer to and the posts a month allows,
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
>(
  references: Layer.Layer<
    AttachableMedia | PostAllowance | WorkspaceChannels,
    E,
    R
  >,
  accounts: Layer.Layer<AccountRules, E2, R2> = AccountRules.none,
  origins: Layer.Layer<PostOrigins, E3, R3> = PostOrigins.unnamed,
  events: Layer.Layer<PostEvents, never, R4> = PostEvents.none
) =>
  publishingOver(references, accounts, origins, events).pipe(
    Layer.provideMerge(ApprovalGate.open)
  );

/**
 * The same behind `gate`, which says which posts wait for an approval, and
 * may bring what a test reads it with; `events` hears what happens to
 * posts, and may bring what a test reads that with too.
 */
export const publishingBehind = <G, E3, R3, E, R, H, R4>(
  gate: Layer.Layer<ApprovalGate | G, E3, R3>,
  references: Layer.Layer<
    AttachableMedia | PostAllowance | WorkspaceChannels,
    E,
    R
  >,
  events: Layer.Layer<PostEvents | H, never, R4>
) =>
  publishingOver(
    references,
    AccountRules.none,
    PostOrigins.unnamed,
    events
  ).pipe(Layer.provideMerge(gate));

/**
 * The use cases as the server runs them: channels are those the channels
 * context lists, media the ready media its library holds, and the posts a
 * month allows the workspace's plan, which the composition root provides
 * (ListChannels, MediaLibrary, WorkspaceEntitlements), and a post names the
 * key or application that wrote it as the workspace context does
 * (CredentialNames). How each target ends
 * is told through the notifications context (Notify), naming channels as
 * the channels context has them (ChannelRepository), once billing counted
 * the posts that went out on platforms that bill per post (MeteredPosts),
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

export const PublishingLive = publishingOver(
  Layer.mergeAll(
    ListedWorkspaceChannels,
    LibraryAttachableMedia,
    PlanPostAllowanceLive
  ),
  AccountRules.layer,
  NamedPostOrigins,
  WebhookPostEvents
).pipe(
  Layer.provideMerge(
    TikTokCreatorInfo.layer.pipe(Layer.provide(ListedWorkspaceChannels))
  ),
  Layer.provideMerge(
    Layer.mergeAll(
      PostingCapabilities.layer.pipe(
        Layer.provide(
          Layer.mergeAll(
            AccountStandings.layer.pipe(Layer.provide(PacedLookupsLive)),
            AnalyticsCountedPlatforms
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
    webhookOutcomes(meteredOutcomes(NotifiedPublicationOutcomes)).pipe(
      Layer.provide(DrizzlePostRepository)
    )
  )
);

/**
 * Which posts show a media asset, for the media context to ask before it
 * deletes one (MediaInPosts). Needs the database (Drizzle) and a
 * TransactionRunner.
 */
export const MediaInPostsLive = MediaInPosts.layer.pipe(
  Layer.provide(DrizzlePostRepository)
);

// The posts endpoints. They need the use cases PublishingLive provides, and
// the Authentication and WorkspaceAccess middleware of the workspace context,
// which the composition root brings.
export { PostsHandlers as PostsApiLive } from "#publishing/api/posts.ts";

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
>(
  platforms: Layer.Layer<PlatformPublisher, E, R>,
  readers: GateReaders<E2, R2> = UnreadMetrics,
  engagement: GateEngagement<E3, R3> = UnreadComments
) =>
  Layer.mergeAll(PublishPostV1Live, PublishTargetV1Live).pipe(
    Layer.provide(GatedPlatformPublisher),
    Layer.merge(
      ChannelGateLive.pipe(
        Layer.provide(Layer.mergeAll(platforms, readers, engagement))
      )
    )
  );

/**
 * The platforms the gates publish to, Mastodon, Bluesky, LinkedIn, X,
 * Threads, Instagram, Facebook Pages, TikTok, YouTube and Pinterest, with
 * the tokens
 * the channels context hands out (ChannelAccess) and the files the media
 * context does (MediaForPlatforms), the large ones a few at a time
 * (`limitedUploads`), which the composition root provides
 * with Dns, the database and the PostRepository.
 */
export const PlatformsLive = RoutedPlatformPublisher.pipe(
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
 * The workers as the server runs them, publishing to the platforms, with
 * the readers analytics' counts come from (MetricsReader), which the
 * composition root provides.
 */
export const publishingWorkersReading = <E, R, E2, R2>(
  readers: GateReaders<E, R>,
  engagement: GateEngagement<E2, R2>
) => publishingWorkers(PlatformsLive, readers, engagement);

/**
 * The MetricsReader that sends each read through its channel's gate, for
 * analytics' collection.
 */
export { GatedMetricsReader } from "#publishing/infrastructure/channel-gate.ts";

/**
 * The CommentSource and ReplySender that send each call through its
 * channel's gate, for engagement.
 */
export {
  GatedCommentSource,
  GatedReplySender,
  UnreadComments,
} from "#publishing/infrastructure/channel-gate.ts";

/** The idempotency keys' daily retention. Needs PostScheduling. */
export { IdempotencyRetentionCron as PublishingCronsLive } from "#publishing/infrastructure/crons.ts";
