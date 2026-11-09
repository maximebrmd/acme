import { Context } from "effect";
import type { Effect } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { ChannelRecord } from "#shared/application/personal-data.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/**
 * A workspace's channels as a whole, for the workspace context when a
 * workspace's data is exported or erased. Erasing runs in the caller's
 * transaction, if any.
 */
export class ChannelRecords extends Context.Service<
  ChannelRecords,
  {
    /** The workspace's channels, oldest first, without their tokens. */
    readonly exportWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<readonly ChannelRecord[], DatabaseError>;
    /**
     * Deletes the workspace's channels, their encrypted tokens and the
     * connections in progress: nothing posts there any more.
     */
    readonly eraseWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("acme-server/channels/application/ChannelRecords") {}
