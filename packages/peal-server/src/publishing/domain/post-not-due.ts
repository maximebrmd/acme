import { DateTime, Schema } from "effect";

import { PostIdSchema } from "#shared/domain/ids.ts";

/**
 * Publishing started before the post's scheduled instant, as when a job set
 * for the old time wakes up after the post was moved later.
 */
export class PostNotDue extends Schema.TaggedError<PostNotDue>()("PostNotDue", {
  at: Schema.DateTimeUtc,
  now: Schema.DateTimeUtc,
  postId: PostIdSchema,
}) {
  override get message(): string {
    return `Post ${this.postId} is due at ${DateTime.formatIso(this.at)}, not ${DateTime.formatIso(this.now)}`;
  }
}
