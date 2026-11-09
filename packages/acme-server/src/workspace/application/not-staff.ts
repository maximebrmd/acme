import { Schema } from "effect";

/**
 * The request is not staff's in their own session: not staff at all,
 * banned, an OAuth client, or staff impersonating someone.
 */
export class NotStaff extends Schema.TaggedError<NotStaff>()("NotStaff", {}) {}
