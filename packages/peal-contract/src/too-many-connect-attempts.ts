import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The address opened or used connect links too many times for now. */
export class TooManyConnectAttempts extends Schema.TaggedError<TooManyConnectAttempts>()(
  "TooManyConnectAttempts",
  { ...errorEnvelope },
  {
    description:
      "The address opened or used connect links too many times in the last hour. Try again later.",
    httpApiStatus: 429,
  }
) {}
