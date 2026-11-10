import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The workspace the post belongs to holds more than its plan allows, and schedules nothing until it is back within it. Nothing was approved: tell whoever sent the link. */
export class WorkspaceOverPlan extends Schema.TaggedError<WorkspaceOverPlan>()(
  "WorkspaceOverPlan",
  { ...errorEnvelope },
  {
    description:
      "The workspace the post belongs to holds more than its plan allows, and schedules nothing until it is back within it. Nothing was approved: tell whoever sent the link.",
    httpApiStatus: 409,
  }
) {}
