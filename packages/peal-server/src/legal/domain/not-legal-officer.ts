import { Schema } from "effect";

/**
 * The staff member does not hold the legal role, which answering a legal
 * request needs.
 */
export class NotLegalOfficer extends Schema.TaggedError<NotLegalOfficer>()(
  "NotLegalOfficer",
  {}
) {}
