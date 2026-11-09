import { Schema } from "effect";

/**
 * The account's password was tried too often in a short while, so it is not
 * checked again yet: guessing it takes as long as through the sign-in form.
 */
export class TooManyPasswordAttempts extends Schema.TaggedError<TooManyPasswordAttempts>()(
  "TooManyPasswordAttempts",
  {}
) {}
