import { Schema } from "effect";

/** The reply says nothing, or is longer than its platform takes, counted as the platform counts. Nothing was sent. */
export class ReplyInvalid extends Schema.TaggedError<ReplyInvalid>()(
  "ReplyInvalid",
  {
    // How long the text that would go out is, in `unit`; null when empty.
    length: Schema.NullOr(Schema.Int),
    // The most the platform takes, in `unit`; null when empty.
    maximum: Schema.NullOr(Schema.Int),
    reason: Schema.Literals(["empty", "tooLong"]),
    // How the platform counts: characters, graphemes, bytes…
    unit: Schema.NullOr(Schema.String),
  },
  {
    description:
      "The reply says nothing, or is longer than its platform takes, counted as the platform counts. Nothing was sent.",
    httpApiStatus: 422,
  }
) {}
