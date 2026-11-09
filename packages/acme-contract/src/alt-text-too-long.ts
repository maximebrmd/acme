import { Schema } from "effect";

/** The description is longer than Acme keeps. */
export class AltTextTooLong extends Schema.TaggedError<AltTextTooLong>()(
  "AltTextTooLong",
  { maxLength: Schema.Int },
  {
    description: "The description is longer than Acme keeps.",
    httpApiStatus: 422,
  }
) {}
