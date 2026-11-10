import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/**
 * A post of the workspace is going out right now, and the workspace cannot be
 * deleted until it has finished, which takes at most a few minutes.
 */
export class WorkspaceBusy extends Schema.TaggedError<WorkspaceBusy>()(
  "WorkspaceBusy",
  {
    ...errorEnvelope,
    // The workspace a post is being published in.
    workspaceId: Schema.String,
  },
  {
    description:
      "A post of the workspace is being published. Try again once it has finished, in a few minutes.",
    httpApiStatus: 409,
  }
) {}
