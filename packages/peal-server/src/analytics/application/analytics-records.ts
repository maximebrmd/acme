import { Context } from "effect";
import type { Effect } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type {
  AccountSnapshotRecord,
  AnalyticsRecord,
} from "#shared/application/personal-data.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/**
 * A workspace's analytics as a whole, for the workspace context when a
 * workspace's data is exported or erased: the posts followed and their
 * snapshots, and its channels' accounts day by day. Erasing runs in the caller's transaction, if any, and records
 * the workspace as erased, so a collection run that listed its posts
 * before follows none of them after; a reading that finishes after it is
 * dropped.
 */
export class AnalyticsRecords extends Context.Service<
  AnalyticsRecords,
  {
    /** The posts followed, oldest published first, with their snapshots. */
    readonly exportWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<readonly AnalyticsRecord[], DatabaseError>;
    /**
     * The accounts' days read on the workspace's channels, by channel then
     * day.
     */
    readonly exportAccounts: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<readonly AccountSnapshotRecord[], DatabaseError>;
    /**
     * Deletes the posts followed and their snapshots, the channels
     * followed and their days, and the reads counted for the workspace.
     */
    readonly eraseWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/analytics/application/AnalyticsRecords") {}
