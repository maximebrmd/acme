import { Context, DateTime, Effect, Layer, Option, Order } from "effect";

import { QueueIdSchema } from "#publishing/domain/queue-id.ts";
import type { QueueId } from "#publishing/domain/queue-id.ts";
import {
  createQueue,
  editQueue,
  horizonOf,
  maxQueuePreview,
  maxQueuesPerWorkspace,
  previewOf,
  queueKeyOf,
} from "#publishing/domain/queue.ts";
import type {
  Queue,
  QueueDetails,
  QueuePreview,
} from "#publishing/domain/queue.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { newId } from "#shared/application/ids.ts";
import type { Ids } from "#shared/application/ids.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import type { ChannelId } from "#shared/domain/ids.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";

import { ChannelSetNotFound } from "./channel-set-not-found.ts";
import { ChannelSetStore } from "./channel-set-store.ts";
import { channelsFor } from "./post-references.ts";
import { QueueNameTaken } from "./queue-name-taken.ts";
import { QueueNotFound } from "./queue-not-found.ts";
import { QueueStore } from "./queue-store.ts";
import { TooManyQueues } from "./too-many-queues.ts";
import type { UnknownChannels } from "./unknown-channels.ts";
import { WorkspaceChannels } from "./workspace-channels.ts";

/** A queue, and which of its channels the workspace no longer has. */
export interface ListedQueue {
  readonly queue: Queue;
  /** Its channels disconnected since, which a post that takes them skips. */
  readonly unavailable: readonly ChannelId[];
}

type WriteFailure =
  | ChannelSetNotFound
  | DatabaseError
  | MissingPermission
  | QueueNameTaken
  | UnknownChannels;

// The default first, then by name as names are compared, then oldest.
const listed = Order.combineAll<Queue>([
  Order.mapInput(Order.Boolean, (queue: Queue) => !queue.isDefault),
  Order.mapInput(Order.String, (queue: Queue) => queueKeyOf(queue.name)),
  Order.mapInput(Order.String, (queue: Queue) => queue.id),
]);

// Fails when another queue of the workspace has the name.
const nameFree = (
  kept: readonly Queue[],
  name: string,
  except: Option.Option<QueueId>
) =>
  kept.some(
    (queue) =>
      queueKeyOf(queue.name) === queueKeyOf(name) &&
      !Option.contains(except, queue.id)
  )
    ? Effect.fail(new QueueNameTaken({ name }))
    : Effect.void;

/**
 * A workspace's queues: weekly timetables of slots in a time zone, which a
 * post is added to instead of being given a time (`PostScheduling`).
 *
 * Reading them needs post:read and channel:read; writing one post:update,
 * as editing a post does. A queue is saved with channels connected to the
 * workspace and a channel set it has; one per name whatever its case, 20
 * a workspace whatever its plan, and one default at most: the first queue
 * is the default, and a queue saved as the default takes it from the one
 * that was. Deleting a queue leaves its posts scheduled at their times,
 * without it.
 */
export class Queues extends Context.Service<
  Queues,
  {
    /** The workspace's queues, the default first, then by name. */
    readonly list: (
      actor: Actor
    ) => Effect.Effect<
      readonly ListedQueue[],
      DatabaseError | MissingPermission
    >;
    readonly get: (
      actor: Actor,
      queueId: QueueId
    ) => Effect.Effect<
      ListedQueue,
      DatabaseError | MissingPermission | QueueNotFound
    >;
    readonly create: (
      actor: Actor,
      details: QueueDetails
    ) => Effect.Effect<ListedQueue, TooManyQueues | WriteFailure>;
    /** Replaces the queue's details: its posts keep their times. */
    readonly update: (
      actor: Actor,
      queueId: QueueId,
      details: QueueDetails
    ) => Effect.Effect<ListedQueue, QueueNotFound | WriteFailure>;
    readonly remove: (
      actor: Actor,
      queueId: QueueId
    ) => Effect.Effect<void, DatabaseError | MissingPermission | QueueNotFound>;
    /**
     * The queue's next `count` slots after now, with the posts that hold
     * them, and the slot a post added now would take. Advice: it locks
     * nothing, and the slot is decided when a post is added.
     */
    readonly preview: (
      actor: Actor,
      queueId: QueueId,
      count: number
    ) => Effect.Effect<
      QueuePreview,
      DatabaseError | MissingPermission | QueueNotFound
    >;
  }
>()("peal-server/publishing/application/Queues") {
  static readonly layer = Layer.effect(
    Queues,
    Effect.gen(function* QueuesLive() {
      const store = yield* QueueStore;
      const sets = yield* ChannelSetStore;
      const channels = yield* WorkspaceChannels;
      const { transaction } = yield* TransactionRunner;
      const ports = yield* Effect.context<Ids | WorkspaceChannels>();

      const withPorts = Effect.provideContext(ports);

      // Whoever may write queues, and channels connected to the workspace.
      const checked = Effect.fn("Queues.checked")(function* checked(
        actor: Actor,
        { channelIds }: QueueDetails
      ) {
        yield* Effect.fromResult(authorize(actor, "post:update"));
        yield* channelsFor(actor, channelIds).pipe(withPorts);
      });

      // The set it names is the workspace's, and stays so until the
      // transaction ends: deleting a set claims the sets too, and takes it
      // off the queues that name it.
      const setKept = Effect.fn("Queues.setKept")(function* setKept(
        actor: Actor,
        { channelSetId }: QueueDetails
      ) {
        if (Option.isSome(channelSetId)) {
          yield* sets.claim(actor.workspaceId);

          const kept = yield* sets.list(actor.workspaceId);

          yield* kept.some(({ id }) => id === channelSetId.value)
            ? Effect.void
            : Effect.fail(
                new ChannelSetNotFound({ channelSet: channelSetId.value })
              );
        }
      });

      // A workspace has one default: the others are defaults no longer,
      // written before the new one so the database's index holds. Only that
      // column is written: the rest of a row read earlier may have changed
      // since, as a channel set's deletion takes the set off its queues.
      const soleDefault = (kept: readonly Queue[], chosen: Queue) =>
        chosen.isDefault
          ? Effect.forEach(
              kept.filter(({ id, isDefault }) => isDefault && id !== chosen.id),
              (queue) => store.undefault(queue.workspaceId, queue.id),
              { discard: true }
            )
          : Effect.void;

      const unavailableOf = Effect.fn("Queues.unavailableOf")(
        function* unavailableOf(actor: Actor, kept: readonly Queue[]) {
          const named = [...new Set(kept.flatMap((queue) => queue.channelIds))];

          const connected = new Set<ChannelId>(
            named.length === 0
              ? []
              : (yield* channels.lookUp(actor, named)).map(
                  ({ channelId }) => channelId
                )
          );

          return kept.map((queue): ListedQueue => ({
            queue,
            unavailable: queue.channelIds.filter(
              (channelId) => !connected.has(channelId)
            ),
          }));
        }
      );

      const found = Effect.fn("Queues.found")(function* found(
        actor: Actor,
        queueId: QueueId
      ) {
        const queue = yield* store.byId(actor.workspaceId, queueId);

        if (Option.isNone(queue)) {
          return yield* new QueueNotFound({ queue: queueId });
        }

        return queue.value;
      });

      const list = Effect.fn("Queues.list")(function* list(actor: Actor) {
        yield* Effect.fromResult(authorize(actor, "post:read"));

        const kept = yield* store.list(actor.workspaceId);

        return yield* unavailableOf(actor, kept.toSorted(listed));
      });

      const get = Effect.fn("Queues.get")(function* get(
        actor: Actor,
        queueId: QueueId
      ) {
        yield* Effect.fromResult(authorize(actor, "post:read"));

        const queue = yield* found(actor, queueId);
        const [one] = yield* unavailableOf(actor, [queue]);

        return one ?? { queue, unavailable: [] };
      });

      const create = Effect.fn("Queues.create")(function* create(
        actor: Actor,
        details: QueueDetails
      ) {
        yield* checked(actor, details);

        const queueId = yield* newId(QueueIdSchema).pipe(withPorts);
        const now = yield* DateTime.now;

        return yield* transaction(
          Effect.gen(function* add() {
            yield* store.claim(actor.workspaceId);

            const kept = yield* store.list(actor.workspaceId);

            if (kept.length >= maxQueuesPerWorkspace) {
              return yield* new TooManyQueues({
                allowed: maxQueuesPerWorkspace,
              });
            }

            yield* nameFree(kept, details.name, Option.none());
            yield* setKept(actor, details);

            // The first queue of a workspace is its default.
            const queue = createQueue(
              queueId,
              actor.workspaceId,
              {
                ...details,
                isDefault: details.isDefault || kept.length === 0,
              },
              now
            );

            yield* soleDefault(kept, queue);
            yield* store.insert(queue);

            const made: ListedQueue = { queue, unavailable: [] };

            return made;
          })
        );
      });

      const update = Effect.fn("Queues.update")(function* update(
        actor: Actor,
        queueId: QueueId,
        details: QueueDetails
      ) {
        yield* checked(actor, details);

        return yield* transaction(
          Effect.gen(function* edit() {
            yield* store.claim(actor.workspaceId);

            const kept = yield* store.list(actor.workspaceId);
            const current = kept.find(({ id }) => id === queueId);

            if (current === undefined) {
              return yield* new QueueNotFound({ queue: queueId });
            }

            yield* nameFree(kept, details.name, Option.some(queueId));
            yield* setKept(actor, details);

            const queue = editQueue(current, details);

            yield* soleDefault(kept, queue);
            yield* store.update(queue);

            const saved: ListedQueue = { queue, unavailable: [] };

            return saved;
          })
        );
      });

      const remove = Effect.fn("Queues.remove")(function* remove(
        actor: Actor,
        queueId: QueueId
      ) {
        yield* Effect.fromResult(authorize(actor, "post:update"));

        return yield* transaction(
          Effect.gen(function* drop() {
            yield* store.claim(actor.workspaceId);

            const kept = yield* store.list(actor.workspaceId);

            if (!kept.some(({ id }) => id === queueId)) {
              return yield* new QueueNotFound({ queue: queueId });
            }

            // A post being placed on the queue is placed first, and then
            // taken off it with the others.
            yield* store.lock(queueId);

            return yield* store.remove(actor.workspaceId, queueId);
          })
        );
      });

      const preview = Effect.fn("Queues.preview")(function* preview(
        actor: Actor,
        queueId: QueueId,
        count: number
      ) {
        yield* Effect.fromResult(authorize(actor, "post:read"));

        const queue = yield* found(actor, queueId);
        const now = yield* DateTime.now;

        const taken = yield* store.takenFrom(queue.id, now, horizonOf(now));

        return previewOf(
          queue,
          now,
          Math.min(Math.max(count, 1), maxQueuePreview),
          taken
        );
      });

      return Queues.of({ create, get, list, preview, remove, update });
    })
  );
}
