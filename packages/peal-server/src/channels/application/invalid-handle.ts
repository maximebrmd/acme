import { Schema } from "effect";

/** The handle, DID or server given names no account Acme could find. */
export class InvalidHandle extends Schema.TaggedError<InvalidHandle>()(
  "InvalidHandle",
  {}
) {}
