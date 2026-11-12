import { Schema } from "effect";

/** The workspace follows as many feeds as it may. */
export class TooManyFeeds extends Schema.TaggedError<TooManyFeeds>()(
  "TooManyFeeds",
  { allowed: Schema.Int }
) {
  override get message(): string {
    return `A workspace follows ${String(this.allowed)} feeds at most`;
  }
}
