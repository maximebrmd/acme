import { Schema } from "effect";

/** The sign-in service failed to carry an action out. */
export class ModerationFailed extends Schema.TaggedError<ModerationFailed>()(
  "ModerationFailed",
  { cause: Schema.Defect() }
) {}
