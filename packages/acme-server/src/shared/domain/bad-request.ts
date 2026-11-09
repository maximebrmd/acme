import { Schema } from "effect";

/**
 * The platform refused the post as sent: text too long, a duplicate, against
 * its rules, or a request it could not read. `code` is the platform's reason,
 * kept for support; it never holds content.
 */
export class BadRequest extends Schema.TaggedError<BadRequest>()("BadRequest", {
  code: Schema.String,
}) {}
