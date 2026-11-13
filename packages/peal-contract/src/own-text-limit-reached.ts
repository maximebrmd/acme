import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/**
 * The workspace sent its own text provider as many requests as a day
 * allows (UTC): none of Peal's assistant requests were spent.
 */
export class OwnTextLimitReached extends Schema.TaggedError<OwnTextLimitReached>()(
  "OwnTextLimitReached",
  {
    ...errorEnvelope,
    // How many requests a workspace's own text provider is sent each day.
    dailyLimit: Schema.Int,
    // Midnight UTC, when the day's count starts again.
    resetsAt: Schema.DateTimeUtc,
  },
  {
    description:
      "The workspace sent its own text provider `dailyLimit` requests today, the most a day allows, whatever each ended with; ask again from `resetsAt`. Nothing of Peal's assistant requests was spent.",
    httpApiStatus: 429,
  }
) {}
