import { Layer } from "effect";

import { CollectComments } from "#engagement/application/collect-comments.ts";
import { EngagementInbox } from "#engagement/application/engagement-inbox.ts";
import { EngagementReplies } from "#engagement/application/engagement-replies.ts";
import type { CommentSource } from "#engagement/application/ports/comment-source.ts";
import type { ReplySender } from "#engagement/application/ports/reply-sender.ts";
import { PurgeEngagement } from "#engagement/application/purge-engagement.ts";
import { SendReply } from "#engagement/application/send-reply.ts";
import { AccessEngagementChannels } from "#engagement/infrastructure/access-engagement-channels.ts";
import { CommentsPaceLive } from "#engagement/infrastructure/collection-pace.ts";
import { DrizzleEngagementRecords } from "#engagement/infrastructure/drizzle-engagement-records.ts";
import { DrizzleEngagementStore } from "#engagement/infrastructure/drizzle-engagement-store.ts";
import { PublishingFollowedPosts } from "#engagement/infrastructure/publishing-followed-posts.ts";
import { PublishingReplyLimits } from "#engagement/infrastructure/publishing-reply-limits.ts";
import { ToldEngagementOutcomes } from "#engagement/infrastructure/told-engagement-outcomes.ts";
import { WorkflowReplyJobs } from "#engagement/infrastructure/workflow-reply-jobs.ts";
import { InboxPlatformsLive } from "#shared/infrastructure/inbox-platforms.ts";

export { EngagementInbox } from "#engagement/application/engagement-inbox.ts";

export { EngagementReplies } from "#engagement/application/engagement-replies.ts";

/**
 * The engagement context's use cases on `adapters`, which provide its
 * ports: the threads for members (EngagementInbox), what they do about
 * comments (EngagementReplies), the collection and the retention for the
 * crons (CollectComments, PurgeEngagement), and the sending of a reply for
 * its job (SendReply). Needs a TransactionRunner and Ids.
 */
export const engagementWith = <ROut, E, R>(adapters: Layer.Layer<ROut, E, R>) =>
  Layer.mergeAll(
    EngagementInbox.layer,
    EngagementReplies.layer,
    CollectComments.layer,
    PurgeEngagement.layer,
    SendReply.layer
  ).pipe(Layer.provideMerge(adapters));

/**
 * The engagement context as the server runs it: threads, comments and the
 * reply journal in Postgres, the posts publishing lists, the channels of
 * the channels context, publishing's text limits, replies sent by
 * SendReplyV1, and the workspace told through notices and webhooks; with
 * EngagementRecords, for the workspace context's exports and erasures.
 * `gated` reads comments and acts through the channels' gates
 * (GatedCommentSource, GatedReplySender). Needs the database, a
 * TransactionRunner, Ids, the workflow engine, ChannelAccess,
 * PublishedTargets, Notify and WebhookEvents, which the composition root
 * provides.
 */
export const engagementLive = <E, R>(
  gated: Layer.Layer<CommentSource | ReplySender, E, R>
) =>
  Layer.merge(
    engagementWith(
      Layer.mergeAll(
        DrizzleEngagementStore,
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
      Layer.provide(InboxPlatformsLive)
    ),
    DrizzleEngagementRecords
  );

// The inbox endpoints. They need the use cases the context provides, and
// the Authentication and WorkspaceAccess middleware of the workspace
// context, which the composition root brings.
export { InboxHandlers as InboxApiLive } from "#engagement/api/inbox.ts";

/** EngagementRecords alone, for the workspace context's exports and erasures. */
export { DrizzleEngagementRecords as EngagementRecordsLive } from "#engagement/infrastructure/drizzle-engagement-records.ts";

/**
 * The platforms' comments, as the channels' gates run them. Needs the
 * EngagementStore, ChannelAccess and Dns.
 */
export { PlatformEngagementLive } from "#engagement/infrastructure/platforms/platform-engagement.ts";

/** Registers the workflow that sends replies. Needs SendReply. */
export { SendReplyV1Live as EngagementWorkersLive } from "#engagement/infrastructure/workflows/send-reply.ts";

/** The comments collection, every ten minutes, and the daily retention. */
export { EngagementCronsLive } from "#engagement/infrastructure/crons.ts";
