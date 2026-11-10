import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The workspace keeps as many tags as it may. */
export class TooManyTags extends Schema.TaggedError<TooManyTags>()(
  "TooManyTags",
  { ...errorEnvelope, allowed: Schema.Int },
  {
    description:
      "The workspace keeps `allowed` tags, the most it may: delete one before adding another. Nothing was created.",
    httpApiStatus: 409,
  }
) {}
