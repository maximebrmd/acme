import { Schema } from "effect";

import { PostTargetIdSchema } from "./post-target-id.ts";
import { PostTargetStatusNameSchema } from "./post-target-status.ts";

/** The transitions of `./post-target.ts`, by name. */
export const TargetActionSchema = Schema.Literals([
  "start",
  "settle",
  "miss",
  "cancel",
  "confirmPublished",
  "confirmNotPublished",
  "repost",
  "recordPart",
  "drop",
]);

export type TargetAction = typeof TargetActionSchema.Type;

/** A transition the target's current status does not allow. */
export class InvalidTargetTransition extends Schema.TaggedError<InvalidTargetTransition>()(
  "InvalidTargetTransition",
  {
    action: TargetActionSchema,
    from: PostTargetStatusNameSchema,
    targetId: PostTargetIdSchema,
  }
) {
  override get message(): string {
    return `Cannot ${this.action} target ${this.targetId} while it is ${this.from}`;
  }
}
