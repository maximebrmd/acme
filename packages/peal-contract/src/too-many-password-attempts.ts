import { Schema } from "effect";

/**
 * The account's password was tried too often in a short while: wait a few
 * seconds before trying again, as signing in asks.
 */
export class TooManyPasswordAttempts extends Schema.TaggedError<TooManyPasswordAttempts>()(
  "TooManyPasswordAttempts",
  {},
  {
    description:
      "The account's password was tried three times within 10 seconds. Wait a few seconds, then try again.",
    httpApiStatus: 429,
  }
) {}
