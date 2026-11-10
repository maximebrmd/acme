import { Schema } from "effect";

/**
 * The idempotency key already names a boost of the workspace that asked
 * for something else: another post, account or budget.
 */
export class BoostKeyReused extends Schema.TaggedError<BoostKeyReused>()(
  "BoostKeyReused",
  {}
) {}
