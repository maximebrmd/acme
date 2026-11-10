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
    /** Saves a reply, new or changed. One whose thread is gone is dropped. */
    readonly saveReply: (reply: Reply) => Effect.Effect<void, DatabaseError>;
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
