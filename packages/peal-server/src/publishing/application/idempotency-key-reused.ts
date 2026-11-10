import { Schema } from "effect";

/**
 * The idempotency key came with another request than the one it was first
 * sent with: a client's mistake, not a retry, so no post is made nor
 * answered.
 */
export class IdempotencyKeyReused extends Schema.TaggedError<IdempotencyKeyReused>()(
  "IdempotencyKeyReused",
  {}
) {}
