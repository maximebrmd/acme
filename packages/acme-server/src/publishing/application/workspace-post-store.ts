import { Context } from "effect";
import type { Effect, Option } from "effect";

import type { PostStatusName } from "#publishing/domain/post-status.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { PostRecord } from "#shared/application/personal-data.ts";
import type { PostId, WorkspaceId } from "#shared/domain/ids.ts";

import type { ExecutionId } from "./publication-scheduler.ts";

/** Where a post stands, and the job started for its current revision. */
export interface PostStanding {
  readonly execution: Option.Option<ExecutionId>;
  readonly postId: PostId;
  readonly status: PostStatusName;
}

/** A workspace's posts as a whole, for exporting or erasing them. */
export class WorkspacePostStore extends Context.Service<
  WorkspacePostStore,
  {
    /**
     * Locks every post of the workspace until the transaction ends, as the
     * publishing jobs lock a post before changing it, and says where each
     * stands.
     */
    readonly lockAll: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<readonly PostStanding[], DatabaseError>;
    /** The workspace's posts with their targets, oldest first. */
    readonly exportAll: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<readonly PostRecord[], DatabaseError>;
    /** Deletes the workspace's posts, their targets and their history. */
    readonly deleteAll: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("acme-server/publishing/application/WorkspacePostStore") {}
