import { Schema } from "effect";

/** The workspace keeps as many active or paused follow-up rules as it may. */
export class TooManyFollowUpRules extends Schema.TaggedError<TooManyFollowUpRules>()(
  "TooManyFollowUpRules",
  { allowed: Schema.Int }
) {
  override get message(): string {
    return `A workspace keeps ${String(this.allowed)} follow-up rules at most`;
  }
}
