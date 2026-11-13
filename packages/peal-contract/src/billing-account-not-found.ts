import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** No billing account has this id, or holds this workspace. */
export class BillingAccountNotFound extends Schema.TaggedError<BillingAccountNotFound>()(
  "BillingAccountNotFound",
  { ...errorEnvelope },
  {
    description: "No billing account has this id, or holds this workspace.",
    httpApiStatus: 404,
  }
) {}
