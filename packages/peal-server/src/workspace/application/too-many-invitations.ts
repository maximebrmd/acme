import { Schema } from "effect";

/** The workspace has as many invitations pending as Better Auth allows. */
export class TooManyInvitations extends Schema.TaggedError<TooManyInvitations>()(
  "TooManyInvitations",
  {}
) {}
