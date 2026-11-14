import { Option, Result, Schema } from "effect";
import type { DateTime } from "effect";

import {
  ChannelIdSchema,
  UserIdSchema,
  WorkspaceIdSchema,
} from "#shared/domain/ids.ts";
import type { UserId } from "#shared/domain/ids.ts";

import { InvalidReviewReplyTransition } from "./invalid-review-reply-transition.ts";
import { ReplyDoubtSchema } from "./reply.ts";
import { ReviewIdSchema } from "./review-id.ts";
import { ReviewReplyIdSchema } from "./review-reply-id.ts";
import type { ReviewReplyId } from "./review-reply-id.ts";
import { ReviewThreadIdSchema } from "./review-thread-id.ts";
import { OwnerReplySchema } from "./review.ts";
import type { OwnerReply, Review } from "./review.ts";

/**
 * The longest reply Google takes to a review: "The maximum length is 4096
 * bytes" (the ReviewReply resource of the My Business API v4,
 * developers.google.com/my-business/reference/rest/v4/accounts.locations.reviews,
 * read 2026-11-14), counted in UTF-8.
 */
export const maxReviewReplyBytes = 4096;

/**
 * Why a reply to a review did not go out. Each means the platform shows
 * nothing of it:
 *
 * - `channelUnavailable`: the channel was disconnected or turned off, or
 *   the inbox no longer reads its platform.
 * - `reconnectNeeded`: the platform refuses the channel's token, or its
 *   account no longer allows replies.
 * - `rateLimited`: the platform asked to slow down.
 * - `platformUnavailable`: the platform did not answer, or failed.
 * - `reviewGone`: the review is no longer on the platform.
 * - `refused`: the platform refused the reply (an unverified location,
 *   a text it does not take).
 * - `notSent`: its outcome was unknown, and the next read found the
 *   location's reply is not it.
 */
export const ReviewReplyFailureSchema = Schema.Literals([
  "channelUnavailable",
  "reconnectNeeded",
  "rateLimited",
  "platformUnavailable",
  "reviewGone",
  "refused",
  "notSent",
]);

export type ReviewReplyFailure = typeof ReviewReplyFailureSchema.Type;

/** How sending a reply to a review ended, as the platform's adapter tells it. */
export const ReviewSendOutcomeSchema = Schema.Union([
  // The location's reply, as the platform answered it.
  Schema.TaggedStruct("sent", { reply: OwnerReplySchema }),
  Schema.TaggedStruct("failed", { reason: ReviewReplyFailureSchema }),
  Schema.TaggedStruct("unconfirmed", { reason: ReplyDoubtSchema }),
]);

export type ReviewSendOutcome = typeof ReviewSendOutcomeSchema.Type;

export const ReviewReplyStatusSchema = Schema.Union([
  // Journalled, and on its way. `attemptedAt` is when a run first set out
  // to call the platform: from then on the call may have left, so a later
  // run reads the review back before it sends.
  Schema.TaggedStruct("sending", {
    attemptedAt: Schema.Option(Schema.DateTimeUtc),
  }),
  Schema.TaggedStruct("sent", { at: Schema.DateTimeUtc }),
  Schema.TaggedStruct("failed", {
    at: Schema.DateTimeUtc,
    reason: ReviewReplyFailureSchema,
  }),
  // It may be the location's reply: the next read of the location says.
  Schema.TaggedStruct("unconfirmed", {
    at: Schema.DateTimeUtc,
    reason: ReplyDoubtSchema,
  }),
  // Sent, then deleted from the platform by a member.
  Schema.TaggedStruct("withdrawn", { at: Schema.DateTimeUtc }),
]);

export type ReviewReplyStatus = typeof ReviewReplyStatusSchema.Type;

/**
 * A public answer to a review, sent from Peal as the location. A review
 * holds one reply on its platform, which a new one replaces: sending is
 * setting that state, so a run that cannot tell whether its call went out
 * reads the review back, and sends again only when the reply is not
 * there. Each is journalled before the platform is called.
 */
export class ReviewReply extends Schema.Class<ReviewReply>(
  "peal-server/engagement/domain/ReviewReply"
)({
  // The member who wrote it; none for an API key, or once they closed
  // their account.
  authorId: Schema.Option(UserIdSchema),
  channelId: ChannelIdSchema,
  createdAt: Schema.DateTimeUtc,
  id: ReviewReplyIdSchema,
  reviewId: ReviewIdSchema,
  status: ReviewReplyStatusSchema,
  text: Schema.NonEmptyString,
  threadId: ReviewThreadIdSchema,
  workspaceId: WorkspaceIdSchema,
}) {}

type Transition = Result.Result<ReviewReply, InvalidReviewReplyTransition>;

type Fields = ConstructorParameters<typeof ReviewReply>[0];

const withFields = (
  reply: ReviewReply,
  changed: Partial<Fields>
): ReviewReply =>
  new ReviewReply({
    authorId: reply.authorId,
    channelId: reply.channelId,
    createdAt: reply.createdAt,
    id: reply.id,
    reviewId: reply.reviewId,
    status: reply.status,
    text: reply.text,
    threadId: reply.threadId,
    workspaceId: reply.workspaceId,
    ...changed,
  });

const refused = (reply: ReviewReply): Transition =>
  Result.fail(
    new InvalidReviewReplyTransition({
      from: reply.status._tag,
      replyId: reply.id,
    })
  );

/** How long a reply's text is as Google counts it: UTF-8 bytes. */
export const reviewReplyBytes = (text: string): number =>
  new TextEncoder().encode(text).length;

/** A reply to the review, about to be journalled and sent. */
export const writeReviewReply = (
  id: ReviewReplyId,
  review: Pick<Review, "channelId" | "id" | "threadId" | "workspaceId">,
  authorId: Option.Option<UserId>,
  text: string,
  now: DateTime.Utc
): ReviewReply =>
  new ReviewReply({
    authorId,
    channelId: review.channelId,
    createdAt: now,
    id,
    reviewId: review.id,
    status: { _tag: "sending", attemptedAt: Option.none() },
    text,
    threadId: review.threadId,
    workspaceId: review.workspaceId,
  });

/**
 * The reply as a run sets out to call the platform, recorded before the
 * call. Refused when the reply is no longer on its way.
 */
export const beginReviewReply = (
  reply: ReviewReply,
  now: DateTime.Utc
): Transition =>
  reply.status._tag === "sending"
    ? Result.succeed(
        withFields(reply, {
          status: {
            _tag: "sending",
            attemptedAt: Option.orElse(reply.status.attemptedAt, () =>
              Option.some(now)
            ),
          },
        })
      )
    : refused(reply);

/** Whether an earlier run may already have called the platform. */
export const reviewReplyAttempted = (reply: ReviewReply): boolean =>
  reply.status._tag === "sending" && Option.isSome(reply.status.attemptedAt);

/** Records how sending ended. Only a reply on its way can end. */
export const settleReviewReply = (
  reply: ReviewReply,
  outcome: ReviewSendOutcome,
  now: DateTime.Utc
): Transition => {
  if (reply.status._tag !== "sending") {
    return refused(reply);
  }

  if (outcome._tag === "sent") {
    return Result.succeed(
      withFields(reply, { status: { _tag: "sent", at: now } })
    );
  }

  if (outcome._tag === "failed") {
    return Result.succeed(
      withFields(reply, {
        status: { _tag: "failed", at: now, reason: outcome.reason },
      })
    );
  }

  return Result.succeed(
    withFields(reply, {
      status: { _tag: "unconfirmed", at: now, reason: outcome.reason },
    })
  );
};

// Google may trim what it is given, write its line breaks and spaces
// otherwise, or compose letters another way: a reply is the same when its
// text is, its letters composed (NFC) and each run of white space one
// space.
const normalized = (text: string): string =>
  text.normalize("NFC").replaceAll(/\s+/gu, " ").trim();

const sameText = (left: string, right: string): boolean =>
  normalized(left) === normalized(right);

/** Whether the location's reply, as read, is this reply's text. */
export const isLocationReply = (
  reply: Pick<ReviewReply, "text">,
  found: Option.Option<OwnerReply>
): boolean => Option.exists(found, ({ text }) => sameText(text, reply.text));

/**
 * Settles a reply Peal could not confirm from what a read of its review
 * found: the location's reply is its text, so it went out; or it is not,
 * and the location shows nothing of it.
 */
export const settleByReading = (
  reply: ReviewReply,
  found: Option.Option<OwnerReply>,
  now: DateTime.Utc
): Transition =>
  reply.status._tag === "unconfirmed"
    ? Result.succeed(
        withFields(reply, {
          status: isLocationReply(reply, found)
            ? { _tag: "sent", at: now }
            : { _tag: "failed", at: now, reason: "notSent" },
        })
      )
    : refused(reply);

/** The reply once the location's reply was deleted from the platform. */
export const withdrawReviewReply = (
  reply: ReviewReply,
  now: DateTime.Utc
): Transition =>
  reply.status._tag === "sent"
    ? Result.succeed(
        withFields(reply, { status: { _tag: "withdrawn", at: now } })
      )
    : refused(reply);

/** The reply without its author, once their account is closed. */
export const forgetReviewReplyAuthor = (reply: ReviewReply): ReviewReply =>
  withFields(reply, { authorId: Option.none() });
