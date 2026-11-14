import { Effect, Schedule, Schema } from "effect";
import { Activity, Workflow } from "effect/workflow";

import { SendMessage } from "#engagement/application/send-message.ts";
import { OutgoingMessageIdSchema } from "#engagement/domain/outgoing-message-id.ts";

// Persisted contract: the tag, the payload, the idempotency key, the
// activity name `send` and its result schema. Add payload fields with a
// decoding default, never rename or remove one; for anything else, add
// SendMessageV2 beside this one. The payload holds the message's id: its
// text stays in the engagement tables, never in the cluster's.

/** How a run left its message, as the workflow stores it. */
export const MessageSendResultSchema = Schema.Literals([
  "settled",
  "superseded",
  "unrecorded",
]);

/**
 * Sends one direct message, which the transaction that journalled it
 * started. One execution per message, so starting it again does nothing
 * more.
 */
export const SendMessageV1 = Workflow.make("SendMessageV1", {
  idempotencyKey: ({ messageId }) => messageId,
  payload: { messageId: OutgoingMessageIdSchema },
});

// A database blip must not strand the message: the step retries for about
// three minutes. Each try reads the journal first, so one made after the
// call set out looks the message up instead of sending blindly.
const databaseRetry = Schedule.min([
  Schedule.exponential("200 millis", 2),
  Schedule.spaced("30 seconds"),
]);

export const SendMessageV1Live = SendMessageV1.toLayer(
  Effect.fn("SendMessageV1")(function* sendMessage({ messageId }) {
    const result = yield* Activity.make({
      execute: SendMessage.use((sending) => sending.run(messageId)).pipe(
        Effect.retry({ schedule: databaseRetry, times: 10 }),
        // Logged by its id alone: the failure may quote the message.
        Effect.catchTag("DatabaseError", () =>
          Effect.logError(
            "A direct message could not be read or recorded: the collection hands it to a person within the hour"
          ).pipe(
            Effect.annotateLogs({ messageId }),
            Effect.as("unrecorded" as const)
          )
        )
      ),
      name: "send",
      success: MessageSendResultSchema,
    });

    return result;
  })
);
