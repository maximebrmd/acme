import { Schema } from "effect";

/** The partner has no key with this id. */
export class PartnerKeyNotFound extends Schema.TaggedError<PartnerKeyNotFound>()(
  "PartnerKeyNotFound",
  {},
  {
    description: "The partner account has no key with this id.",
    httpApiStatus: 404,
  }
) {}
