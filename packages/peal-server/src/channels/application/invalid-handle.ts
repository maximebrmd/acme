import { Schema } from "effect";

/** The handle, DID or server given names no account Peal could find. */
export class InvalidHandle extends Schema.TaggedError<InvalidHandle>()(
  "InvalidHandle",
  {}
) {}
