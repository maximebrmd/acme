import { Schema } from "effect";

/**
 * Only a signed-in person may do this, not an API key: an API key creating
 * keys would let one leaked key outlive its own revocation.
 */
export class UserRequired extends Schema.TaggedError<UserRequired>()(
  "UserRequired",
  {}
) {}
