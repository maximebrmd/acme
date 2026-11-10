import { Schema } from "effect";

/** The workspace keeps as many tags as it may. */
export class TooManyTags extends Schema.TaggedError<TooManyTags>()(
  "TooManyTags",
  { allowed: Schema.Int }
) {
  override get message(): string {
    return `A workspace keeps ${this.allowed} tags at most`;
  }
}
