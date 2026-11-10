import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { CommentId } from "#engagement/domain/comment-id.ts";
import type { Comment } from "#engagement/domain/comment.ts";
import type { ReplyId } from "#engagement/domain/reply-id.ts";
import type { Reply } from "#engagement/domain/reply.ts";
import type { ThreadId } from "#engagement/domain/thread-id.ts";
import type { Thread } from "#engagement/domain/thread.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type {
  ChannelId,
  PostId,
  PostTargetId,
  WorkspaceId,
} from "#shared/domain/ids.ts";

/** A channel with threads due, and since when the first of them is. */
export interface DueChannel {
  readonly channelId: ChannelId;
  readonly dueSince: DateTime.Utc;
}

/** The latest publication followed: where the next discovery starts. */
export interface LatestFollowed {
  readonly publishedAt: DateTime.Utc;
  readonly targetId: PostTargetId;
}

/** A thread with what its list shows: counts, and its latest comment. */
export interface ThreadSummary {
  /** The comments the platform still shows. */
  readonly comments: number;
  readonly lastCommentAt: Option.Option<DateTime.Utc>;
  readonly thread: Thread;
  /** Those nobody answered yet. */
  readonly unanswered: number;
}

/** Which threads a list shows. */
export interface ThreadFilter {
  readonly channelId: Option.Option<ChannelId>;
  readonly postId: Option.Option<PostId>;
  /** Only threads with a comment waiting for an answer. */
  readonly unanswered: boolean;
}

/**
 * Where a page of threads starts: after this one, in the list's order
 * (threads with comments waiting first, then by latest comment).
 */
export interface ThreadCursor {
  readonly lastCommentAt: DateTime.Utc;
  readonly threadId: ThreadId;
  readonly waiting: boolean;
}

/** An idempotency key a reply came with, and since when it counts. */
export interface ReplyKey {
  readonly key: string;
  /** Uses of the key before this instant are forgotten. */
  readonly since: DateTime.Utc;
}

/** How journalling a reply ended. */
export type Journalled =
  | { readonly _tag: "journalled" }
  | { readonly _tag: "dropped" }
  | { readonly _tag: "pending"; readonly replyId: ReplyId }
  | { readonly _tag: "replayed"; readonly reply: Reply }
  | { readonly _tag: "keyReused" };

/**
 * The engagement context's rows: threads, the comments read under them and
 * the replies sent from Peal, whose rows are the journal of what was sent.
 */
export class EngagementStore extends Context.Service<
  EngagementStore,
  {
    /**
     * Follows threads not followed yet, and says how many: one per
     * published target, none for a workspace erased meanwhile.
     */
    readonly follow: (
      threads: readonly Thread[]
    ) => Effect.Effect<number, DatabaseError>;
    readonly latestFollowed: (
      at: DateTime.Utc
    ) => Effect.Effect<Option.Option<LatestFollowed>, DatabaseError>;
    /**
     * Channels with threads due at `at`, those that waited longest first,
     * after `after` in that order.
     */
    readonly dueChannels: (
      at: DateTime.Utc,
      limit: number,
      after: Option.Option<DueChannel>
    ) => Effect.Effect<readonly DueChannel[], DatabaseError>;
    /** The threads due on these channels, `perChannel` each at most, longest due first. */
    readonly dueOn: (
      at: DateTime.Utc,
      channelIds: readonly ChannelId[],
      perChannel: number
    ) => Effect.Effect<readonly Thread[], DatabaseError>;
    readonly countDue: (
      at: DateTime.Utc
    ) => Effect.Effect<number, DatabaseError>;
    /** Saves when each thread is read next, or that it ended. */
    readonly saveCollections: (
      threads: readonly Thread[]
    ) => Effect.Effect<void, DatabaseError>;
    /** Every comment of the thread, oldest written first. */
    readonly commentsOf: (
      threadId: ThreadId
    ) => Effect.Effect<readonly Comment[], DatabaseError>;
    /**
     * Saves comments, new or changed, and their threads' counts. A comment
     * whose thread is gone, its workspace erased, is dropped.
     */
    readonly saveComments: (
      comments: readonly Comment[]
    ) => Effect.Effect<void, DatabaseError>;
    readonly thread: (
      threadId: ThreadId
    ) => Effect.Effect<Option.Option<ThreadSummary>, DatabaseError>;
    readonly listThreads: (
      workspaceId: WorkspaceId,
      filter: ThreadFilter,
      page: {
        readonly after: Option.Option<ThreadCursor>;
        readonly limit: number;
      }
    ) => Effect.Effect<readonly ThreadSummary[], DatabaseError>;
    readonly comment: (
      commentId: CommentId
    ) => Effect.Effect<Option.Option<Comment>, DatabaseError>;
    /** The thread's replies, oldest first. */
    readonly repliesOf: (
      threadId: ThreadId
    ) => Effect.Effect<readonly Reply[], DatabaseError>;
    readonly reply: (
      replyId: ReplyId
    ) => Effect.Effect<Option.Option<Reply>, DatabaseError>;
    /**
     * The replies still `sending` that were written at `writtenBefore` or
     * earlier, and whose call to the platform, if one was claimed, was
     * claimed at `calledBefore` or earlier, oldest first, `limit` at
     * most: those no job settled, and no call can still be making.
     */
    readonly strandedReplies: (
      writtenBefore: DateTime.Utc,
      calledBefore: DateTime.Utc,
      limit: number
    ) => Effect.Effect<readonly Reply[], DatabaseError>;
    /**
     * Journals a new reply, which nothing else does: at most one reply to
     * a comment is `sending` or `unconfirmed` at a time, and one
     * idempotency key names one reply, both held by the database, so
     * requests sent together journal one. With a `key` used in the last
     * `keyLifetime` it answers the reply the key made when the request is
     * the same (its comment and its text), and `keyReused` otherwise. A
     * reply whose comment is gone is `dropped`.
     */
    readonly journalReply: (
      reply: Reply,
      key: Option.Option<ReplyKey>
    ) => Effect.Effect<Journalled, DatabaseError>;
    /**
     * Moves a reply from the status it was read in (`from`) to `next`, and
     * says whether it did: false when the reply changed meanwhile, or is
     * gone, and nothing was written. Every change to a journalled reply
     * goes through it, so no run and no person overwrites what another
     * decided.
     */
    readonly advanceReply: (
      next: Reply,
      from: Reply
    ) => Effect.Effect<boolean, DatabaseError>;
    /**
     * Claims the reply for the call to its platform that starts now, at
     * `at`, and says whether it may be made: only while the reply is
     * `sending`. The gate asks just before the call, so a reply a person
     * settled, or one handed over as stranded, is never sent after.
     */
    readonly claimCall: (
      replyId: ReplyId,
      at: DateTime.Utc
    ) => Effect.Effect<boolean, DatabaseError>;
    /**
     * Deletes up to `limit` threads whose collection ended at `endedBefore`
     * or earlier, with their comments and replies, and says how many.
     */
    readonly purge: (
      endedBefore: DateTime.Utc,
      limit: number
    ) => Effect.Effect<number, DatabaseError>;
  }
>()("peal-server/engagement/application/EngagementStore") {}
