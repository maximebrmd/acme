import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The workspace keeps as many queues as it may. */
export class TooManyQueues extends Schema.TaggedError<TooManyQueues>()(
  "TooManyQueues",
  { ...errorEnvelope, allowed: Schema.Int },
  {
    description:
      "The workspace keeps `allowed` queues, the most it may: delete one before adding another. Nothing was created.",
    httpApiStatus: 409,
  }
) {}
