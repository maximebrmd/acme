import { Schema } from "effect";

/** The idempotency key was first sent with another reply: nothing was made. */
export class ReplyKeyReused extends Schema.TaggedError<ReplyKeyReused>()(
  "ReplyKeyReused",
  {}
) {}
