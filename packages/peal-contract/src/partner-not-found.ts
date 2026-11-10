import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The workspace has no partner account. */
export class PartnerNotFound extends Schema.TaggedError<PartnerNotFound>()(
  "PartnerNotFound",
  { ...errorEnvelope },
  {
    description: "The workspace has no partner account.",
    httpApiStatus: 404,
  }
) {}
