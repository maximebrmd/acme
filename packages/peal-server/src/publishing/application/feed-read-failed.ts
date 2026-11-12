import { Schema } from "effect";

import { FeedReadFailureSchema } from "#publishing/domain/feed-read-failure.ts";

/**
 * A read of a feed that gave nothing: why, as a code, and how many
 * seconds its host asked Peal to wait first, when it said.
 */
export class FeedReadFailed extends Schema.TaggedError<FeedReadFailed>()(
  "FeedReadFailed",
  {
    failure: FeedReadFailureSchema,
    retryAfterSeconds: Schema.Option(Schema.Finite),
  }
) {
  override get message(): string {
    return `The feed could not be read (${this.failure})`;
  }
}
