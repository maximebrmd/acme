import { Schema } from "effect";

/** The reply is longer than its platform takes, counted as the platform counts. */
export class ReplyTooLong extends Schema.TaggedError<ReplyTooLong>()(
  "ReplyTooLong",
  {
    length: Schema.Int,
    maximum: Schema.Int,
    unit: Schema.String,
  }
) {}
