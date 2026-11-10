import { Schema } from "effect";

/** The logo's address is not an HTTPS URL browsers can load. */
export class InvalidPartnerLogo extends Schema.TaggedError<InvalidPartnerLogo>()(
  "InvalidPartnerLogo",
  {}
) {}
