import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The idempotency key already names another boost of the workspace. */
export class BoostKeyReused extends Schema.TaggedError<BoostKeyReused>()(
  "BoostKeyReused",
  { ...errorEnvelope },
  {
    description:
      "The `Idempotency-Key` already names a boost of the workspace that asked for something else (another post, account, budget or end): nothing was made. The same key with the same request answers the boost it made; a new boost takes a new key.",
    httpApiStatus: 409,
  }
) {}
