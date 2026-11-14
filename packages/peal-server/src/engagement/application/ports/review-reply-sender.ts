import { Context, Schema } from "effect";
import type { Effect } from "effect";

import { ReviewIdSchema } from "#engagement/domain/review-id.ts";
import { ReviewReplyIdSchema } from "#engagement/domain/review-reply-id.ts";
import { ReviewReplyFailureSchema } from "#engagement/domain/review-reply.ts";
import type { ReviewSendOutcome } from "#engagement/domain/review-reply.ts";
import { OwnerReplySchema } from "#engagement/domain/review.ts";
import { ChannelIdSchema } from "#shared/domain/ids.ts";

export { ReviewSendOutcomeSchema } from "#engagement/domain/review-reply.ts";

export type { ReviewSendOutcome } from "#engagement/domain/review-reply.ts";

/** A reply to a review to send, by id: its text stays in the engagement tables. */
export const ReviewReplyRequestSchema = Schema.Struct({
  channelId: ChannelIdSchema,
  replyId: ReviewReplyIdSchema,
});

export type ReviewReplyRequest = typeof ReviewReplyRequestSchema.Type;

/** A review whose reply to delete, by id. */
export const ReviewWithdrawalSchema = Schema.Struct({
  channelId: ChannelIdSchema,
  reviewId: ReviewIdSchema,
});

export type ReviewWithdrawal = typeof ReviewWithdrawalSchema.Type;

/**
 * How deleting the location's reply ended: done (or none was there), or
 * not, with why. Not knowing counts as not done: asking again is safe.
 */
export const ReviewActionOutcomeSchema = Schema.Union([
  Schema.TaggedStruct("done", {}),
  Schema.TaggedStruct("failed", { reason: ReviewReplyFailureSchema }),
]);

export type ReviewActionOutcome = typeof ReviewActionOutcomeSchema.Type;

/**
 * What reading one review back found: the location's reply as it stands
 * (none when it has none), the review gone, or nothing Peal can tell.
 */
export const ReviewReplyCheckSchema = Schema.Union([
  Schema.TaggedStruct("found", { reply: Schema.Option(OwnerReplySchema) }),
  Schema.TaggedStruct("gone", {}),
  Schema.TaggedStruct("unknown", {}),
]);

export type ReviewReplyCheck = typeof ReviewReplyCheckSchema.Type;

/**
 * Answers reviews on their platform as the location, through the
 * channel's gate: one call at a time with its publishing.
 *
 * `send` puts the reply on the review, which replaces the one it held;
 * `resume` is for a reply an earlier run may already have sent: it reads
 * the review back, answers `sent` when the reply is there, and sends
 * otherwise, as setting the reply again shows it once. Neither fails:
 * every ending is a `ReviewSendOutcome`.
 */
export class ReviewReplySender extends Context.Service<
  ReviewReplySender,
  {
    readonly send: (
      request: ReviewReplyRequest
    ) => Effect.Effect<ReviewSendOutcome>;
    readonly resume: (
      request: ReviewReplyRequest
    ) => Effect.Effect<ReviewSendOutcome>;
    /**
     * Reads the review of an unconfirmed reply back, sending nothing: the
     * reply's fate, settled within hours rather than at a read of the
     * whole location.
     */
    readonly check: (
      request: ReviewReplyRequest
    ) => Effect.Effect<ReviewReplyCheck>;
    /** Deletes the location's reply to the review, whoever wrote it. */
    readonly withdraw: (
      request: ReviewWithdrawal
    ) => Effect.Effect<ReviewActionOutcome>;
  }
>()("peal-server/engagement/application/ReviewReplySender") {}
