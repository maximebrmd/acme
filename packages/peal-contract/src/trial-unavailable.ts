import { Schema } from "effect";

/**
 * The workspace cannot start the trial: the workspace or the account had a
 * trial or a subscription before (`used`), or the plan or interval asked is
 * not the trial's (`notOffered`).
 */
export class TrialUnavailable extends Schema.TaggedError<TrialUnavailable>()(
  "TrialUnavailable",
  { reason: Schema.Literals(["used", "notOffered"]) },
  {
    description:
      "No trial for this workspace: `used` when the workspace or the account had a trial or a subscription before, `notOffered` for another plan or interval than the trial's. Nothing was ordered.",
    httpApiStatus: 409,
  }
) {}
