import { Layer } from "effect";

import { CollectComments } from "#engagement/application/collect-comments.ts";
import { CollectMessages } from "#engagement/application/collect-messages.ts";
import { CollectReviews } from "#engagement/application/collect-reviews.ts";
import { EngagementInbox } from "#engagement/application/engagement-inbox.ts";
import { EngagementMessages } from "#engagement/application/engagement-messages.ts";
import { EngagementReplies } from "#engagement/application/engagement-replies.ts";
import { EngagementReviews } from "#engagement/application/engagement-reviews.ts";
import { InboxWaiting } from "#engagement/application/inbox-waiting.ts";
import type { CommentSource } from "#engagement/application/ports/comment-source.ts";
import type { MessageSender } from "#engagement/application/ports/message-sender.ts";
import type { MessageSource } from "#engagement/application/ports/message-source.ts";
import type { ReplySender } from "#engagement/application/ports/reply-sender.ts";
import type { ReviewReplySender } from "#engagement/application/ports/review-reply-sender.ts";
import type { ReviewSource } from "#engagement/application/ports/review-source.ts";
import { PurgeEngagement } from "#engagement/application/purge-engagement.ts";
import { PurgeMessages } from "#engagement/application/purge-messages.ts";
import { PurgeReviews } from "#engagement/application/purge-reviews.ts";
import { SendMessage } from "#engagement/application/send-message.ts";
import { SendReply } from "#engagement/application/send-reply.ts";
import { SendReviewReply } from "#engagement/application/send-review-reply.ts";
import { AccessEngagementChannels } from "#engagement/infrastructure/access-engagement-channels.ts";
import { ChannelsMessageChannels } from "#engagement/infrastructure/channels-message-channels.ts";
import { ChannelsReviewLocations } from "#engagement/infrastructure/channels-review-locations.ts";
import { CommentsPaceLive } from "#engagement/infrastructure/collection-pace.ts";
import { DrizzleEngagementRecords } from "#engagement/infrastructure/drizzle-engagement-records.ts";
import { DrizzleEngagementStore } from "#engagement/infrastructure/drizzle-engagement-store.ts";
import { DrizzleInboxWaitingReads } from "#engagement/infrastructure/drizzle-inbox-waiting-reads.ts";
import { DrizzleMessageStore } from "#engagement/infrastructure/drizzle-message-store.ts";
import { DrizzleReviewStore } from "#engagement/infrastructure/drizzle-review-store.ts";
import { PublishingFollowedPosts } from "#engagement/infrastructure/publishing-followed-posts.ts";
import { PublishingReplyLimits } from "#engagement/infrastructure/publishing-reply-limits.ts";
import { ToldEngagementOutcomes } from "#engagement/infrastructure/told-engagement-outcomes.ts";
import { ToldMessageOutcomes } from "#engagement/infrastructure/told-message-outcomes.ts";
import { ToldReviewOutcomes } from "#engagement/infrastructure/told-review-outcomes.ts";
import { WorkflowMessageJobs } from "#engagement/infrastructure/workflow-message-jobs.ts";
import { WorkflowReplyJobs } from "#engagement/infrastructure/workflow-reply-jobs.ts";
import { WorkflowReviewReplyJobs } from "#engagement/infrastructure/workflow-review-reply-jobs.ts";
import { SendMessageV1Live } from "#engagement/infrastructure/workflows/send-message.ts";
import { SendReplyV1Live } from "#engagement/infrastructure/workflows/send-reply.ts";
import { SendReviewReplyV1Live } from "#engagement/infrastructure/workflows/send-review-reply.ts";
import { InboxMessagesLive } from "#shared/infrastructure/inbox-messages.ts";
import { InboxPlatformsLive } from "#shared/infrastructure/inbox-platforms.ts";

export { EngagementInbox } from "#engagement/application/engagement-inbox.ts";

export { EngagementMessages } from "#engagement/application/engagement-messages.ts";

export { EngagementReplies } from "#engagement/application/engagement-replies.ts";

export { EngagementReviews } from "#engagement/application/engagement-reviews.ts";

/**
 * The engagement context's use cases on `adapters`, which provide its
 * ports: the threads for members (EngagementInbox), what they do about
 * comments (EngagementReplies), the collection and the retention for the
 * crons (CollectComments, PurgeEngagement), and the sending of a reply for
 * its job (SendReply); and the same for the reviews of locations
 * (EngagementReviews, CollectReviews, PurgeReviews, SendReviewReply), and
 * for direct messages (EngagementMessages, CollectMessages, PurgeMessages,
 * SendMessage). Needs a TransactionRunner and Ids.
 */
export const engagementWith = <ROut, E, R>(adapters: Layer.Layer<ROut, E, R>) =>
  Layer.mergeAll(
    EngagementInbox.layer,
    EngagementReplies.layer,
    CollectComments.layer,
    PurgeEngagement.layer,
    SendReply.layer,
    EngagementReviews.layer,
    CollectReviews.layer.pipe(Layer.provideMerge(SendReviewReply.layer)),
    PurgeReviews.layer,
    EngagementMessages.layer,
    CollectMessages.layer.pipe(Layer.provideMerge(SendMessage.layer)),
    PurgeMessages.layer
  ).pipe(Layer.provideMerge(adapters));

/**
 * The engagement context as the server runs it: threads, comments and the
 * reply journal in Postgres, the posts publishing lists, the channels of
 * the channels context, publishing's text limits, replies sent by
 * SendReplyV1, and the workspace told through notices and webhooks; the
 * reviews of the Google Business Profile channels the channels context
 * lists, their replies sent by SendReviewReplyV1; the direct messages of
 * the channels the channels context lists, on the platforms
 * PEAL_INBOX_MESSAGES names, answered by SendMessageV1; with
 * EngagementRecords, for the workspace context's exports and erasures.
 * `gated` reads comments, reviews and messages and acts through the
 * channels' gates (GatedCommentSource, GatedReplySender, GatedReviews,
 * GatedMessages). Needs the database, a
 * TransactionRunner, Ids, the workflow engine, ChannelAccess,
 * ChannelDirectory, PublishedTargets, Notify and WebhookEvents, which the composition root
 * provides.
 */
export const engagementLive = <E, R>(
  gated: Layer.Layer<
    | CommentSource
    | MessageSender
    | MessageSource
    | ReplySender
    | ReviewReplySender
    | ReviewSource,
    E,
    R
  >
) =>
  Layer.merge(
    engagementWith(
      Layer.mergeAll(
        DrizzleEngagementStore,
        DrizzleReviewStore,
        DrizzleMessageStore,
        ChannelsReviewLocations,
        ChannelsMessageChannels,
        WorkflowMessageJobs,
        ToldMessageOutcomes,
        WorkflowReviewReplyJobs,
        ToldReviewOutcomes,
        PublishingFollowedPosts,
        AccessEngagementChannels,
        PublishingReplyLimits,
        WorkflowReplyJobs,
        ToldEngagementOutcomes,
        gated
      )
    ).pipe(
      Layer.provide(CommentsPaceLive),
      // The operator's PEAL_INBOX_PLATFORMS, which says what a Facebook
      // Page's or an Instagram account's channel can do.
      Layer.provide(InboxPlatformsLive),
      // The operator's PEAL_INBOX_MESSAGES: which platforms' direct
      // messages are read and answered.
      Layer.provide(InboxMessagesLive)
    ),
    DrizzleEngagementRecords
  );

// The inbox endpoints. They need the use cases the context provides, and
// the Authentication and WorkspaceAccess middleware of the workspace
// context, which the composition root brings.
export { InboxHandlers as InboxApiLive } from "#engagement/api/inbox.ts";

// The inbox's reviews endpoints, alike.
export { InboxReviewsHandlers as InboxReviewsApiLive } from "#engagement/api/inbox-reviews.ts";

/** EngagementRecords alone, for the workspace context's exports and erasures. */
export { DrizzleEngagementRecords as EngagementRecordsLive } from "#engagement/infrastructure/drizzle-engagement-records.ts";

/**
 * The platforms' comments, as the channels' gates run them. Needs the
 * EngagementStore, ChannelAccess and Dns.
 */
export { PlatformEngagementLive } from "#engagement/infrastructure/platforms/platform-engagement.ts";

/**
 * Registers the workflows that send replies, to comments and to reviews,
 * and direct messages. Needs SendReply, SendReviewReply and SendMessage.
 */
export const EngagementWorkersLive = Layer.mergeAll(
  SendReplyV1Live,
  SendReviewReplyV1Live,
  SendMessageV1Live
);

/** The comments collection, every ten minutes, and the daily retention. */
export { EngagementCronsLive } from "#engagement/infrastructure/crons.ts";

/**
 * How many threads of several workspaces wait for an answer, for the view
 * across a person's workspaces (InboxWaiting). Needs the database
 * (Drizzle).
 */
export const InboxWaitingLive = InboxWaiting.layer.pipe(
  Layer.provide(DrizzleInboxWaitingReads)
);
