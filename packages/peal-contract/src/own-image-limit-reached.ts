import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/**
 * The workspace asked its own image provider for as many images as a day
 * allows (UTC): none of Peal's assistant requests were spent.
 */
export class OwnImageLimitReached extends Schema.TaggedError<OwnImageLimitReached>()(
  "OwnImageLimitReached",
  {
    ...errorEnvelope,
    // How many images a workspace's own provider is asked for each day.
    dailyLimit: Schema.Int,
    // Midnight UTC, when the day's count starts again.
    resetsAt: Schema.DateTimeUtc,
  },
  {
    description:
      "The workspace asked its own image provider for `dailyLimit` images today, the most a day allows, whatever each ended with; ask again from `resetsAt`. Nothing of Peal's assistant requests was spent.",
    httpApiStatus: 429,
  }
) {}
