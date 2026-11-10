import { Context } from "effect";
import type { Effect, Option } from "effect";

import type { PostStatusName } from "#publishing/domain/post-status.ts";
import type { PostTargetId } from "#publishing/domain/post-target-id.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type {
  AuthoredPostRecord,
  PostRecord,
  SavedItemsRecord,
} from "#shared/application/personal-data.ts";
import type { PostId, UserId, WorkspaceId } from "#shared/domain/ids.ts";

import type { ExecutionId } from "./publication-scheduler.ts";

/** Where a post stands, and the job started for its current revision. */
export interface PostStanding {
  readonly execution: Option.Option<ExecutionId>;
  readonly postId: PostId;
  readonly status: PostStatusName;
}

/** A target of a post that is publishing, in the round being sent. */
export interface OpenRound {
  /** A call to the platform was begun for it, and has not ended. */
  readonly inFlight: boolean;
  readonly round: number;
  readonly targetId: PostTargetId;
}

/**
 * A workspace's posts as a whole, for exporting or erasing them, and a
 * user's, wherever they wrote them.
 */
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
    /**
     * Locks the targets of the workspace's posts that are publishing until
     * the transaction ends, and answers each with its round and whether a
     * call to its platform is in flight: begun in the journal, and not
     * ended. A call begins by writing its journal row under the target, so
     * none can begin while this transaction holds the target, nor after it
     * deleted it.
     */
    readonly lockRounds: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<readonly OpenRound[], DatabaseError>;
    /** The workspace's posts with their targets, oldest first. */
    readonly exportAll: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<readonly PostRecord[], DatabaseError>;
    /**
     * What the workspace saved to write and file its posts, oldest first:
     * its tags, signatures, channel sets and channels' default options.
     */
    readonly exportSaved: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<SavedItemsRecord, DatabaseError>;
    /**
     * Deletes the workspace's posts, their targets and their history, and
     * what it saved to write and file them.
     */
    readonly deleteAll: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<void, DatabaseError>;
    /**
     * The posts the user wrote in these workspaces, with their targets,
     * oldest first.
     */
    readonly exportAuthored: (
      userId: UserId,
      workspaceIds: readonly WorkspaceId[]
    ) => Effect.Effect<readonly AuthoredPostRecord[], DatabaseError>;
    /** Leaves the user's posts, in every workspace, without an author. */
    readonly clearAuthor: (
      userId: UserId
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/publishing/application/WorkspacePostStore") {}
