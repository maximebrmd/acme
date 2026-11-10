import { Schema } from "effect";

import { PostIdSchema } from "#shared/domain/ids.ts";

/**
 * The post waits for an approval, but not the one the reviewer was shown:
 * it was asked again, or says something else since. They look again.
 */
export class ApprovalChanged extends Schema.TaggedError<ApprovalChanged>()(
  "ApprovalChanged",
  { postId: PostIdSchema }
) {}
