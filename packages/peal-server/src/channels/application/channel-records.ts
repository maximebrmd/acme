import { Context } from "effect";
import type { Effect } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { ChannelRecord } from "#shared/application/personal-data.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";

/**
 * A workspace's channels as a whole, and the connections a user has in
 * progress, for the workspace context when a workspace's or a user's data is
 * exported or erased. Erasing runs in the caller's transaction, if any.
 */
export class ChannelRecords extends Context.Service<
  ChannelRecords,
  {
    /** The workspace's channels, oldest first, without their tokens. */
    readonly exportWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<readonly ChannelRecord[], DatabaseError>;
    /**
     * Deletes the workspace's channels, their encrypted tokens (with the
     * Facebook user a Page's rests on, `granted_by`), and the connections
     * and account choices in progress: nothing posts there any more.
     */
    readonly eraseWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<void, DatabaseError>;
    /**
     * Deletes the connections and account choices the user started, in
     * every workspace, with the tokens a choice holds. The channels they
     * connected belong to their workspaces, and stay.
     */
    readonly eraseUser: (userId: UserId) => Effect.Effect<void, DatabaseError>;
  }
>()("acme-server/channels/application/ChannelRecords") {}
