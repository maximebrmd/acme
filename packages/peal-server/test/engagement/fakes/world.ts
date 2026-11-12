import { DateTime, Effect, Layer, Option } from "effect";

import { ChannelUnreadable } from "#engagement/application/channel-unreadable.ts";
import { CollectComments } from "#engagement/application/collect-comments.ts";
import { EngagementInbox } from "#engagement/application/engagement-inbox.ts";
import { EngagementReplies } from "#engagement/application/engagement-replies.ts";
import { CommentSource } from "#engagement/application/ports/comment-source.ts";
import type {
  CommentsBatch,
  CommentsReadFailure,
  CommentsRequest,
} from "#engagement/application/ports/comment-source.ts";
import { EngagementChannels } from "#engagement/application/ports/engagement-channels.ts";
import type { EngagedChannel } from "#engagement/application/ports/engagement-channels.ts";
import { EngagementOutcomes } from "#engagement/application/ports/engagement-outcomes.ts";
import { EngagementStore } from "#engagement/application/ports/engagement-store.ts";
import type {
  Journalled,
  ThreadFilter,
  ThreadSummary,
} from "#engagement/application/ports/engagement-store.ts";
import { FollowedPosts } from "#engagement/application/ports/followed-posts.ts";
import { ReplyJobs } from "#engagement/application/ports/reply-jobs.ts";
import { ReplyLimits } from "#engagement/application/ports/reply-limits.ts";
import { ReplySender } from "#engagement/application/ports/reply-sender.ts";
import type {
  ActionOutcome,
  ModerationRequest,
  SendRequest,
} from "#engagement/application/ports/reply-sender.ts";
import { PurgeEngagement } from "#engagement/application/purge-engagement.ts";
import { SendReply } from "#engagement/application/send-reply.ts";
import type { Comment } from "#engagement/domain/comment.ts";
import { isPastRefresh } from "#engagement/domain/engagement-retention.ts";
import type { ReplyId } from "#engagement/domain/reply-id.ts";
import type { Reply, SendOutcome } from "#engagement/domain/reply.ts";
import { withoutRefresh } from "#engagement/domain/thread.ts";
import type { FollowedPost, Thread } from "#engagement/domain/thread.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { Ids } from "#shared/application/ids.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import type { ChannelId, WorkspaceId } from "#shared/domain/ids.ts";

// The engagement use cases on memory: a store that keeps what the Postgres
// one keeps, publishing's posts, a platform that answers what a test says,
// and a record of what the workspace was told.

type Read = (
  request: CommentsRequest
) => Effect.Effect<CommentsBatch, CommentsReadFailure>;

const before = (left: DateTime.Utc, right: DateTime.Utc) =>
  DateTime.toEpochMillis(left) - DateTime.toEpochMillis(right);

const summaryOf = (
  thread: Thread,
  comments: readonly Comment[]
): ThreadSummary => {
  const shown = comments.filter(
    (comment) => comment.threadId === thread.id && comment.state !== "deleted"
  );

  const latest = shown
    .map((comment) => comment.writtenAt)
    .toSorted(before)
    .at(-1);

  return {
    comments: shown.length,
    lastCommentAt: Option.fromUndefinedOr(latest),
    thread,
    unanswered: shown.filter((comment) => comment.state === "new").length,
  };
};

interface Told {
  readonly comments: readonly Comment[];
  readonly thread: Thread;
}

/** What a test's world holds, and how its platform answers. */
export interface WorldState {
  readonly cancelled: ReplyId[];
  /** The workspace of a channel that is not the tests' own. */
  readonly channelOwners: Map<ChannelId, WorkspaceId>;
  readonly channels: Map<ChannelId, EngagedChannel>;
  /** When a gate claimed each reply's call, by reply. */
  readonly claims: Map<string, DateTime.Utc>;
  readonly comments: Map<string, Comment>;
  readonly jobs: ReplyId[];
  /** The reply each idempotency key made. */
  readonly keys: Map<string, ReplyId>;
  readonly moderated: ModerationRequest[];
  moderation: ActionOutcome;
  readonly posts: FollowedPost[];
  read: Read;
  readonly reads: CommentsRequest[];
  readonly received: Told[];
  readonly replied: Reply[];
  readonly replies: Map<string, Reply>;
  readonly resumed: SendRequest[];
  /** What saving comments does first: a test's way to make it fail. */
  saving: (comments: readonly Comment[]) => Effect.Effect<void, DatabaseError>;
  resuming: SendOutcome;
  sending: SendOutcome;
  readonly sent: SendRequest[];
  readonly threads: Map<string, Thread>;
  readonly withdrawn: SendRequest[];
}

const nextAt = (thread: Thread) =>
  thread.collection._tag === "collecting"
    ? thread.collection.nextAt
    : thread.publishedAt;

// Every thread read whole, with no comment under it.
const quiet: Read = (request) =>
  Effect.succeed({
    halted: false,
    readings: request.threads.map(({ threadId }) => ({
      _tag: "read",
      comments: [],
      complete: true,
      threadId,
    })),
  });

const matches = (
  thread: Thread,
  workspaceId: WorkspaceId,
  filter: ThreadFilter
) =>
  thread.workspaceId === workspaceId &&
  Option.match(filter.channelId, {
    onNone: () => true,
    onSome: (channelId) => thread.channelId === channelId,
  }) &&
  Option.match(filter.postId, {
    onNone: () => true,
    onSome: (postId) => thread.postId === postId,
  });

/** A world of its own for one test. */
export const makeWorld = () => {
  const state: WorldState = {
    cancelled: [],
    channelOwners: new Map(),
    channels: new Map(),
    claims: new Map(),
    comments: new Map(),
    jobs: [],
    keys: new Map(),
    moderated: [],
    moderation: { _tag: "done" },
    posts: [],
    read: quiet,
    reads: [],
    received: [],
    replied: [],
    replies: new Map(),
    resumed: [],
    resuming: { _tag: "unconfirmed", reason: "interrupted" },
    saving: () => Effect.void,
    sending: {
      _tag: "sent",
      permalink: Option.some("https://social.example/@studio/3001"),
      platformCommentId: "3001",
    },
    sent: [],
    threads: new Map(),
    withdrawn: [],
  };

  const allComments = () => [...state.comments.values()];

  const due = (at: DateTime.Utc) =>
    [...state.threads.values()].filter(
      (thread) =>
        thread.collection._tag === "collecting" &&
        DateTime.isLessThanOrEqualTo(thread.collection.nextAt, at)
    );

  const store = EngagementStore.of({
    advanceReply: (next, from) =>
      Effect.sync(() => {
        const current = state.replies.get(from.id);

        if (
          current === undefined ||
          JSON.stringify(current.status) !== JSON.stringify(from.status)
        ) {
          return false;
        }

        state.replies.set(next.id, next);

        return true;
      }),
    claimCall: (replyId, at) =>
      Effect.sync(() => {
        if (state.replies.get(replyId)?.status._tag !== "sending") {
          return false;
        }

        state.claims.set(replyId, at);

        return true;
      }),
    clearRefresh: (threadId, at) =>
      Effect.sync(() => {
        const found = state.threads.get(threadId);

        if (found === undefined || !isPastRefresh(found.refreshBy, at)) {
          return false;
        }

        state.threads.set(threadId, withoutRefresh(found));

        return true;
      }),
    comment: (commentId) =>
      Effect.succeed(Option.fromUndefinedOr(state.comments.get(commentId))),
    commentsOf: (threadId) =>
      Effect.succeed(
        allComments()
          .filter((comment) => comment.threadId === threadId)
          .toSorted((left, right) => before(left.writtenAt, right.writtenAt))
      ),
    countDue: (at) => Effect.succeed(due(at).length),
    dueChannels: (at, limit, after) => {
      const first = new Map<ChannelId, DateTime.Utc>();

      for (const thread of due(at)) {
        const known = first.get(thread.channelId);
        const at2 = nextAt(thread);

        if (known === undefined || before(at2, known) < 0) {
          first.set(thread.channelId, at2);
        }
      }

      const ordered = [...first.entries()]
        .map(([channelId, dueSince]) => ({ channelId, dueSince }))
        .toSorted(
          (left, right) =>
            before(left.dueSince, right.dueSince) ||
            left.channelId.localeCompare(right.channelId)
        );

      const start = Option.match(after, {
        onNone: () => 0,
        onSome: (last) =>
          ordered.findIndex((channel) => channel.channelId === last.channelId) +
          1,
      });

      return Effect.succeed(ordered.slice(start, start + limit));
    },
    dueOn: (at, channelIds, perChannel) =>
      Effect.succeed(
        channelIds.flatMap((channelId) =>
          due(at)
            .filter((thread) => thread.channelId === channelId)
            .toSorted((left, right) => before(nextAt(left), nextAt(right)))
            .slice(0, perChannel)
        )
      ),
    expiring: (at, limit, after) =>
      Effect.succeed(
        [...state.threads.values()]
          .flatMap((thread) =>
            Option.isSome(thread.refreshBy) &&
            isPastRefresh(thread.refreshBy, at)
              ? [{ refreshBy: thread.refreshBy.value, threadId: thread.id }]
              : []
          )
          .toSorted(
            (left, right) =>
              DateTime.toEpochMillis(left.refreshBy) -
                DateTime.toEpochMillis(right.refreshBy) ||
              left.threadId.localeCompare(right.threadId)
          )
          .filter((listed) =>
            Option.match(after, {
              onNone: () => true,
              onSome: (last) =>
                DateTime.toEpochMillis(listed.refreshBy) >
                  DateTime.toEpochMillis(last.refreshBy) ||
                (DateTime.toEpochMillis(listed.refreshBy) ===
                  DateTime.toEpochMillis(last.refreshBy) &&
                  listed.threadId > last.threadId),
            })
          )
          .slice(0, limit)
      ),
    follow: (threads) =>
      Effect.sync(() => {
        const followed = new Set(
          [...state.threads.values()].map((thread) => thread.targetId)
        );

        let count = 0;

        for (const thread of threads) {
          if (!followed.has(thread.targetId)) {
            followed.add(thread.targetId);
            state.threads.set(thread.id, thread);
            count += 1;
          }
        }

        return count;
      }),
    journalReply: (reply, key) =>
      Effect.sync((): Journalled => {
        if (!state.comments.has(reply.commentId)) {
          return { _tag: "dropped" };
        }

        const made = key.pipe(
          Option.flatMap((given) =>
            Option.fromUndefinedOr(state.keys.get(given.key)).pipe(
              Option.flatMap((id) =>
                Option.fromUndefinedOr(state.replies.get(id))
              ),
              Option.filter((earlier) =>
                DateTime.isGreaterThan(earlier.createdAt, given.since)
              )
            )
          )
        );

        if (Option.isSome(made)) {
          return made.value.commentId === reply.commentId &&
            made.value.text === reply.text
            ? { _tag: "replayed", reply: made.value }
            : { _tag: "keyReused" };
        }

        const pending = [...state.replies.values()].find(
          (other) =>
            other.commentId === reply.commentId &&
            (other.status._tag === "sending" ||
              other.status._tag === "unconfirmed")
        );

        if (pending !== undefined) {
          return { _tag: "pending", replyId: pending.id };
        }

        state.replies.set(reply.id, reply);

        if (Option.isSome(key)) {
          state.keys.set(key.value.key, reply.id);
        }

        return { _tag: "journalled" };
      }),
    latestFollowed: () =>
      Effect.succeed(
        Option.fromUndefinedOr(
          [...state.threads.values()]
            .toSorted(
              (left, right) =>
                before(left.publishedAt, right.publishedAt) ||
                left.targetId.localeCompare(right.targetId)
            )
            .at(-1)
        )
      ),
    listThreads: (workspaceId, filter, page) =>
      Effect.sync(() => {
        const listed = [...state.threads.values()]
          .flatMap((thread) => {
            const summary = summaryOf(thread, allComments());

            return matches(thread, workspaceId, filter) &&
              summary.comments > 0 &&
              (!filter.unanswered || summary.unanswered > 0)
              ? [summary]
              : [];
          })
          .toSorted(
            (left, right) =>
              Number(right.unanswered > 0) - Number(left.unanswered > 0) ||
              before(
                Option.getOrThrow(right.lastCommentAt),
                Option.getOrThrow(left.lastCommentAt)
              ) ||
              right.thread.id.localeCompare(left.thread.id)
          );

        const start = Option.match(page.after, {
          onNone: () => 0,
          onSome: (cursor) =>
            listed.findIndex(
              (summary) => summary.thread.id === cursor.threadId
            ) + 1,
        });

        return listed.slice(start, start + page.limit);
      }),
    // One fiber at a time in a test: nothing to hold.
    lockThread: () => Effect.void,
    purge: (endedBefore, limit) =>
      Effect.sync(() => {
        const expired = [...state.threads.values()]
          .filter(
            (thread) =>
              thread.collection._tag === "ended" &&
              DateTime.isLessThanOrEqualTo(thread.collection.at, endedBefore)
          )
          .slice(0, limit);

        for (const thread of expired) {
          state.threads.delete(thread.id);

          for (const comment of allComments()) {
            if (comment.threadId === thread.id) {
              state.comments.delete(comment.id);
            }
          }

          for (const reply of state.replies.values()) {
            if (reply.threadId === thread.id) {
              state.replies.delete(reply.id);
            }
          }
        }

        return expired.length;
      }),
    repliesOf: (threadId) =>
      Effect.succeed(
        [...state.replies.values()]
          .filter((reply) => reply.threadId === threadId)
          .toSorted((left, right) => left.id.localeCompare(right.id))
      ),
    reply: (replyId) =>
      Effect.succeed(Option.fromUndefinedOr(state.replies.get(replyId))),
    saveCollections: (threads) =>
      Effect.sync(() => {
        for (const thread of threads) {
          if (state.threads.has(thread.id)) {
            state.threads.set(thread.id, thread);
          }
        }
      }),
    saveComments: (comments) =>
      state.saving(comments).pipe(
        Effect.andThen(
          Effect.sync(() => {
            for (const comment of comments) {
              if (state.threads.has(comment.threadId)) {
                state.comments.set(comment.id, comment);
              }
            }
          })
        )
      ),
    strandedReplies: (writtenBefore, calledBefore, limit) =>
      Effect.succeed(
        [...state.replies.values()]
          .filter((reply) => {
            const claimed = state.claims.get(reply.id);

            return (
              reply.status._tag === "sending" &&
              DateTime.isLessThanOrEqualTo(reply.createdAt, writtenBefore) &&
              (claimed === undefined ||
                DateTime.isLessThanOrEqualTo(claimed, calledBefore))
            );
          })
          .toSorted(
            (left, right) =>
              before(left.createdAt, right.createdAt) ||
              left.id.localeCompare(right.id)
          )
          .slice(0, limit)
      ),
    thread: (threadId) =>
      Effect.succeed(
        Option.fromUndefinedOr(state.threads.get(threadId)).pipe(
          Option.map((thread) => summaryOf(thread, allComments()))
        )
      ),
  });

  const ports = Layer.mergeAll(
    Layer.succeed(EngagementStore, store),
    Layer.succeed(
      FollowedPosts,
      FollowedPosts.of({
        from: (cursor, limit) =>
          Effect.succeed(
            state.posts
              .toSorted(
                (left, right) =>
                  before(left.publishedAt, right.publishedAt) ||
                  left.targetId.localeCompare(right.targetId)
              )
              .filter((post) => {
                const order = before(post.publishedAt, cursor.publishedAt);

                return (
                  order > 0 ||
                  (order === 0 &&
                    Option.match(cursor.targetId, {
                      onNone: () => true,
                      onSome: (targetId) => post.targetId > targetId,
                    }))
                );
              })
              .slice(0, limit)
          ),
      })
    ),
    Layer.succeed(
      CommentSource,
      CommentSource.of({
        read: (request) => {
          state.reads.push(request);

          return state.read(request);
        },
      })
    ),
    Layer.succeed(
      ReplySender,
      ReplySender.of({
        moderate: (request) =>
          Effect.sync(() => {
            state.moderated.push(request);

            return state.moderation;
          }),
        resume: (request) =>
          Effect.sync(() => {
            state.resumed.push(request);

            return state.resuming;
          }),
        send: (request) =>
          Effect.sync(() => {
            state.sent.push(request);

            return state.sending;
          }),
        withdraw: (request) =>
          Effect.sync(() => {
            state.withdrawn.push(request);

            return state.moderation;
          }),
      })
    ),
    Layer.succeed(
      ReplyJobs,
      ReplyJobs.of({
        cancel: (replyId) =>
          Effect.sync(() => {
            state.cancelled.push(replyId);
          }),
        start: (replyId) =>
          Effect.sync(() => {
            state.jobs.push(replyId);
          }),
      })
    ),
    Layer.succeed(
      EngagementChannels,
      EngagementChannels.of({
        belongs: (channelId, workspace) =>
          Effect.succeed(
            (state.channelOwners.get(channelId) ?? workspace) === workspace
          ),
        describe: (channelId) =>
          Option.match(Option.fromUndefinedOr(state.channels.get(channelId)), {
            onNone: () =>
              Effect.fail(new ChannelUnreadable({ reason: "disconnected" })),
            onSome: (channel) => Effect.succeed(channel),
          }),
      })
    ),
    Layer.succeed(
      ReplyLimits,
      ReplyLimits.of({
        // Mastodon's default, counted plainly: enough for the use cases.
        overflow: (_platform, text) =>
          Effect.succeed(
            text.length > 500
              ? Option.some({
                  length: text.length,
                  maximum: 500,
                  unit: "characters",
                })
              : Option.none()
          ),
      })
    ),
    Layer.succeed(
      EngagementOutcomes,
      EngagementOutcomes.of({
        received: (thread, comments) =>
          Effect.sync(() => {
            state.received.push({ comments, thread });
          }),
        replied: (_thread, reply) =>
          Effect.sync(() => {
            state.replied.push(reply);
          }),
      })
    ),
    Layer.succeed(
      TransactionRunner,
      TransactionRunner.of({ transaction: (effect) => effect })
    ),
    Ids.layerTest
  );

  const layer = Layer.mergeAll(
    CollectComments.layer,
    EngagementInbox.layer,
    EngagementReplies.layer,
    SendReply.layer,
    PurgeEngagement.layer
  ).pipe(Layer.provideMerge(ports));

  // `ports` alone, for a test that runs the use cases on other adapters:
  // provide those first, then these for the rest.
  return { layer, ports, state };
};

export type World = ReturnType<typeof makeWorld>;
