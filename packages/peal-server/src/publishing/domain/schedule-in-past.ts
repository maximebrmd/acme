import { DateTime, Schema } from "effect";

import { PostIdSchema } from "#shared/domain/ids.ts";

/** A post scheduled for an instant that has already passed. */
export class ScheduleInPast extends Schema.TaggedError<ScheduleInPast>()(
  "ScheduleInPast",
  {
    at: Schema.DateTimeUtc,
    now: Schema.DateTimeUtc,
    postId: PostIdSchema,
  }
) {
  override get message(): string {
    return `Post ${this.postId} cannot be scheduled at ${DateTime.formatIso(this.at)}, before ${DateTime.formatIso(this.now)}`;
  }
}
