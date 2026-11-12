import { Schema } from "effect";

import { LivePostChangeIdSchema } from "./live-post-change-id.ts";

/** The transitions of `./live-post-change.ts`, by name. */
export const ChangeActionSchema = Schema.Literals([
  "removePart",
  "editPart",
  "finish",
  "fail",
]);

export type ChangeAction = typeof ChangeActionSchema.Type;

/** A transition the change's current status does not allow. */
export class InvalidChangeTransition extends Schema.TaggedError<InvalidChangeTransition>()(
  "InvalidChangeTransition",
  {
    action: ChangeActionSchema,
    changeId: LivePostChangeIdSchema,
    from: Schema.Literals(["pending", "done", "failed"]),
  }
) {
  override get message(): string {
    return `Cannot ${this.action} change ${this.changeId} while it is ${this.from}`;
  }
}
