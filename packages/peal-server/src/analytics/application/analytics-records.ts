import { Context } from "effect";
import type { DateTime, Effect } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type {
  AccountSnapshotRecord,
  AnalyticsRecord,
} from "#shared/application/personal-data.ts";
import type {
  ChannelId,
  PostTargetId,
  WorkspaceId,
} from "#shared/domain/ids.ts";
import type { Platform } from "#shared/domain/platform.ts";

/** A channel as analytics follows it, and the account it connects. */
export interface FollowedAccount {
  /** The account's id on its platform, as the channel stores it. */
  readonly accountId: string;
  readonly channelId: ChannelId;
  readonly platform: Platform;
  readonly workspaceId: WorkspaceId;
}

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
    /**
     * A channel left its workspace, in the caller's transaction: it is no
     * longer read nor reported from that moment, whether or not it was
     * followed yet, and its account's days and its posts' counts are
     * deleted `disconnectedKeptFor` later (PurgeAnalytics), unless the
     * workspace connects the same account again before (`channelBack`).
     * With `erase`, as when the platform asks for the account's data to be
     * deleted, they are deleted now.
     */
    readonly channelGone: (
      channel: FollowedAccount,
      how: { readonly at: DateTime.Utc; readonly erase: boolean }
    ) => Effect.Effect<void, DatabaseError>;
    /**
     * A workspace connected an account, in the caller's transaction: when
     * a channel of the same account left it less than
     * `disconnectedKeptFor` ago, its days and its posts continue under the
     * new channel.
     */
    /**
     * A post Peal deleted from its platform, in the caller's transaction:
     * it is no longer read from that moment, and what was read of it
     * stays, in the reports too, until its retention ends. Nothing
     * happens to a post not followed, or no longer read.
     */
    readonly postRemoved: (
      targetId: PostTargetId,
      at: DateTime.Utc
    ) => Effect.Effect<void, DatabaseError>;
    readonly channelBack: (
      channel: FollowedAccount,
      at: DateTime.Utc
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/analytics/application/AnalyticsRecords") {}
