import { Schema } from "effect";

/**
 * Only the person, signed in with their own session, may do this: not an
 * API key, an OAuth client acting for them, or staff impersonating them.
 * Deleting a workspace or an account, copying out everything an account
 * holds, and revoking what other applications may do outlive any of those.
 */
export class SessionRequired extends Schema.TaggedError<SessionRequired>()(
  "SessionRequired",
  {}
) {}
