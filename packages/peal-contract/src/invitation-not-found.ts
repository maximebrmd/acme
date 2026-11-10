import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The workspace has no pending invitation with this id. */
export class InvitationNotFound extends Schema.TaggedError<InvitationNotFound>()(
  "InvitationNotFound",
  { ...errorEnvelope },
  {
    description:
      "The workspace has no pending invitation with this id: it was accepted, declined or revoked, or never existed.",
    httpApiStatus: 404,
  }
) {}
