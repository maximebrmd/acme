import { Schema } from "effect";

/** The `before` of a partner's report is not a page's `next`. */
export class InvalidTenantCursor extends Schema.TaggedError<InvalidTenantCursor>()(
  "InvalidTenantCursor",
  {}
) {}
