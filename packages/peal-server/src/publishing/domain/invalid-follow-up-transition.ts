import { Schema } from "effect";

import { FollowUpIdSchema } from "./follow-up-id.ts";

/** A follow-up's step that its state does not allow. */
export class InvalidFollowUpTransition extends Schema.TaggedError<InvalidFollowUpTransition>()(
  "InvalidFollowUpTransition",
  {
    action: Schema.String,
    followUpId: FollowUpIdSchema,
    from: Schema.String,
  }
) {}
