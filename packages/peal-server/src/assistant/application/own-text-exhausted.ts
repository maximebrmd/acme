import { Schema } from "effect";

/**
 * The workspace sent its own text provider `ownTextRequestsPerDay`
 * requests today (UTC): no more until the day ends. It spends nothing of
 * Peal's allowance, and bounds what a workspace holds of the server for
 * free.
 */
export class OwnTextExhausted extends Schema.TaggedError<OwnTextExhausted>()(
  "OwnTextExhausted",
  { dailyLimit: Schema.Int, resetsAt: Schema.DateTimeUtc }
) {}
