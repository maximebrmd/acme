import { Effect, Option, Schema } from "effect";
import { HttpApiBuilder, HttpApiError } from "effect/http-api";
import {
  Api,
  CurrentMember,
  defaultInboxPageSize,
  IdempotencyKeyReused,
  InboxActionFailed,
  InboxActionUnavailable,
  InboxReviewNotFound,
  InboxReviewThreadNotFound,
  ReplyInvalid,
  ReplyPending,
} from "peal-contract";

import type { AbilityUnavailable } from "#engagement/application/ability-unavailable.ts";
import { EngagementReviews } from "#engagement/application/engagement-reviews.ts";
import type { ReplyTooLong } from "#engagement/application/reply-too-long.ts";
import type { ReviewActionFailed } from "#engagement/application/review-action-failed.ts";
import type { ReviewReplyPending } from "#engagement/application/review-reply-pending.ts";
import { ReviewIdSchema } from "#engagement/domain/review-id.ts";
import { ReviewThreadIdSchema } from "#engagement/domain/review-thread-id.ts";
import { actorOf } from "#shared/api/actor.ts";
import { forbidden } from "#shared/api/forbidden.ts";
import { ChannelIdSchema } from "#shared/domain/ids.ts";

import {
  reviewCursorOf,
  toReviewReplyView,
  toReviewThreadDetailView,
  toReviewThreadPageView,
  toReviewView,
} from "./inbox-review-view.ts";

const decodeThreadId = Schema.decodeUnknownOption(ReviewThreadIdSchema);
const decodeReviewId = Schema.decodeUnknownOption(ReviewIdSchema);
const decodeChannelId = Schema.decodeUnknownOption(ChannelIdSchema);

const threadNotFound = () => Effect.fail(new InboxReviewThreadNotFound());

const reviewNotFound = () => Effect.fail(new InboxReviewNotFound());

const badRequest = () => Effect.fail(new HttpApiError.BadRequest());

const unavailable = ({ ability, standing }: AbilityUnavailable) =>
  Effect.fail(new InboxActionUnavailable({ ability, standing }));

const actionFailed = ({ reason }: ReviewActionFailed) =>
  Effect.fail(new InboxActionFailed({ reason }));

const pending = ({ replyId }: ReviewReplyPending) =>
  Effect.fail(new ReplyPending({ replyId }));

const tooLong = ({ length, maximum, unit }: ReplyTooLong) =>
  Effect.fail(new ReplyInvalid({ length, maximum, reason: "tooLong", unit }));

const empty = () =>
  Effect.fail(
    new ReplyInvalid({
      length: null,
      maximum: null,
      reason: "empty",
      unit: null,
    })
  );

// An id that is not one of Peal's names nothing: as one not found.
const idOr = <A, E>(
  found: Option.Option<A>,
  missing: () => Effect.Effect<never, E>
): Effect.Effect<A, E> =>
  Option.match(found, { onNone: missing, onSome: Effect.succeed });

// A filter's id that names nothing is a bad request rather than a list
// of everything.
const filterOf = <A>(
  text: string | undefined,
  decode: (value: string) => Option.Option<A>
): Effect.Effect<Option.Option<A>, HttpApiError.BadRequest> => {
  if (text === undefined) {
    return Effect.succeed(Option.none());
  }

  return Option.match(decode(text), {
    onNone: badRequest,
    onSome: (id) => Effect.succeed(Option.some(id)),
  });
};

// A failure of the server's own (the database, a bug) is a defect: 500.
export const InboxReviewsHandlers = HttpApiBuilder.group(
  Api,
  "inboxReviews",
  Effect.fn(function* inboxReviewsHandlers(handlers) {
    const reviews = yield* EngagementReviews;

    return handlers.handleAll({
      getReviewThread: ({ params }) =>
        Effect.gen(function* getReviewThread() {
          const actor = actorOf(yield* CurrentMember);

          const threadId = yield* idOr(
            decodeThreadId(params.threadId),
            threadNotFound
          );

          return yield* reviews.thread(actor, threadId).pipe(
            Effect.map(toReviewThreadDetailView),
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: forbidden,
              ReviewThreadNotFound: threadNotFound,
            })
          );
        }),
      listReviewThreads: ({ query }) =>
        Effect.gen(function* listReviewThreads() {
          const actor = actorOf(yield* CurrentMember);
          const channelId = yield* filterOf(query.channelId, decodeChannelId);
          const after = yield* filterOf(query.cursor, reviewCursorOf);

          return yield* reviews
            .threads(
              actor,
              { channelId, unanswered: query.unanswered === "true" },
              { after, limit: query.limit ?? defaultInboxPageSize }
            )
            .pipe(
              Effect.map(toReviewThreadPageView),
              Effect.catchTags({
                DatabaseError: Effect.die,
                MissingPermission: forbidden,
              })
            );
        }),
      replyToReview: ({ headers, params, payload }) =>
        Effect.gen(function* replyToReview() {
          const actor = actorOf(yield* CurrentMember);

          const reviewId = yield* idOr(
            decodeReviewId(params.reviewId),
            reviewNotFound
          );

          return yield* reviews
            .reply(
              actor,
              reviewId,
              payload.text,
              Option.fromUndefinedOr(headers["idempotency-key"])
            )
            .pipe(
              Effect.map(toReviewReplyView),
              Effect.catchTags({
                AbilityUnavailable: unavailable,
                DatabaseError: Effect.die,
                MissingPermission: forbidden,
                ReplyEmpty: empty,
                ReplyKeyReused: () => Effect.fail(new IdempotencyKeyReused()),
                ReplyTooLong: tooLong,
                ReviewNotFound: reviewNotFound,
                ReviewReplyNeedsPerson: forbidden,
                ReviewReplyPending: pending,
              })
            );
        }),
      setReviewAnswered: ({ params, payload }) =>
        Effect.gen(function* setReviewAnswered() {
          const actor = actorOf(yield* CurrentMember);

          const reviewId = yield* idOr(
            decodeReviewId(params.reviewId),
            reviewNotFound
          );

          return yield* reviews
            .setAnswered(actor, reviewId, payload.answered)
            .pipe(
              Effect.map(toReviewView),
              Effect.catchTags({
                DatabaseError: Effect.die,
                MissingPermission: forbidden,
                ReviewNotFound: reviewNotFound,
              })
            );
        }),
      withdrawReviewReply: ({ params }) =>
        Effect.gen(function* withdrawReviewReply() {
          const actor = actorOf(yield* CurrentMember);

          const reviewId = yield* idOr(
            decodeReviewId(params.reviewId),
            reviewNotFound
          );

          return yield* reviews.withdraw(actor, reviewId).pipe(
            Effect.map(toReviewView),
            Effect.catchTags({
              AbilityUnavailable: unavailable,
              DatabaseError: Effect.die,
              MissingPermission: forbidden,
              ReviewActionFailed: actionFailed,
              ReviewNotFound: reviewNotFound,
              ReviewReplyNeedsPerson: forbidden,
            })
          );
        }),
    });
  })
);
