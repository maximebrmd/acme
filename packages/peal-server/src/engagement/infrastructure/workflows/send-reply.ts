import { Effect, Schedule, Schema } from "effect";
import { Activity, Workflow } from "effect/workflow";

import { SendReply } from "#engagement/application/send-reply.ts";
import { ReplyIdSchema } from "#engagement/domain/reply-id.ts";

// Persisted contract: the tag, the payload, the idempotency key, the
// activity name `send` and its result schema. Add payload fields with a
// decoding default, never rename or remove one; for anything else, add
// SendReplyV2 beside this one. The payload holds the reply's id: its text
// stays in the engagement tables.

/** How a run left its reply, as the workflow stores it. */
export const SendResultSchema = Schema.Literals([
  "settled",
  "superseded",
  "unrecorded",
]);

/**
 * Sends one reply, which the transaction that journalled it started. One
 * execution per reply, so starting it again does nothing more.
 */
export const SendReplyV1 = Workflow.make("SendReplyV1", {
  idempotencyKey: ({ replyId }) => replyId,
  payload: { replyId: ReplyIdSchema },
});

// A database blip must not strand the reply: the step retries for about
// three minutes. Each try reads the journal first, so one made after the
// call set out looks the reply up instead of sending it again.
const databaseRetry = Schedule.min([
  Schedule.exponential("200 millis", 2),
  Schedule.spaced("30 seconds"),
]);

export const SendReplyV1Live = SendReplyV1.toLayer(
  Effect.fn("SendReplyV1")(function* sendReply({ replyId }) {
    const result = yield* Activity.make({
      execute: SendReply.use((sending) => sending.run(replyId)).pipe(
        Effect.retry({ schedule: databaseRetry, times: 10 }),
        Effect.catchTag("DatabaseError", (failed) =>
          Effect.logError(
            "A reply could not be read or recorded: it stays on its way until someone settles it",
            failed
          ).pipe(
            Effect.annotateLogs({ replyId }),
            Effect.as("unrecorded" as const)
          )
        )
      ),
      name: "send",
      success: SendResultSchema,
    });

    return result;
  })
);
