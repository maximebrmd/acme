import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The idempotency key was first sent with another request. */
export class IdempotencyKeyReused extends Schema.TaggedError<IdempotencyKeyReused>()(
  "IdempotencyKeyReused",
  { ...errorEnvelope },
  {
    description:
      "The `Idempotency-Key` was sent before, within the last 24 hours, with another request: nothing was made. Send a new request under a new key.",
    httpApiStatus: 409,
  }
) {}
