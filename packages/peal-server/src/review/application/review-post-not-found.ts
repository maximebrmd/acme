import { Schema } from "effect";

import { PostIdSchema } from "#shared/domain/ids.ts";

/** The workspace has no such post. */
export class ReviewPostNotFound extends Schema.TaggedError<ReviewPostNotFound>()(
  "ReviewPostNotFound",
  { postId: PostIdSchema }
) {}
