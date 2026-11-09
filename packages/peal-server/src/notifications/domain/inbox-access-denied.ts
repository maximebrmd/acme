import { Schema } from "effect";

/**
 * The credentials may not do this with the user's notices: an OAuth client
 * bound to one workspace, one granted no workspace scope, or for a change,
 * staff impersonating the user or a client that may only read.
 */
export class InboxAccessDenied extends Schema.TaggedError<InboxAccessDenied>()(
  "InboxAccessDenied",
  { action: Schema.Literals(["read", "change"]) }
) {}
