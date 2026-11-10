import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The partner has no key with this id. */
export class PartnerKeyNotFound extends Schema.TaggedError<PartnerKeyNotFound>()(
  "PartnerKeyNotFound",
  { ...errorEnvelope },
  {
    description: "The partner account has no key with this id.",
    httpApiStatus: 404,
  }
) {}
