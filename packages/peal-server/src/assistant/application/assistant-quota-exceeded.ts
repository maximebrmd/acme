import { Schema } from "effect";

/** The workspace sent the assistant every request it may send today. */
export class AssistantQuotaExceeded extends Schema.TaggedError<AssistantQuotaExceeded>()(
  "AssistantQuotaExceeded",
  { dailyLimit: Schema.Int, resetsAt: Schema.DateTimeUtc }
) {
  override get message(): string {
    return `The workspace used its ${this.dailyLimit} assistant requests for today`;
  }
}
