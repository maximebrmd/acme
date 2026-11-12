import { Schema } from "effect";

/** The workspace follows no feed with this id. */
export class FeedNotFound extends Schema.TaggedError<FeedNotFound>()(
  "FeedNotFound",
  { feedId: Schema.String }
) {
  override get message(): string {
    return `No feed ${this.feedId} in this workspace`;
  }
}
