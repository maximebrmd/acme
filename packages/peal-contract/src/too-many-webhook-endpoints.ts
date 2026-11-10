import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The workspace has as many webhook endpoints as it may. */
export class TooManyWebhookEndpoints extends Schema.TaggedError<TooManyWebhookEndpoints>()(
  "TooManyWebhookEndpoints",
  {
    ...errorEnvelope,
    // How many a workspace may have, which it already has.
    allowed: Schema.Int,
  },
  {
    description:
      "The workspace has `allowed` webhook endpoints, the most it may, whatever its plan: delete one before adding another. Nothing was created.",
    httpApiStatus: 409,
  }
) {}
