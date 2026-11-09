import { Schema } from "effect";

/** The workspace sent the assistant every request it may send today. */
export class AssistantQuotaExceeded extends Schema.TaggedError<AssistantQuotaExceeded>()(
  "AssistantQuotaExceeded",
  {
    dailyLimit: Schema.Int,
    // Midnight UTC, when the workspace's requests count from zero again.
    resetsAt: Schema.DateTimeUtc,
  },
  {
    description:
      "The workspace used every assistant request it has today. Try again after `resetsAt`.",
    httpApiStatus: 429,
  }
) {}
