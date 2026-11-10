import { Schema } from "effect";

/** The workspace has no partner account. */
export class PartnerNotFound extends Schema.TaggedError<PartnerNotFound>()(
  "PartnerNotFound",
  {}
) {}
