import { Schema } from "effect";

import { StaffRefusalSchema } from "./staff-refusal.ts";

/** The action does not apply to this account, for `reason`. */
export class ActionRefused extends Schema.TaggedError<ActionRefused>()(
  "ActionRefused",
  { reason: StaffRefusalSchema }
) {}
