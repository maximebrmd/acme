import { Context } from "effect";
import type { DateTime, Effect } from "effect";

import type { MeteredPostCount } from "#billing/domain/metered-posts.ts";
import type { UsagePeriod } from "#billing/domain/usage-meter.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import type { Platform } from "#shared/domain/platform.ts";

/** One post that went out on a metered platform. */
export interface MeteredPost {
  /** The first instant of the month it counts in. */
  readonly month: DateTime.Utc;
  readonly platform: Platform;
  readonly withLink: boolean;
  readonly workspaceId: WorkspaceId;
}

/** A workspace's count of a month. */
export interface WorkspaceMeteredPosts {
  readonly count: MeteredPostCount;
  readonly workspaceId: WorkspaceId;
}

/**
 * The counts of each workspace's posts on metered platforms, by month.
 * Counts only: never a post, its text or its links.
 */
export class MeteredPostLedger extends Context.Service<
  MeteredPostLedger,
  {
    /**
     * Counts one more post, in the caller's transaction, so it commits with
     * the publication it counts or not at all.
     */
    readonly add: (post: MeteredPost) => Effect.Effect<void, DatabaseError>;
    /** The workspace's counts, oldest month first. */
    readonly ofWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<readonly MeteredPostCount[], DatabaseError>;
    /**
     * These workspaces' counts of each calendar month the period touches,
     * whole, in one read: nothing is asked for none.
     */
    readonly ofWorkspaces: (
      workspaceIds: readonly WorkspaceId[],
      period: UsagePeriod
    ) => Effect.Effect<readonly WorkspaceMeteredPosts[], DatabaseError>;
    /** Deletes the workspace's counts, in the caller's transaction. */
    readonly eraseWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/billing/application/MeteredPostLedger") {}
