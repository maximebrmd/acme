import { Schema } from "effect";

import { PostIdSchema } from "#shared/domain/ids.ts";

/**
 * The post is past reviewing: it went out, is going out, or was cancelled.
 */
export class PostNotReviewable extends Schema.TaggedError<PostNotReviewable>()(
  "PostNotReviewable",
  { postId: PostIdSchema, status: Schema.Literals(["published", "cancelled"]) }
) {}
