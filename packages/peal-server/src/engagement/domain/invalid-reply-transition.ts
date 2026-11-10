import { Schema } from "effect";

import { ReplyIdSchema } from "./reply-id.ts";

/** A reply was asked to move on from a state that does not allow it. */
export class InvalidReplyTransition extends Schema.TaggedError<InvalidReplyTransition>()(
  "InvalidReplyTransition",
  {
    from: Schema.Literals([
      "sending",
      "sent",
      "failed",
      "unconfirmed",
      "withdrawn",
    ]),
    replyId: ReplyIdSchema,
  }
) {}
