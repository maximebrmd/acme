import { Schema } from "effect";

/** The partner key was not given the scope a partner's report takes. */
export class PartnerScopeMissing extends Schema.TaggedError<PartnerScopeMissing>()(
  "PartnerScopeMissing",
  { scope: Schema.String }
) {}
