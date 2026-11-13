import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/**
 * No offer to take over the workspace's billing is open for the one who
 * asks.
 */
export class TransferNotFound extends Schema.TaggedError<TransferNotFound>()(
  "TransferNotFound",
  { ...errorEnvelope },
  {
    description:
      "No offer to take over the workspace's billing is open for you: none was made, it expired after 7 days, or it was taken or withdrawn.",
    httpApiStatus: 404,
  }
) {}
