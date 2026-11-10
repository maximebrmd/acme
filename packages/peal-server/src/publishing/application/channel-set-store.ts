import { Context } from "effect";
import type { Effect } from "effect";

import type { ChannelSetId } from "#publishing/domain/channel-set-id.ts";
import type { ChannelSet } from "#publishing/domain/channel-set.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/** A workspace's channel sets, as they are kept. */
export class ChannelSetStore extends Context.Service<
  ChannelSetStore,
  {
    /**
     * Holds back, until the transaction it runs in ends, any other
     * transaction that claims the workspace's sets: reading them, then
     * writing one, takes turns.
     */
    readonly claim: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<void, DatabaseError>;
    /** The workspace's sets, oldest first. */
    readonly list: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<readonly ChannelSet[], DatabaseError>;
    readonly insert: (set: ChannelSet) => Effect.Effect<void, DatabaseError>;
    /** Writes the set's name, channels and options. */
    readonly update: (set: ChannelSet) => Effect.Effect<void, DatabaseError>;
    readonly remove: (
      workspaceId: WorkspaceId,
      setId: ChannelSetId
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/publishing/application/ChannelSetStore") {}
