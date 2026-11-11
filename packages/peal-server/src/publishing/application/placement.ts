import { Effect, Option } from "effect";
import type { DateTime } from "effect";

import type { QueueId } from "#publishing/domain/queue-id.ts";
import { horizonOf, nextFreeSlot } from "#publishing/domain/queue.ts";
import type { Queue } from "#publishing/domain/queue.ts";
import type { PostId, WorkspaceId } from "#shared/domain/ids.ts";

import { QueueNotFound } from "./queue-not-found.ts";
import { QueueStore } from "./queue-store.ts";

/**
 * Where a new post goes in time: now, at an instant, or on the next free
 * slot of a queue (the workspace's default when none is named), which is
 * decided in the transaction that saves the post.
 */
export type Placement =
  | { readonly _tag: "now" }
  | { readonly _tag: "at"; readonly at: DateTime.Utc }
  | { readonly _tag: "queue"; readonly queueId: Option.Option<QueueId> };

/** The workspace's queue a placement names, or its default queue. */
export const queueNamed = Effect.fn("Publishing.queueNamed")(
  function* queueNamed(
    workspaceId: WorkspaceId,
    queueId: Option.Option<QueueId>
  ) {
    const store = yield* QueueStore;

    const found = yield* Option.match(queueId, {
      onNone: () => store.findDefault(workspaceId),
      onSome: (id) => store.byId(workspaceId, id),
    });

    if (Option.isNone(found)) {
      return yield* new QueueNotFound({
        queue: Option.getOrElse(queueId, () => "default"),
      });
    }

    return found.value;
  }
);

/**
 * The slot a post added to the queue at `after` takes: the first after it
 * that no post of the queue holds, `except` the post being placed, within
 * the horizon. Read as the database stands: under the queue's lock, it is
 * the slot; without it, advice.
 */
export const freeSlotOf = Effect.fn("Publishing.freeSlotOf")(
  function* freeSlotOf(
    queue: Queue,
    after: DateTime.Utc,
    except: Option.Option<PostId> = Option.none()
  ) {
    const store = yield* QueueStore;

    const taken = yield* store.takenFrom(
      queue.id,
      after,
      horizonOf(after),
      except
    );

    return nextFreeSlot(queue, after, taken);
  }
);
