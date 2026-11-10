import { Schema } from "effect";

import { ReplyIdSchema } from "#engagement/domain/reply-id.ts";

/** The workspace has no such reply. */
export class ReplyNotFound extends Schema.TaggedError<ReplyNotFound>()(
  "ReplyNotFound",
  {
    replyId: ReplyIdSchema,
  }
) {}
