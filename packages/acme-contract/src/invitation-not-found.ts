import { Schema } from "effect";

/** The workspace has no pending invitation with this id. */
export class InvitationNotFound extends Schema.TaggedError<InvitationNotFound>()(
  "InvitationNotFound",
  {},
  {
    description:
      "The workspace has no pending invitation with this id: it was accepted, declined or revoked, or never existed.",
    httpApiStatus: 404,
  }
) {}
