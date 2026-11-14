import { Context, DateTime, Effect, Layer, Option, Result } from "effect";

import { replyKeyLifetime } from "#engagement/domain/reply.ts";
import { reviewAbilitiesOf } from "#engagement/domain/review-abilities.ts";
import type {
  ReviewAbilities,
  ReviewAbility,
} from "#engagement/domain/review-abilities.ts";
import type { ReviewId } from "#engagement/domain/review-id.ts";
import { ReviewReplyIdSchema } from "#engagement/domain/review-reply-id.ts";
import {
  maxReviewReplyBytes,
  reviewReplyBytes,
  withdrawReviewReply,
  writeReviewReply,
} from "#engagement/domain/review-reply.ts";
import type { ReviewReply } from "#engagement/domain/review-reply.ts";
import type { ReviewThreadId } from "#engagement/domain/review-thread-id.ts";
import {
  markReviewAnswered,
  withOwnerReply,
} from "#engagement/domain/review.ts";
import type { Review } from "#engagement/domain/review.ts";
import { CurrentInboxPlatforms } from "#shared/application/current-inbox-platforms.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { newId, Ids } from "#shared/application/ids.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import type { ChannelId, UserId } from "#shared/domain/ids.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";
import { storableText } from "#shared/domain/platform-text.ts";
import type { Platform } from "#shared/domain/platform.ts";

import { AbilityUnavailable } from "./ability-unavailable.ts";
import { EngagementChannels } from "./ports/engagement-channels.ts";
import type { EngagedChannel } from "./ports/engagement-channels.ts";
import { ReviewReplyJobs } from "./ports/review-reply-jobs.ts";
import { ReviewReplySender } from "./ports/review-reply-sender.ts";
import { ReviewStore } from "./ports/review-store.ts";
import type {
  ReviewThreadCursor,
  ReviewThreadFilter,
  ReviewThreadSummary,
} from "./ports/review-store.ts";
import { ReplyEmpty } from "./reply-empty.ts";
import { ReplyKeyReused } from "./reply-key-reused.ts";
import { ReplyTooLong } from "./reply-too-long.ts";
import { ReviewActionFailed } from "./review-action-failed.ts";
import { ReviewNotFound } from "./review-not-found.ts";
import { ReviewReplyNeedsPerson } from "./review-reply-needs-person.ts";
import { ReviewReplyPending } from "./review-reply-pending.ts";
import { ReviewThreadNotFound } from "./review-thread-not-found.ts";

// The longest text a reply is cleaned to before it is counted: past
// Google's 4,096 bytes, so the count still refuses what is too long.
const maxReviewReplyLength = 10_000;

/** The most threads a page lists. */
export const maxReviewThreadsPerPage = 100;

/** A page of locations, and whether more follow. */
export interface ReviewThreadsPage {
  readonly next: Option.Option<ReviewThreadCursor>;
  readonly threads: readonly ReviewThreadSummary[];
}

/** A location's reviews whole, the replies sent from Peal, and what its channel can do. */
export interface ReviewThreadDetail {
  readonly abilities: ReviewAbilities;
  /** None once the channel left the workspace. */
  readonly platform: Option.Option<Platform>;
  readonly replies: readonly ReviewReply[];
  readonly reviews: readonly Review[];
  readonly summary: ReviewThreadSummary;
}

const nothing = reviewAbilitiesOf("x", [], new Set());

// Whether the actor reaches Peal in person: not an API key, nor an OAuth
// client (an MCP client, the command line) acting for the member.
const inPerson = ({ subject }: Actor): boolean =>
  subject._tag === "user" && subject.clientId === undefined;

// The member who writes, none for an API key.
const writerOf = (actor: Actor): Option.Option<UserId> =>
  actor.subject._tag === "user"
    ? Option.some(actor.subject.userId)
    : Option.none();

/** The cursor that starts the page after `summary`. */
export const reviewCursorAfter = (
  summary: ReviewThreadSummary
): Option.Option<ReviewThreadCursor> =>
  summary.lastReviewAt.pipe(
    Option.map((lastReviewAt) => ({
      lastReviewAt,
      threadId: summary.thread.id,
      waiting: summary.unanswered > 0,
    }))
  );

/**
 * The reviews of a workspace's locations, for its members: the locations
 * that have reviews, those with one waiting for an answer first, each
 * whole, and what members do about them. Reading needs `engagement:read`;
 * answering, withdrawing the location's reply and marking a review
 * answered need `engagement:reply`, and answering and withdrawing a
 * member in person (`ReviewReplyNeedsPerson`). A reply is journalled and sent by a
 * job; replies to reviews count no outbound message.
 */
export class EngagementReviews extends Context.Service<
  EngagementReviews,
  {
    readonly threads: (
      actor: Actor,
      filter: ReviewThreadFilter,
      page: {
        readonly after: Option.Option<ReviewThreadCursor>;
        readonly limit: number;
      }
    ) => Effect.Effect<ReviewThreadsPage, DatabaseError | MissingPermission>;
    readonly thread: (
      actor: Actor,
      threadId: ReviewThreadId
    ) => Effect.Effect<
      ReviewThreadDetail,
      DatabaseError | MissingPermission | ReviewThreadNotFound
    >;
    /**
     * With `key`, a request sent again within `replyKeyLifetime` answers
     * the reply the key made, and sends no other.
     */
    readonly reply: (
      actor: Actor,
      reviewId: ReviewId,
      text: string,
      key?: Option.Option<string>
    ) => Effect.Effect<
      ReviewReply,
      | AbilityUnavailable
      | DatabaseError
      | MissingPermission
      | ReplyEmpty
      | ReplyKeyReused
      | ReplyTooLong
      | ReviewNotFound
      | ReviewReplyNeedsPerson
      | ReviewReplyPending
    >;
    /** Deletes the location's reply to the review, whoever wrote it. */
    readonly withdraw: (
      actor: Actor,
      reviewId: ReviewId
    ) => Effect.Effect<
      Review,
      | AbilityUnavailable
      | DatabaseError
      | MissingPermission
      | ReviewActionFailed
      | ReviewNotFound
      | ReviewReplyNeedsPerson
    >;
    readonly setAnswered: (
      actor: Actor,
      reviewId: ReviewId,
      answered: boolean
    ) => Effect.Effect<
      Review,
      DatabaseError | MissingPermission | ReviewNotFound
    >;
  }
>()("peal-server/engagement/application/EngagementReviews") {
  static readonly layer = Layer.effect(
    EngagementReviews,
    Effect.gen(function* EngagementReviewsLive() {
      const store = yield* ReviewStore;
      const channels = yield* EngagementChannels;
      const sender = yield* ReviewReplySender;
      const jobs = yield* ReviewReplyJobs;
      const inbox = yield* CurrentInboxPlatforms;
      const { transaction } = yield* TransactionRunner;
      const ids = yield* Ids;

      const described = (channelId: ChannelId) =>
        channels.describe(channelId).pipe(
          Effect.map(Option.some),
          Effect.catchTag("ChannelUnreadable", () =>
            Effect.succeed(Option.none<EngagedChannel>())
          )
        );

      const abilitiesOn = (channelId: ChannelId) =>
        described(channelId).pipe(
          Effect.map(
            Option.match({
              onNone: () => nothing,
              onSome: ({ platform, scopes }) =>
                reviewAbilitiesOf(platform, scopes, inbox),
            })
          )
        );

      // The ability, checked before any call or journal row.
      const able = (channelId: ChannelId, ability: ReviewAbility) =>
        abilitiesOn(channelId).pipe(
          Effect.flatMap((abilities) => {
            const standing = abilities[ability];

            return standing === "available"
              ? Effect.void
              : Effect.fail(new AbilityUnavailable({ ability, standing }));
          })
        );

      // The review, if it is the actor's workspace's.
      const reviewOf = Effect.fn("EngagementReviews.review")(function* reviewOf(
        actor: Actor,
        reviewId: ReviewId
      ) {
        const found = yield* store.review(reviewId);

        if (
          Option.isNone(found) ||
          found.value.workspaceId !== actor.workspaceId
        ) {
          return yield* new ReviewNotFound({ reviewId });
        }

        return found.value;
      });

      const threads = Effect.fn("EngagementReviews.threads")(function* threads(
        actor: Actor,
        filter: ReviewThreadFilter,
        page: {
          readonly after: Option.Option<ReviewThreadCursor>;
          readonly limit: number;
        }
      ) {
        yield* Effect.fromResult(authorize(actor, "engagement:read"));

        const limit = Math.min(
          Math.max(page.limit, 1),
          maxReviewThreadsPerPage
        );

        const listed = yield* store.listThreads(actor.workspaceId, filter, {
          after: page.after,
          limit: limit + 1,
        });

        const shown = listed.slice(0, limit);

        const result: ReviewThreadsPage = {
          next:
            listed.length > limit
              ? Option.fromUndefinedOr(shown.at(-1)).pipe(
                  Option.flatMap(reviewCursorAfter)
                )
              : Option.none(),
          threads: shown,
        };

        return result;
      });

      const thread = Effect.fn("EngagementReviews.thread")(function* thread(
        actor: Actor,
        threadId: ReviewThreadId
      ) {
        yield* Effect.fromResult(authorize(actor, "engagement:read"));

        const summary = (yield* store.thread(threadId)).pipe(
          Option.filter(
            (found) => found.thread.workspaceId === actor.workspaceId
          )
        );

        if (Option.isNone(summary)) {
          return yield* new ReviewThreadNotFound({ threadId });
        }

        const channel = yield* described(summary.value.thread.channelId);

        const detail: ReviewThreadDetail = {
          abilities: Option.match(channel, {
            onNone: () => nothing,
            onSome: ({ platform, scopes }) =>
              reviewAbilitiesOf(platform, scopes, inbox),
          }),
          platform: channel.pipe(Option.map(({ platform }) => platform)),
          replies: yield* store.repliesOf(threadId),
          reviews: yield* store.reviewsOf(threadId),
          summary: summary.value,
        };

        return detail;
      });

      const reply = Effect.fn("EngagementReviews.reply")(function* reply(
        actor: Actor,
        reviewId: ReviewId,
        text: string,
        key: Option.Option<string> = Option.none()
      ) {
        yield* Effect.fromResult(authorize(actor, "engagement:reply"));

        const review = yield* reviewOf(actor, reviewId);

        if (!inPerson(actor)) {
          return yield* new ReviewReplyNeedsPerson({ reviewId });
        }

        // Cleaned as any text kept is: no control character a platform,
        // a terminal or the database would act on.
        const said = storableText(text, maxReviewReplyLength).trim();

        if (said === "") {
          return yield* new ReplyEmpty();
        }

        const length = reviewReplyBytes(said);

        if (length > maxReviewReplyBytes) {
          return yield* new ReplyTooLong({
            length,
            maximum: maxReviewReplyBytes,
            unit: "bytes",
          });
        }

        yield* able(review.channelId, "reply");

        const now = yield* DateTime.now;

        const written = writeReviewReply(
          yield* newId(ReviewReplyIdSchema).pipe(
            Effect.provideService(Ids, ids)
          ),
          review,
          writerOf(actor),
          said,
          now
        );

        // The row and the start of its job commit together, or neither.
        const journalled = yield* transaction(
          store
            .journalReply(
              written,
              key.pipe(
                Option.map((given) => ({
                  key: given,
                  since: DateTime.subtractDuration(now, replyKeyLifetime),
                }))
              )
            )
            .pipe(
              Effect.tap((outcome) =>
                outcome._tag === "journalled"
                  ? jobs.start(written.id)
                  : Effect.void
              )
            )
        );

        if (journalled._tag === "pending") {
          return yield* new ReviewReplyPending({
            replyId: journalled.replyId,
            reviewId,
          });
        }

        if (journalled._tag === "dropped") {
          return yield* new ReviewNotFound({ reviewId });
        }

        if (journalled._tag === "keyReused") {
          return yield* new ReplyKeyReused();
        }

        return journalled._tag === "replayed" ? journalled.reply : written;
      });

      const withdraw = Effect.fn("EngagementReviews.withdraw")(
        function* withdraw(actor: Actor, reviewId: ReviewId) {
          yield* Effect.fromResult(authorize(actor, "engagement:reply"));

          const review = yield* reviewOf(actor, reviewId);

          if (!inPerson(actor)) {
            return yield* new ReviewReplyNeedsPerson({ reviewId });
          }

          yield* able(review.channelId, "withdraw");

          // Nothing to delete: asking twice changes nothing more.
          if (Option.isNone(review.reply)) {
            return review;
          }

          const outcome = yield* sender.withdraw({
            channelId: review.channelId,
            reviewId,
          });

          if (outcome._tag === "failed") {
            return yield* new ReviewActionFailed({ reason: outcome.reason });
          }

          return yield* transaction(
            Effect.gen(function* withdrawn() {
              yield* store.lockThread(review.threadId);

              const now = yield* DateTime.now;
              const current = yield* store.review(reviewId);

              if (Option.isNone(current)) {
                return yield* new ReviewNotFound({ reviewId });
              }

              const cleared = withOwnerReply(current.value, Option.none());

              yield* store.saveReviews([cleared]);

              for (const sent of yield* store.repliesTo(reviewId)) {
                const taken = withdrawReviewReply(sent, now);

                if (Result.isSuccess(taken)) {
                  yield* store.advanceReply(taken.success, sent);
                }
              }

              yield* store.recount(review.threadId);

              return cleared;
            })
          );
        }
      );

      const setAnswered = Effect.fn("EngagementReviews.setAnswered")(
        function* setAnswered(
          actor: Actor,
          reviewId: ReviewId,
          answered: boolean
        ) {
          yield* Effect.fromResult(authorize(actor, "engagement:reply"));

          const review = yield* reviewOf(actor, reviewId);

          return yield* transaction(
            Effect.gen(function* marking() {
              yield* store.lockThread(review.threadId);

              const current = yield* store.review(reviewId);

              if (Option.isNone(current)) {
                return yield* new ReviewNotFound({ reviewId });
              }

              const marked = markReviewAnswered(
                current.value,
                answered,
                yield* DateTime.now
              );

              yield* store.saveReviews([marked]);
              yield* store.recount(review.threadId);

              return marked;
            })
          );
        }
      );

      return EngagementReviews.of({
        reply,
        setAnswered,
        thread,
        threads,
        withdraw,
      });
    })
  );
}
