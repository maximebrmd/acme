import { Schema } from "effect";

/** The address opened or used connect links too many times for now. */
export class TooManyConnectAttempts extends Schema.TaggedError<TooManyConnectAttempts>()(
  "TooManyConnectAttempts",
  {},
  {
    description:
      "The address opened or used connect links too many times in the last hour. Try again later.",
    httpApiStatus: 429,
  }
) {}
