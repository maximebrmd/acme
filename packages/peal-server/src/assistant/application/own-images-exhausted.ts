import { Schema } from "effect";

/**
 * The workspace asked its own image provider for `ownImagesPerDay` images
 * today (UTC): no more until the day ends. It spends nothing of Peal's
 * allowance, and bounds what a workspace holds of the server for free.
 */
export class OwnImagesExhausted extends Schema.TaggedError<OwnImagesExhausted>()(
  "OwnImagesExhausted",
  { dailyLimit: Schema.Int, resetsAt: Schema.DateTimeUtc }
) {}
