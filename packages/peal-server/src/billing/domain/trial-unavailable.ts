import { Schema } from "effect";

/**
 * The workspace cannot start a trial: the workspace or the account had one
 * or a subscription before (`used`), or the plan or interval asked is not
 * the trial's (`notOffered`).
 */
export class TrialUnavailable extends Schema.TaggedError<TrialUnavailable>()(
  "TrialUnavailable",
  { reason: Schema.Literals(["used", "notOffered"]) }
) {
  override get message(): string {
    return `No trial for this workspace: ${this.reason}`;
  }
}
