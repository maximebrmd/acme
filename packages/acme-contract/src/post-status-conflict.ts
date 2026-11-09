import { Schema } from "effect";

import { PostStatusSchema } from "./post-status.ts";

/**
 * The post's status does not allow this: only a draft is edited or given
 * channels, a post that finished or was cancelled stays as it is.
 */
export class PostStatusConflict extends Schema.TaggedError<PostStatusConflict>()(
  "PostStatusConflict",
  { status: PostStatusSchema },
  {
    description:
      "The post's status does not allow this. `status` is the status it has.",
    httpApiStatus: 409,
  }
) {}
