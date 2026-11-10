import { Schema } from "effect";

/**
 * How one attempt ended: the receiver answered with a status, and, when
 * that is not a success, the start of what it said; or no answer came.
 *
 * - `timeout`: none within the time allowed.
 * - `connection`: the connection could not be made, or broke.
 * - `refused`: Peal did not send it, as the address is not HTTPS on a
 *   public host (the outbound guard).
 */
export const AttemptOutcomeSchema = Schema.Union([
  Schema.TaggedStruct("answered", {
    excerpt: Schema.Option(Schema.String),
    status: Schema.Int,
  }),
  Schema.TaggedStruct("unanswered", {
    reason: Schema.Literals(["timeout", "connection", "refused"]),
  }),
]);

export type AttemptOutcome = typeof AttemptOutcomeSchema.Type;

/** An attempt of a delivery: when, how long it took, and how it ended. */
export const DeliveryAttemptSchema = Schema.Struct({
  at: Schema.DateTimeUtc,
  durationMs: Schema.Int,
  outcome: AttemptOutcomeSchema,
});

export type DeliveryAttempt = typeof DeliveryAttemptSchema.Type;

/** Whether the receiver took the event: any 2xx answer. */
export const isSuccess = (outcome: AttemptOutcome): boolean =>
  outcome._tag === "answered" && outcome.status >= 200 && outcome.status < 300;

/**
 * Whether the receiver asked for no more deliveries: 410 Gone, which turns
 * the endpoint off.
 */
export const isGone = (outcome: AttemptOutcome): boolean =>
  outcome._tag === "answered" && outcome.status === 410;
