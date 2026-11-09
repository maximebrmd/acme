import { Schema } from "effect";

import { PostIdSchema } from "#shared/domain/ids.ts";

import { PostStatusNameSchema } from "./post-status.ts";

/** The transitions of `./post.ts`, by name. */
export const PostActionSchema = Schema.Literals([
  "edit",
  "schedule",
  "moveToDraft",
  "startPublishing",
  "finish",
  "cancel",
  "discard",
  "reopen",
]);

export type PostAction = typeof PostActionSchema.Type;

/** A transition the post's current status does not allow. */
export class InvalidPostTransition extends Schema.TaggedError<InvalidPostTransition>()(
  "InvalidPostTransition",
  {
    action: PostActionSchema,
    from: PostStatusNameSchema,
    postId: PostIdSchema,
  }
) {
  override get message(): string {
    return `Cannot ${this.action} post ${this.postId} while it is ${this.from}`;
  }
}
