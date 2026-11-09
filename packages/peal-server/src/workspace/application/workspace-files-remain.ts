import { Schema } from "effect";

import { WorkspaceIdSchema } from "#shared/domain/ids.ts";

/** The media store kept some of a deleted workspace's files. */
export class WorkspaceFilesRemain extends Schema.TaggedError<WorkspaceFilesRemain>()(
  "WorkspaceFilesRemain",
  { cause: Schema.Defect(), workspaceId: WorkspaceIdSchema }
) {}
