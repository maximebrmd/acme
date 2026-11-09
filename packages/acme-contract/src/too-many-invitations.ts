import { Schema } from "effect";

/** The workspace has as many invitations pending as it may. */
export class TooManyInvitations extends Schema.TaggedError<TooManyInvitations>()(
  "TooManyInvitations",
  {},
  {
    description:
      "The workspace has 100 invitations pending, the most it may: revoke some before inviting anyone else.",
    httpApiStatus: 409,
  }
) {}
