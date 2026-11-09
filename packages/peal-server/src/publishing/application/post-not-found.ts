import { Schema } from "effect";

import { PostIdSchema } from "#shared/domain/ids.ts";

/** No post has this id. */
export class PostNotFound extends Schema.TaggedError<PostNotFound>()(
  "PostNotFound",
  { postId: PostIdSchema }
) {
  override get message(): string {
    return `No post has the id ${this.postId}`;
  }
}
