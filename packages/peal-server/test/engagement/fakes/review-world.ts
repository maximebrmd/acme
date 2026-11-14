import { DateTime, Effect, Layer, Option } from "effect";

import { ChannelUnreadable } from "#engagement/application/channel-unreadable.ts";
import { CollectReviews } from "#engagement/application/collect-reviews.ts";
import { EngagementReviews } from "#engagement/application/engagement-reviews.ts";
import { EngagementChannels } from "#engagement/application/ports/engagement-channels.ts";
import type { EngagedChannel } from "#engagement/application/ports/engagement-channels.ts";
import { ReviewLocations } from "#engagement/application/ports/review-locations.ts";
import type { ConnectedLocation } from "#engagement/application/ports/review-locations.ts";
import { ReviewOutcomes } from "#engagement/application/ports/review-outcomes.ts";
import { ReviewReplyJobs } from "#engagement/application/ports/review-reply-jobs.ts";
import { ReviewReplySender } from "#engagement/application/ports/review-reply-sender.ts";
import type {
  ReviewActionOutcome,
  ReviewReplyRequest,
  ReviewWithdrawal,
} from "#engagement/application/ports/review-reply-sender.ts";
import { ReviewSource } from "#engagement/application/ports/review-source.ts";
import type {
  ReviewsBatch,
  ReviewsReadFailure,
  ReviewsRequest,
} from "#engagement/application/ports/review-source.ts";
import { ReviewStore } from "#engagement/application/ports/review-store.ts";
import type { ReviewThreadSummary } from "#engagement/application/ports/review-store.ts";
import { PurgeReviews } from "#engagement/application/purge-reviews.ts";
import { SendReviewReply } from "#engagement/application/send-review-reply.ts";
import type { ReviewReplyId } from "#engagement/domain/review-reply-id.ts";
import type {
  ReviewReply,
  ReviewSendOutcome,
} from "#engagement/domain/review-reply.ts";
import type { ReviewThread } from "#engagement/domain/review-thread.ts";
import { isReviewAnswered } from "#engagement/domain/review.ts";
import type { Review } from "#engagement/domain/review.ts";
import { CurrentInboxPlatforms } from "#shared/application/current-inbox-platforms.ts";
import { Ids } from "#shared/application/ids.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import type { ChannelId } from "#shared/domain/ids.ts";
import type { InboxPlatforms } from "#shared/domain/inbox-platform.ts";
import { googleBusinessReviewScope } from "#shared/domain/inbox-platform.ts";

// The review use cases on memory: a store that keeps what the Postgres
// one keeps, the locations the channels context lists, a platform that
// answers what a test says, and a record of what the workspace was told.

const millis = (at: DateTime.Utc) => DateTime.toEpochMillis(at);

/** A location's channel, as the channels context describes it. */
export const locationChannel: EngagedChannel = {
  connection: Option.none(),
  platform: "googleBusiness",
  scopes: [googleBusinessReviewScope],
};

export interface ReviewWorldState {
  readonly cancelled: ReviewReplyId[];
  readonly channels: Map<ChannelId, EngagedChannel>;
  readonly claims: Map<string, DateTime.Utc>;
  readonly jobs: ReviewReplyId[];
  /** The reply each idempotency key made. */
  readonly keys: Map<string, ReviewReplyId>;
  readonly locations: ConnectedLocation[];
  read: (
    request: ReviewsRequest
  ) => Effect.Effect<ReviewsBatch, ReviewsReadFailure>;
  readonly reads: ReviewsRequest[];
  readonly received: {
    readonly reviews: readonly Review[];
    readonly thread: ReviewThread;
  }[];
  readonly replied: ReviewReply[];
  readonly replies: Map<string, ReviewReply>;
  readonly resumed: ReviewReplyRequest[];
  resuming: ReviewSendOutcome;
  readonly reviews: Map<string, Review>;
  sending: ReviewSendOutcome;
  readonly sent: ReviewReplyRequest[];
  readonly threads: Map<string, ReviewThread>;
  withdrawal: ReviewActionOutcome;
  readonly withdrawn: ReviewWithdrawal[];
}

const nothingRead = (): Effect.Effect<ReviewsBatch, ReviewsReadFailure> =>
  Effect.succeed({
    averageRating: Option.none(),
    complete: true,
    reviews: [],
    totalReviewCount: Option.none(),
  });

/** A world of its own for one test, Google Business Profile on unless `inbox` says. */
export const makeReviewWorld = (
  inbox: InboxPlatforms = new Set(["googleBusiness"])
) => {
  const state: ReviewWorldState = {
    cancelled: [],
    channels: new Map(),
    claims: new Map(),
    jobs: [],
    keys: new Map(),
    locations: [],
    read: nothingRead,
    reads: [],
    received: [],
    replied: [],
    replies: new Map(),
    resumed: [],
    resuming: {
      _tag: "unconfirmed",
      reason: "interrupted",
    },
    reviews: new Map(),
    sending: {
      _tag: "sent",
      reply: {
        moderation: Option.none(),
        text: "",
        updatedAt: DateTime.makeUnsafe("2026-11-14T10:00:00Z"),
      },
    },
    sent: [],
    threads: new Map(),
    withdrawal: { _tag: "done" },
    withdrawn: [],
  };

  const reviewsOf = (threadId: string) =>
    [...state.reviews.values()]
      .filter((review) => review.threadId === threadId)
      .toSorted(
        (left, right) =>
          millis(right.updatedAt) - millis(left.updatedAt) ||
          right.id.localeCompare(left.id)
      );

  const summaryOf = (thread: ReviewThread): ReviewThreadSummary => {
    const kept = reviewsOf(thread.id);

    return {
      lastReviewAt: Option.fromUndefinedOr(kept[0]?.updatedAt),
      reviews: kept.length,
      thread,
      unanswered: kept.filter((review) => !isReviewAnswered(review)).length,
    };
  };

  const repliesWhere = (keep: (reply: ReviewReply) => boolean) =>
    [...state.replies.values()]
      .filter(keep)
      .toSorted((left, right) => left.id.localeCompare(right.id));

  const dropThread = (threadId: string) => {
    state.threads.delete(threadId);

    for (const [id, review] of state.reviews) {
      if (review.threadId === threadId) {
        state.reviews.delete(id);
      }
    }

    for (const [id, reply] of state.replies) {
      if (reply.threadId === threadId) {
        state.replies.delete(id);
      }
    }
  };

  const store = ReviewStore.of({
    advanceReply: (next, from) =>
      Effect.sync(() => {
        const current = state.replies.get(next.id);

        if (
          current === undefined ||
          current.status._tag !== from.status._tag ||
          (current.status._tag === "sending" &&
            from.status._tag === "sending" &&
            Option.isSome(current.status.attemptedAt) !==
              Option.isSome(from.status.attemptedAt))
        ) {
          return false;
        }

        state.replies.set(next.id, next);

        return true;
      }),
    channelGone: (channelId) =>
      Effect.sync(() => {
        const gone = [...state.threads.values()].filter(
          (thread) => thread.channelId === channelId
        );

        for (const thread of gone) {
          dropThread(thread.id);
        }

        return gone.length;
      }),
    claimCall: (replyId, at) =>
      Effect.sync(() => {
        if (state.replies.get(replyId)?.status._tag !== "sending") {
          return false;
        }

        state.claims.set(replyId, at);

        return true;
      }),
    countDue: (at) =>
      Effect.sync(
        () =>
          [...state.threads.values()].filter(
            (thread) => millis(thread.nextReadAt) <= millis(at)
          ).length
      ),
    deleteReviews: (reviewIds) =>
      Effect.sync(() => {
        for (const id of reviewIds) {
          state.reviews.delete(id);

          for (const [replyId, reply] of state.replies) {
            if (reply.reviewId === id) {
              state.replies.delete(replyId);
            }
          }
        }
      }),
    due: (at, limit) =>
      Effect.sync(() =>
        [...state.threads.values()]
          .filter((thread) => millis(thread.nextReadAt) <= millis(at))
          .toSorted(
            (left, right) =>
              millis(left.nextReadAt) - millis(right.nextReadAt) ||
              left.id.localeCompare(right.id)
          )
          .slice(0, limit)
      ),
    follow: (threads) =>
      Effect.sync(() => {
        let added = 0;

        for (const thread of threads) {
          const taken = [...state.threads.values()].some(
            (other) => other.channelId === thread.channelId
          );

          if (!taken) {
            state.threads.set(thread.id, thread);
            added += 1;
          }
        }

        return added;
      }),
    journalReply: (reply, key) =>
      Effect.sync(() => {
        const made = key.pipe(
          Option.flatMap(({ key: given }) =>
            Option.fromUndefinedOr(state.keys.get(given))
          ),
          Option.flatMap((id) => Option.fromUndefinedOr(state.replies.get(id)))
        );

        if (Option.isSome(made)) {
          return made.value.reviewId === reply.reviewId &&
            made.value.text === reply.text
            ? { _tag: "replayed" as const, reply: made.value }
            : { _tag: "keyReused" as const };
        }

        if (!state.reviews.has(reply.reviewId)) {
          return { _tag: "dropped" as const };
        }

        const [pending] = repliesWhere(
          (other) =>
            other.reviewId === reply.reviewId &&
            (other.status._tag === "sending" ||
              other.status._tag === "unconfirmed")
        );

        if (pending !== undefined) {
          return { _tag: "pending" as const, replyId: pending.id };
        }

        state.replies.set(reply.id, reply);

        if (Option.isSome(key)) {
          state.keys.set(key.value.key, reply.id);
        }

        return { _tag: "journalled" as const };
      }),
    listThreads: (workspaceId, filter, page) =>
      Effect.sync(() =>
        [...state.threads.values()]
          .filter(
            (thread) =>
              thread.workspaceId === workspaceId &&
              Option.match(filter.channelId, {
                onNone: () => true,
                onSome: (channelId) => thread.channelId === channelId,
              })
          )
          .flatMap((thread) => {
            const summary = summaryOf(thread);

            return summary.reviews > 0 &&
              (!filter.unanswered || summary.unanswered > 0)
              ? [summary]
              : [];
          })
          .toSorted(
            (left, right) =>
              Number(right.unanswered > 0) - Number(left.unanswered > 0) ||
              millis(Option.getOrThrow(right.lastReviewAt)) -
                millis(Option.getOrThrow(left.lastReviewAt)) ||
              right.thread.id.localeCompare(left.thread.id)
          )
          .filter((summary) =>
            Option.match(page.after, {
              onNone: () => true,
              onSome: (cursor) => {
                const waiting = summary.unanswered > 0;
                const at = millis(Option.getOrThrow(summary.lastReviewAt));
                const after = millis(cursor.lastReviewAt);

                return (
                  Number(waiting) < Number(cursor.waiting) ||
                  (waiting === cursor.waiting &&
                    (at < after ||
                      (at === after && summary.thread.id < cursor.threadId)))
                );
              },
            })
          )
          .slice(0, page.limit)
      ),
    lockThread: () => Effect.void,
    purge: (since, limit) =>
      Effect.sync(() => {
        const old = [...state.reviews.values()]
          .filter((review) => millis(review.updatedAt) < millis(since))
          .slice(0, limit);

        for (const review of old) {
          state.reviews.delete(review.id);
        }

        const unread = [...state.threads.values()]
          .filter(
            (thread) =>
              millis(
                Option.getOrElse(thread.lastReadAt, () => thread.createdAt)
              ) < millis(since)
          )
          .slice(0, limit);

        for (const thread of unread) {
          dropThread(thread.id);
        }

        return { reviews: old.length, threads: unread.length };
      }),
    recount: () => Effect.void,
    repliesOf: (threadId) =>
      Effect.sync(() => repliesWhere((reply) => reply.threadId === threadId)),
    repliesTo: (reviewId) =>
      Effect.sync(() => repliesWhere((reply) => reply.reviewId === reviewId)),
    reply: (replyId) =>
      Effect.sync(() => Option.fromUndefinedOr(state.replies.get(replyId))),
    review: (reviewId) =>
      Effect.sync(() => Option.fromUndefinedOr(state.reviews.get(reviewId))),
    reviewsOf: (threadId) => Effect.sync(() => reviewsOf(threadId)),
    saveReviews: (saved) =>
      Effect.sync(() => {
        const fresh: Review[] = [];

        for (const review of saved) {
          const known = state.reviews.has(review.id);

          const taken = [...state.reviews.values()].some(
            (other) =>
              other.id !== review.id &&
              other.threadId === review.threadId &&
              other.platformReviewId === review.platformReviewId
          );

          if (!known && taken) {
            continue;
          }

          state.reviews.set(review.id, review);

          if (!known) {
            fresh.push(review);
          }
        }

        return fresh;
      }),
    saveThread: (thread) =>
      Effect.sync(() => {
        if (state.threads.has(thread.id)) {
          state.threads.set(thread.id, thread);
        }
      }),
    strandedReplies: (writtenBefore, calledBefore, limit) =>
      Effect.sync(() =>
        repliesWhere(
          (reply) =>
            reply.status._tag === "sending" &&
            millis(reply.createdAt) <= millis(writtenBefore) &&
            Option.match(Option.fromUndefinedOr(state.claims.get(reply.id)), {
              onNone: () => true,
              onSome: (claimed) => millis(claimed) <= millis(calledBefore),
            })
        ).slice(0, limit)
      ),
    thread: (threadId) =>
      Effect.sync(() =>
        Option.fromUndefinedOr(state.threads.get(threadId)).pipe(
          Option.map(summaryOf)
        )
      ),
  });

  const ports = Layer.mergeAll(
    Layer.succeed(ReviewStore, store),
    Layer.succeed(
      ReviewLocations,
      ReviewLocations.of({
        after: (after, limit) =>
          Effect.sync(() => {
            const sorted = state.locations
              .toSorted((left, right) =>
                left.channelId.localeCompare(right.channelId)
              )
              .filter((location) =>
                Option.match(after, {
                  onNone: () => true,
                  onSome: (last) => location.channelId > last,
                })
              );

            const page = sorted.slice(0, limit);

            return {
              locations: page,
              reached:
                sorted.length > limit
                  ? Option.fromUndefinedOr(page.at(-1)?.channelId)
                  : Option.none(),
            };
          }),
      })
    ),
    Layer.succeed(
      ReviewSource,
      ReviewSource.of({
        read: (request) => {
          state.reads.push(request);

          return state.read(request);
        },
      })
    ),
    Layer.succeed(
      ReviewReplySender,
      ReviewReplySender.of({
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

            return state.withdrawal;
          }),
      })
    ),
    Layer.succeed(
      ReviewReplyJobs,
      ReviewReplyJobs.of({
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
      ReviewOutcomes,
      ReviewOutcomes.of({
        received: (thread, reviews) =>
          Effect.sync(() => {
            if (reviews.length > 0) {
              state.received.push({ reviews, thread });
            }
          }),
        replied: (_thread, reply) =>
          Effect.sync(() => {
            state.replied.push(reply);
          }),
      })
    ),
    Layer.succeed(
      EngagementChannels,
      EngagementChannels.of({
        belongs: () => Effect.succeed(true),
        describe: (channelId) =>
          Option.match(Option.fromUndefinedOr(state.channels.get(channelId)), {
            onNone: () =>
              Effect.fail(new ChannelUnreadable({ reason: "disconnected" })),
            onSome: (channel) => Effect.succeed(channel),
          }),
      })
    ),
    Layer.succeed(
      TransactionRunner,
      TransactionRunner.of({ transaction: (effect) => effect })
    ),
    Layer.succeed(CurrentInboxPlatforms, inbox),
    Ids.layerTest
  );

  const layer = Layer.mergeAll(
    EngagementReviews.layer,
    CollectReviews.layer.pipe(Layer.provideMerge(SendReviewReply.layer)),
    PurgeReviews.layer
  ).pipe(Layer.provideMerge(ports));

  return { layer, ports, state };
};

export type ReviewWorld = ReturnType<typeof makeReviewWorld>;
