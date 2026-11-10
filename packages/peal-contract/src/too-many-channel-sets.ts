import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The workspace keeps as many channel sets as it may. */
export class TooManyChannelSets extends Schema.TaggedError<TooManyChannelSets>()(
  "TooManyChannelSets",
  { ...errorEnvelope, allowed: Schema.Int },
  {
    description:
      "The workspace keeps `allowed` channel sets, the most it may: delete one before adding another. Nothing was created.",
    httpApiStatus: 409,
  }
) {}
