import { Schema } from "effect";

/** The workspace keeps as many active or paused comment rules as it may. */
export class TooManyCommentRules extends Schema.TaggedError<TooManyCommentRules>()(
  "TooManyCommentRules",
  { allowed: Schema.Int }
) {
  override get message(): string {
    return `A workspace keeps ${String(this.allowed)} comment rules at most`;
  }
}
