import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** This server opens partner accounts through its staff only. */
export class PartnerAccountsClosed extends Schema.TaggedError<PartnerAccountsClosed>()(
  "PartnerAccountsClosed",
  { ...errorEnvelope },
  {
    description:
      "This server opens partner accounts through its staff only: ask its operator for one.",
    httpApiStatus: 403,
  }
) {}
