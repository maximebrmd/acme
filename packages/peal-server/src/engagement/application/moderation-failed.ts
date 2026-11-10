import { Schema } from "effect";

import { ReplyFailureSchema } from "#engagement/domain/reply.ts";

/** The platform did not do what was asked about the comment; nothing changed in Peal. */
export class ModerationFailed extends Schema.TaggedError<ModerationFailed>()(
  "ModerationFailed",
  {
    reason: ReplyFailureSchema,
  }
) {}
