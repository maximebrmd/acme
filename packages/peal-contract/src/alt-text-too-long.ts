import { Schema } from "effect";

/** The description is longer than Peal keeps. */
export class AltTextTooLong extends Schema.TaggedError<AltTextTooLong>()(
  "AltTextTooLong",
  { maxLength: Schema.Int },
  {
    description: "The description is longer than Peal keeps.",
    httpApiStatus: 422,
  }
) {}
