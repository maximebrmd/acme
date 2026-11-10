import { Schema } from "effect";

/** The workspace the post belongs to holds more than its plan allows, and schedules nothing until it is back within it. Nothing was approved: tell whoever sent the link. */
export class WorkspaceOverPlan extends Schema.TaggedError<WorkspaceOverPlan>()(
  "WorkspaceOverPlan",
  {},
  {
    description:
      "The workspace the post belongs to holds more than its plan allows, and schedules nothing until it is back within it. Nothing was approved: tell whoever sent the link.",
    httpApiStatus: 409,
  }
) {}
