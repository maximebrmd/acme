import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** A reply to this comment is on its way, or may have gone out: settle it before writing another, so the same answer never shows twice. */
export class ReplyPending extends Schema.TaggedError<ReplyPending>()(
  "ReplyPending",
  {
    ...errorEnvelope,
    // The reply to settle first.
    replyId: Schema.String,
  },
  {
    description:
      "A reply to this comment is on its way, or may have gone out: settle it before writing another, so the same answer never shows twice.",
    httpApiStatus: 409,
  }
) {}
