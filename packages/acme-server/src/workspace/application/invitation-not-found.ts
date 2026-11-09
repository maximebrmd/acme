import { Schema } from "effect";

/** The workspace has no pending invitation with this id. */
export class InvitationNotFound extends Schema.TaggedError<InvitationNotFound>()(
  "InvitationNotFound",
  { invitationId: Schema.String }
) {}
