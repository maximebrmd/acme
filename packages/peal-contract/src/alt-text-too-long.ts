import { Schema } from "effect";

/** The description is longer tha Peal keeps. */
export class AltTextTooLong extends Schema.TaggedError<AltTextTooLong>()(
  "AltTextTooLong",
  { maxLength: Schema.Int },
  {
    description: "The description is longer tha Peal keeps.",
    httpApiStatus: 422,
  }
) {}
