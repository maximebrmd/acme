import { Context, Schema } from "effect";
import type { Effect } from "effect";

import { ChannelUnreadable } from "#engagement/application/channel-unreadable.ts";
import { CommentReadingSchema } from "#engagement/domain/comment.ts";
import { ThreadIdSchema } from "#engagement/domain/thread-id.ts";
import { ChannelIdSchema } from "#shared/domain/ids.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";

/** The threads one call reads at most: it keeps the channel's publishing waiting. */
export const threadsPerRead = 10;

/** The comments one read keeps of a thread; past them it is not `complete`. */
export const commentsPerThread = 500;

/** A thread to read: Peal's id for it, and the platform's for its post. */
export const ThreadToReadSchema = Schema.Struct({
  platformPostId: PlatformPostIdSchema,
  threadId: ThreadIdSchema,
});

export type ThreadToRead = typeof ThreadToReadSchema.Type;

/** Threads of one channel to read. Ids only. */
export const CommentsRequestSchema = Schema.Struct({
  channelId: ChannelIdSchema,
  threads: Schema.Array(ThreadToReadSchema).check(
    Schema.isMaxLength(threadsPerRead)
  ),
});

export type CommentsRequest = typeof CommentsRequestSchema.Type;

/**
 * What reading one thread found: its comments, and whether they are all
 * of them (`complete`: a comment Peal keeps that a complete read no longer
 * finds was deleted on the platform); that the platform no longer shows
 * the post; or that the read failed, and the thread waits.
 */
export const ThreadReadingSchema = Schema.Union([
  Schema.TaggedStruct("read", {
    comments: Schema.Array(CommentReadingSchema),
    complete: Schema.Boolean,
    threadId: ThreadIdSchema,
  }),
  Schema.TaggedStruct("missing", { threadId: ThreadIdSchema }),
  Schema.TaggedStruct("failed", { threadId: ThreadIdSchema }),
]);

export type ThreadReading = typeof ThreadReadingSchema.Type;

/**
 * What a read found, thread by thread. A thread it says nothing about was
 * not read: the platform asked to slow down, which `halted` tells.
 * `refreshWithin` is how long the platform lets Peal keep what it gave
 * without reading it again, absent where only the thread's own retention
 * bounds it: comments not read again within it are forgotten
 * (`PurgeEngagement`). Optional, so a gate of the release before answers
 * a batch this one reads.
 */
export const CommentsBatchSchema = Schema.Struct({
  halted: Schema.Boolean,
  readings: Schema.Array(ThreadReadingSchema),
  refreshWithin: Schema.optionalKey(Schema.Duration),
});

export type CommentsBatch = typeof CommentsBatchSchema.Type;

/** Why nothing was read: the channel, or the platform being down. */
export const CommentsReadFailureSchema = Schema.Union([
  ChannelUnreadable,
  PlatformUnavailable,
]);

export type CommentsReadFailure = typeof CommentsReadFailureSchema.Type;

/**
 * Reads the comments under a channel's posts on its platform. The
 * platforms' readers do it; the collection runs them through the channel's
 * gate, one call at a time with the channel's publishing. Platform events
 * (a comment pushed by the platform) will name threads to read through
 * this same port: what a platform pushes is an id to fetch, never content
 * to trust.
 */
export class CommentSource extends Context.Service<
  CommentSource,
  {
    readonly read: (
      request: CommentsRequest
    ) => Effect.Effect<CommentsBatch, CommentsReadFailure>;
  }
>()("peal-server/engagement/application/CommentSource") {}
