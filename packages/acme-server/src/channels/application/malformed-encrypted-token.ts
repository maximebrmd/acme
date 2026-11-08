import { Schema } from "effect";

/** A stored token that is not in the form the cipher writes. */
export class MalformedEncryptedToken extends Schema.TaggedError<MalformedEncryptedToken>()(
  "MalformedEncryptedToken",
  {}
) {}
