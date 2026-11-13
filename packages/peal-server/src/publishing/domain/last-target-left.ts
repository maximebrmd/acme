import { Schema } from "effect";

import { PostIdSchema } from "#shared/domain/ids.ts";

import { PostTargetIdSchema } from "./post-target-id.ts";

/**
 * Removing the target would leave its post going out nowhere: the post is
 * cancelled instead.
 */
export class LastTargetLeft extends Schema.TaggedError<LastTargetLeft>()(
  "LastTargetLeft",
  { postId: PostIdSchema, targetId: PostTargetIdSchema }
) {
  override get message(): string {
    return `Target ${this.targetId} is the last one of post ${this.postId}: cancel the post instead`;
  }
}
