import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { LivePostChangeId } from "#publishing/domain/live-post-change-id.ts";
import type { LivePostChange } from "#publishing/domain/live-post-change.ts";
import type { PostTargetId } from "#publishing/domain/post-target-id.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { PostId, WorkspaceId } from "#shared/domain/ids.ts";

/** A pending change of a workspace's post, as an erasure finds it. */
export interface OpenChange {
  readonly changeId: LivePostChangeId;
  /** A call to the platform was begun for it, and has not ended. */
  readonly inFlight: boolean;
}

/**
 * The changes asked of live posts (`publishing.live_post_changes`), and
 * the journal of their calls to the platforms. A target has one pending
 * change at most.
 */
export class LivePostChangeStore extends Context.Service<
  LivePostChangeStore,
  {
    /**
     * Saves a new change: false, saving nothing, when its target has a
     * pending change already (two requests made together).
     */
    readonly insert: (
      change: LivePostChange
    ) => Effect.Effect<boolean, DatabaseError>;
    readonly find: (
      changeId: LivePostChangeId
    ) => Effect.Effect<Option.Option<LivePostChange>, DatabaseError>;
    /** The change, locked until the transaction ends. */
    readonly lock: (
      changeId: LivePostChangeId
    ) => Effect.Effect<Option.Option<LivePostChange>, DatabaseError>;
    /** The newest change asked of the target. */
    readonly latestOf: (
      targetId: PostTargetId
    ) => Effect.Effect<Option.Option<LivePostChange>, DatabaseError>;
    /** The changes asked of a post of the workspace, newest first. */
    readonly ofPost: (
      workspaceId: WorkspaceId,
      postId: PostId
    ) => Effect.Effect<readonly LivePostChange[], DatabaseError>;
    /**
     * Writes `next` over `current`, while it is still as `current` says:
     * false otherwise.
     */
    readonly update: (
      next: LivePostChange,
      current: LivePostChange
    ) => Effect.Effect<boolean, DatabaseError>;
    /**
     * Records that a call to the platform begins for the pending change:
     * false when the change is not pending, or gone, and nothing may be
     * called. Committed before the call is made, so an erasure sees it.
     */
    readonly beginCall: (
      changeId: LivePostChangeId,
      at: DateTime.Utc
    ) => Effect.Effect<boolean, DatabaseError>;
    /** Records that the call ended, however it did. */
    readonly endCall: (
      changeId: LivePostChangeId,
      at: DateTime.Utc
    ) => Effect.Effect<void, DatabaseError>;
    /**
     * Locks the workspace's pending changes until the transaction ends,
     * and says whether a call is in flight for each: one that begins
     * waits for the lock, and finds its change gone after an erasure.
     */
    readonly lockOpen: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<readonly OpenChange[], DatabaseError>;
  }
>()("peal-server/publishing/application/LivePostChangeStore") {}
