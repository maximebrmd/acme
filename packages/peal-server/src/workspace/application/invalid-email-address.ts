import { Schema } from "effect";

/** Better Auth reads the address invited as no email address. */
export class InvalidEmailAddress extends Schema.TaggedError<InvalidEmailAddress>()(
  "InvalidEmailAddress",
  {}
) {}
