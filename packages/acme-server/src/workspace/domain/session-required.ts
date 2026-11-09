import { Schema } from "effect";

/**
 * Only the person, signed in with their own session, may do this: not an
 * API key, an OAuth client acting for them, or staff impersonating them.
 * Deleting a workspace or an account, and revoking what other applications
 * may do, outlive any of those. Copying out everything an account holds,
 * and listing the applications acting for it, are also open to Acme's
 * command line (`ownSessionOrCommandLine`), which the user signs in at their
 * own terminal.
 */
export class SessionRequired extends Schema.TaggedError<SessionRequired>()(
  "SessionRequired",
  {}
) {}
