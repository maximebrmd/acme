import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/**
 * The channel is the last one the post still goes out on: removing it
 * would leave the post going nowhere. Cancel the post instead.
 */
export class LastTargetLeft extends Schema.TaggedError<LastTargetLeft>()(
  "LastTargetLeft",
  { ...errorEnvelope },
  {
    description:
      "The channel is the last one the post still goes out on: cancel the post instead.",
    httpApiStatus: 409,
  }
) {}
