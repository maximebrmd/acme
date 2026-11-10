import { Schema } from "effect";

import { PostIdSchema } from "#shared/domain/ids.ts";

/**
 * An application asked for the post to go out, so an application does not
 * approve it: a member does, in person, or a visitor through a link a
 * member made in person. For the same reason no application makes a link
 * that approves.
 */
export class ApprovalNeedsPerson extends Schema.TaggedError<ApprovalNeedsPerson>()(
  "ApprovalNeedsPerson",
  { postId: PostIdSchema }
) {}
