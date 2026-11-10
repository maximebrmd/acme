import { Schema } from "effect";

/** This server opens partner accounts through its staff only. */
export class PartnerAccountsClosed extends Schema.TaggedError<PartnerAccountsClosed>()(
  "PartnerAccountsClosed",
  {},
  {
    description:
      "This server opens partner accounts through its staff only: ask its operator for one.",
    httpApiStatus: 403,
  }
) {}
