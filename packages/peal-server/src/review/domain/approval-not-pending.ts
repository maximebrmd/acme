import { Schema } from "effect";

import { PostIdSchema } from "#shared/domain/ids.ts";

/** No approval is asked for the post, or it was already decided. */
export class ApprovalNotPending extends Schema.TaggedError<ApprovalNotPending>()(
  "ApprovalNotPending",
  { postId: PostIdSchema }
) {}
