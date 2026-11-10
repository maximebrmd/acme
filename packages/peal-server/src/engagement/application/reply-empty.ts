import { Schema } from "effect";

/** The reply says nothing. */
export class ReplyEmpty extends Schema.TaggedError<ReplyEmpty>()(
  "ReplyEmpty",
  {}
) {}
