import { Schema } from "effect";

/** The idempotency key was first sent with another request. */
export class CreationKeyReused extends Schema.TaggedError<CreationKeyReused>()(
  "CreationKeyReused",
  {}
) {}
