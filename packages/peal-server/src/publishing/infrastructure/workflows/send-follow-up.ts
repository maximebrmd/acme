import { Effect, Schedule, Schema } from "effect";
import { Activity, Workflow } from "effect/workflow";

import { SendFollowUp } from "#publishing/application/send-follow-up.ts";
import { FollowUpIdSchema } from "#publishing/domain/follow-up-id.ts";

// Persisted contract: the tag, the payload, the idempotency key, the
// activity name `send` and its result schema. Add payload fields with a
// decoding default, never rename or remove one; for anything else, add
// SendFollowUpV2 beside this one. The payload holds the follow-up's id:
// its text stays in the publishing tables.

/** How a run left its follow-up, as the workflow stores it. */
export const FollowUpSendResultSchema = Schema.Literals([
  "settled",
  "superseded",
  "unrecorded",
]);

/**
 * Carries out one attempt of a follow-up, which the transaction that
 * triggered it started: one execution per follow-up and attempt, so
 * starting it again does nothing more, and an attempt after the platform
 * put the follow-up off is a new one.
 */
export const SendFollowUpV1 = Workflow.make("SendFollowUpV1", {
  idempotencyKey: ({ attempt, followUpId }) => `${followUpId}:${String(attempt)}`,
  payload: { attempt: Schema.Int, followUpId: FollowUpIdSchema },
});

// A database blip must not strand the follow-up: the step retries for
// about three minutes. Each try reads the journal first, so one made after
// the call set out looks it up instead of sending it again.
const databaseRetry = Schedule.min([
  Schedule.exponential("200 millis", 2),
  Schedule.spaced("30 seconds"),
]);

export const SendFollowUpV1Live = SendFollowUpV1.toLayer(
  Effect.fn("SendFollowUpV1")(function* sendFollowUp({ attempt, followUpId }) {
    const result = yield* Activity.make({
      execute: SendFollowUp.use((sending) =>
        sending.run(followUpId, attempt)
      ).pipe(
        Effect.retry({ schedule: databaseRetry, times: 10 }),
        Effect.catchTag("DatabaseError", (failed) =>
          Effect.logError(
            "A follow-up could not be read or recorded: the follow-ups' run hands it over",
            failed
          ).pipe(
            Effect.annotateLogs({ followUpId }),
            Effect.as("unrecorded" as const)
          )
        )
      ),
      name: "send",
      success: FollowUpSendResultSchema,
    });

    return result;
  })
);
