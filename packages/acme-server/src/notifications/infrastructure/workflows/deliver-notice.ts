import { Duration, Effect, Schema } from "effect";
import { Activity, DurableClock, Workflow } from "effect/workflow";

import { DeliverNoticeEmails } from "#notifications/application/deliver-notice-emails.ts";

import { retryingDatabase } from "./activity-retry.ts";

// Persisted contract: the tag, the payload, the idempotency key, the
// activity names `send/<n>` and `abandon`, the clock names `retry/<n>`, and
// every result schema. Add payload fields with a decoding default, never
// rename or remove one; for anything else, add DeliverNoticeV2 beside this
// one.

// How long to wait before each new try, while the transport refuses some
// emails for now: about five hours in all, then the rest are given up.
const retryDelays: readonly Duration.Duration[] = [
  Duration.minutes(1),
  Duration.minutes(5),
  Duration.minutes(15),
  Duration.hours(1),
  Duration.hours(4),
];

/**
 * Sends the emails of one event's notices, which the transaction that saved
 * them started. One execution per event key, so starting it again does
 * nothing more.
 */
export const DeliverNoticeV1 = Workflow.make("DeliverNoticeV1", {
  idempotencyKey: ({ key }) => key,
  payload: { key: Schema.NonEmptyString },
});

// Each try is its own activity, so a replay reads how many were left instead
// of sending again.
const sendTry = (key: string, attempt: number) =>
  Activity.make({
    execute: DeliverNoticeEmails.use((emails) => emails.deliver(key)).pipe(
      retryingDatabase
    ),
    name: `send/${attempt}`,
    success: Schema.Int,
  });

export const DeliverNoticeV1Live = DeliverNoticeV1.toLayer(
  Effect.fn("DeliverNoticeV1")(function* deliverNotice({ key }) {
    let attempt = 1;
    let left = yield* sendTry(key, attempt);

    for (const delay of retryDelays) {
      if (left === 0) {
        return;
      }

      yield* DurableClock.sleep({
        duration: delay,
        inMemoryThreshold: Duration.zero,
        name: `retry/${attempt}`,
      });

      attempt += 1;
      left = yield* sendTry(key, attempt);
    }

    if (left > 0) {
      yield* Activity.make({
        execute: DeliverNoticeEmails.use((emails) => emails.abandon(key)).pipe(
          retryingDatabase
        ),
        name: "abandon",
      });
    }
  })
);
