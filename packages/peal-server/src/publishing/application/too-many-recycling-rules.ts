import { Schema } from "effect";

/** The workspace keeps as many active or paused rules as it may. */
export class TooManyRecyclingRules extends Schema.TaggedError<TooManyRecyclingRules>()(
  "TooManyRecyclingRules",
  { allowed: Schema.Int }
) {
  override get message(): string {
    return `A workspace keeps ${String(this.allowed)} recycling rules at most`;
  }
}
