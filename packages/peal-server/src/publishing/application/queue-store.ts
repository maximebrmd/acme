import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { ChannelSetId } from "#publishing/domain/channel-set-id.ts";
import type { QueueId } from "#publishing/domain/queue-id.ts";
import type { Queue, TakenSlots } from "#publishing/domain/queue.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { PostId, WorkspaceId } from "#shared/domain/ids.ts";

/** A workspace's queues, as they are kept, and the slots their posts take. */
export class QueueStore extends Context.Service<
  QueueStore,
  {
    /**
     * Holds back, until the transaction it runs in ends, any other
     * transaction that claims the workspace's queues: reading them, then
     * writing one, takes turns, so the count, the names and the default
     * hold.
     */
    readonly claim: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<void, DatabaseError>;
    /**
     * Holds back, until the transaction it runs in ends, any other
     * transaction that locks the queue: what places a post on its slots,
     * and what deletes it, take turns. Taken after an idempotency key's
     * claim and before the plan's month, always.
     */
    readonly lock: (queueId: QueueId) => Effect.Effect<void, DatabaseError>;
    /** The workspace's queues, oldest first. */
    readonly list: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<readonly Queue[], DatabaseError>;
    readonly byId: (
      workspaceId: WorkspaceId,
      queueId: QueueId
    ) => Effect.Effect<Option.Option<Queue>, DatabaseError>;
    /** The workspace's default queue, if it has one. */
    readonly findDefault: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<Option.Option<Queue>, DatabaseError>;
    readonly insert: (queue: Queue) => Effect.Effect<void, DatabaseError>;
    /** Writes what a member writes of the queue, and whether it is default. */
    readonly update: (queue: Queue) => Effect.Effect<void, DatabaseError>;
    /**
     * Deletes the queue and takes it off the posts it placed, which keep
     * their times.
     */
    readonly remove: (
      workspaceId: WorkspaceId,
      queueId: QueueId
    ) => Effect.Effect<void, DatabaseError>;
    /** Makes the queue the default no longer, and changes nothing else. */
    readonly undefault: (
      workspaceId: WorkspaceId,
      queueId: QueueId
    ) => Effect.Effect<void, DatabaseError>;
    /** Takes the channel set off the workspace's queues that name it. */
    readonly forgetChannelSet: (
      workspaceId: WorkspaceId,
      setId: ChannelSetId
    ) => Effect.Effect<void, DatabaseError>;
    /**
     * The instants from `after` (excluded) to `until` (included) that the
     * queue's posts hold, but `except`: those scheduled, awaiting approval
     * or publishing there, each with one that holds it.
     */
    readonly takenFrom: (
      queueId: QueueId,
      after: DateTime.Utc,
      until: DateTime.Utc,
      except?: Option.Option<PostId>
    ) => Effect.Effect<TakenSlots, DatabaseError>;
  }
>()("peal-server/publishing/application/QueueStore") {}
