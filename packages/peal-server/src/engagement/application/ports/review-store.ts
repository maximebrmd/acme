import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { ReviewId } from "#engagement/domain/review-id.ts";
import type { ReviewReplyId } from "#engagement/domain/review-reply-id.ts";
import type { ReviewReply } from "#engagement/domain/review-reply.ts";
import type { ReviewThreadId } from "#engagement/domain/review-thread-id.ts";
import type { ReviewThread } from "#engagement/domain/review-thread.ts";
import type { Review } from "#engagement/domain/review.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { ChannelId, WorkspaceId } from "#shared/domain/ids.ts";

/** A location's thread with what its list shows. */
export interface ReviewThreadSummary {
  /** When the latest review it keeps was written or changed. */
  readonly lastReviewAt: Option.Option<DateTime.Utc>;
  /** The reviews it keeps. */
  readonly reviews: number;
  readonly thread: ReviewThread;
  /** The reviews nobody answered yet. */
  readonly unanswered: number;
}

/** What narrows a workspace's list of locations. */
export interface ReviewThreadFilter {
  readonly channelId: Option.Option<ChannelId>;
  /** Only the threads with a review waiting for an answer. */
  readonly unanswered: boolean;
}

/** Where a page of threads starts: after this thread, in the list's order. */
export interface ReviewThreadCursor {
  readonly lastReviewAt: DateTime.Utc;
  readonly threadId: ReviewThreadId;
  readonly waiting: boolean;
}

/** An idempotency key a request came with, and since when its uses count. */
export interface ReviewReplyKey {
  readonly key: string;
  /** Uses of the key before this instant are forgotten. */
  readonly since: DateTime.Utc;
}

/** How journalling a reply ended. */
export type ReviewReplyJournalled =
  | { readonly _tag: "journalled" }
  // The key made this reply, with the same review and text: no other.
  | { readonly _tag: "replayed"; readonly reply: ReviewReply }
  // The key made a reply to another review, or with another text.
  | { readonly _tag: "keyReused" }
  // A reply to the review is on its way or unconfirmed.
  | { readonly _tag: "pending"; readonly replyId: ReviewReplyId }
  // The review went, with its thread or its workspace.
  | { readonly _tag: "dropped" };

/** What one pass of the retention deleted. */
export interface ReviewsPurged {
  readonly reviews: number;
  readonly threads: number;
}

/**
 * The reviews of the locations a workspace connected, and the replies
 * sent to them, as engagement keeps them.
 */
export class ReviewStore extends Context.Service<
  ReviewStore,
  {
    /**
     * Starts following these locations, one thread a channel: one already
     * followed stays as it is, and one of a workspace erased since it was
     * listed is passed over. Answers how many were new.
     */
    readonly follow: (
      threads: readonly ReviewThread[]
    ) => Effect.Effect<number, DatabaseError>;
    /** At most `limit` threads due by `at`, the one that waited longest first. */
    readonly due: (
      at: DateTime.Utc,
      limit: number
    ) => Effect.Effect<readonly ReviewThread[], DatabaseError>;
    /** How many threads are due by `at`. */
    readonly countDue: (
      at: DateTime.Utc
    ) => Effect.Effect<number, DatabaseError>;
    readonly thread: (
      threadId: string
    ) => Effect.Effect<Option.Option<ReviewThreadSummary>, DatabaseError>;
    readonly listThreads: (
      workspaceId: WorkspaceId,
      filter: ReviewThreadFilter,
      page: {
        readonly after: Option.Option<ReviewThreadCursor>;
        readonly limit: number;
      }
    ) => Effect.Effect<readonly ReviewThreadSummary[], DatabaseError>;
    /**
     * Takes the thread until the transaction ends: whoever changes its
     * reviews from what it read takes it first, and reads them after.
     */
    readonly lockThread: (
      threadId: ReviewThreadId
    ) => Effect.Effect<void, DatabaseError>;
    /** Saves the thread's schedule and what it says of its location. */
    readonly saveThread: (
      thread: ReviewThread
    ) => Effect.Effect<void, DatabaseError>;
    /** The thread's reviews, the latest written or changed first. */
    readonly reviewsOf: (
      threadId: ReviewThreadId
    ) => Effect.Effect<readonly Review[], DatabaseError>;
    readonly review: (
      reviewId: string
    ) => Effect.Effect<Option.Option<Review>, DatabaseError>;
    /**
     * Saves reviews of one thread: new ones are inserted (one the thread
     * already holds under the same id on the platform is passed over),
     * known ones replaced. Answers the reviews new to the thread.
     */
    readonly saveReviews: (
      reviews: readonly Review[]
    ) => Effect.Effect<readonly Review[], DatabaseError>;
    /** Deletes reviews, with the replies sent to them. */
    readonly deleteReviews: (
      reviewIds: readonly ReviewId[]
    ) => Effect.Effect<void, DatabaseError>;
    /** Counts the thread's reviews again, for its list. */
    readonly recount: (
      threadId: ReviewThreadId
    ) => Effect.Effect<void, DatabaseError>;
    /**
     * Journals a reply about to be sent. The database decides: one reply
     * a review on its way or unconfirmed at a time, and one reply a key
     * in the workspace (kept under its SHA-256, never the key).
     */
    readonly journalReply: (
      reply: ReviewReply,
      key: Option.Option<ReviewReplyKey>
    ) => Effect.Effect<ReviewReplyJournalled, DatabaseError>;
    readonly reply: (
      replyId: string
    ) => Effect.Effect<Option.Option<ReviewReply>, DatabaseError>;
    /** The replies sent from Peal to the thread's reviews, oldest first. */
    readonly repliesOf: (
      threadId: ReviewThreadId
    ) => Effect.Effect<readonly ReviewReply[], DatabaseError>;
    /** The replies sent from Peal to one review, oldest first. */
    readonly repliesTo: (
      reviewId: ReviewId
    ) => Effect.Effect<readonly ReviewReply[], DatabaseError>;
    /**
     * Moves a reply from the status it was read in, attempt included, to
     * `next`. False when it moved meanwhile: nothing is changed.
     */
    readonly advanceReply: (
      next: ReviewReply,
      from: ReviewReply
    ) => Effect.Effect<boolean, DatabaseError>;
    /**
     * Records that a gate is about to call the platform for the reply,
     * only while it is on its way. False otherwise: nothing is sent.
     */
    readonly claimCall: (
      replyId: ReviewReplyId,
      at: DateTime.Utc
    ) => Effect.Effect<boolean, DatabaseError>;
    /**
     * At most `limit` replies still on their way, written by
     * `writtenBefore`, with no call claimed after `calledBefore`.
     */
    readonly strandedReplies: (
      writtenBefore: DateTime.Utc,
      calledBefore: DateTime.Utc,
      limit: number
    ) => Effect.Effect<readonly ReviewReply[], DatabaseError>;
    /** Deletes the channel's thread with its reviews and replies, at once. */
    readonly channelGone: (
      channelId: ChannelId
    ) => Effect.Effect<number, DatabaseError>;
    /**
     * Deletes the reviews last changed before `keptSince`, and the threads
     * not read since then (with what they hold), `limit` of each at most.
     */
    readonly purge: (
      keptSince: DateTime.Utc,
      limit: number
    ) => Effect.Effect<ReviewsPurged, DatabaseError>;
  }
>()("peal-server/engagement/application/ReviewStore") {}
