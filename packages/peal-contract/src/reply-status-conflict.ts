import { Schema } from "effect";

/** The reply is not in a state that allows this: only an unconfirmed reply is confirmed, and only a sent one, which Peal knows the address of, is taken back. */
export class ReplyStatusConflict extends Schema.TaggedError<ReplyStatusConflict>()(
  "ReplyStatusConflict",
  {
    // sending, sent, failed, unconfirmed or withdrawn.
    status: Schema.String,
  },
  {
    description:
      "The reply is not in a state that allows this: only an unconfirmed reply is confirmed, and only a sent one, which Peal knows the address of, is taken back.",
    httpApiStatus: 409,
  }
) {}
