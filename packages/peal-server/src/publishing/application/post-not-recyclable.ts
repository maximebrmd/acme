import { Schema } from "effect";

import { PostIdSchema } from "#shared/domain/ids.ts";

/**
 * Why a post cannot be the source of a rule: it never went out and is not
 * on its way (`draft`, `awaitingApproval`, `cancelled`), another rule
 * repeats it (`repeating`), a rule made it (`occurrence`), or none of its
 * channels is connected any more (`noChannels`).
 */
export const NotRecyclableReasonSchema = Schema.Literals([
  "draft",
  "awaitingApproval",
  "cancelled",
  "repeating",
  "occurrence",
  "noChannels",
]);

export type NotRecyclableReason = typeof NotRecyclableReasonSchema.Type;

/** The post cannot start a recycling rule, for `reason`. */
export class PostNotRecyclable extends Schema.TaggedError<PostNotRecyclable>()(
  "PostNotRecyclable",
  { postId: PostIdSchema, reason: NotRecyclableReasonSchema }
) {
  override get message(): string {
    return `Post ${this.postId} cannot repeat (${this.reason})`;
  }
}
