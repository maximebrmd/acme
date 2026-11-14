import { Effect, Schedule, Schema } from "effect";
import { Activity, Workflow } from "effect/workflow";

import { SendReviewReply } from "#engagement/application/send-review-reply.ts";
import { ReviewReplyIdSchema } from "#engagement/domain/review-reply-id.ts";

// Persisted contract: the tag, the payload, the idempotency key, the
// activity name `send` and its result schema. Add payload fields with a
// decoding default, never rename or remove one; for anything else, add
// SendReviewReplyV2 beside this one. The payload holds the reply's id: its
// text stays in the engagement tables.

/** How a run left its reply, as the workflow stores it. */
export const ReviewSendResultSchema = Schema.Literals([
  "settled",
  "superseded",
  "unrecorded",
]);

/**
 * Sends one reply to a review, which the transaction that journalled it
 * started. One execution per reply, so starting it again does nothing more.
 */
export const SendReviewReplyV1 = Workflow.make("SendReviewReplyV1", {
  idempotencyKey: ({ replyId }) => replyId,
  payload: { replyId: ReviewReplyIdSchema },
});

// A database blip must not strand the reply: the step retries for about
// three minutes. Each try reads the journal first, so one made after the
// call set out reads the review back instead of sending blindly.
const databaseRetry = Schedule.min([
  Schedule.exponential("200 millis", 2),
  Schedule.spaced("30 seconds"),
]);

export const SendReviewReplyV1Live = SendReviewReplyV1.toLayer(
  Effect.fn("SendReviewReplyV1")(function* sendReviewReply({ replyId }) {
    const result = yield* Activity.make({
      execute: SendReviewReply.use((sending) => sending.run(replyId)).pipe(
        Effect.retry({ schedule: databaseRetry, times: 10 }),
        Effect.catchTag("DatabaseError", (failed) =>
          Effect.logError(
            "A reply to a review could not be read or recorded: the collection hands it to the next read of its location",
            failed
          ).pipe(
            Effect.annotateLogs({ replyId }),
            Effect.as("unrecorded" as const)
          )
        )
      ),
      name: "send",
      success: ReviewSendResultSchema,
    });

    return result;
  })
);
