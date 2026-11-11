import { Array as Arr, DateTime, Order, Result } from "effect";

import type { PostId } from "#shared/domain/ids.ts";

import { horizonOf, slotsAfter } from "./queue.ts";
import type { Queue, QueueNoRoom } from "./queue.ts";

/**
 * A post a queue placed, from now on: one that waits for its time
 * (scheduled or awaiting an approval), or one publishing there.
 */
export interface QueuedPost {
  readonly at: DateTime.Utc;
  readonly id: PostId;
  readonly publishing: boolean;
}

/** A waiting post, and the slot a reshuffle gives it. */
export interface ReshuffleMove {
  readonly from: DateTime.Utc;
  readonly postId: PostId;
  readonly to: DateTime.Utc;
}

/**
 * Where a queue's waiting posts go: `moves` in the order of their times,
 * each onto its slot (some already there), and how many found no slot
 * within the horizon.
 */
export interface ReshufflePlan {
  readonly moves: readonly ReshuffleMove[];
  readonly unplaced: number;
}

/** The most posts one transaction of a reshuffle moves. */
export const reshuffleBatchSize = 100;

// By time, then by id, so two posts on one instant keep one order.
const byTimeThenId = Order.combine(
  Order.mapInput(DateTime.Order, (post: QueuedPost) => post.at),
  Order.mapInput(Order.String, (post: QueuedPost) => post.id)
);

/**
 * The queue's waiting posts after `after`, put on its slots after it as
 * they now are, first to first: post n takes the n-th slot that no
 * publishing post holds, within the horizon. Where the waiting posts are
 * now plays no part but their order, so the plan is the same however
 * often it is made, and two posts on one instant end on two slots.
 * `noSlots` for a queue without slots.
 */
export const reshufflePlan = (
  queue: Queue,
  after: DateTime.Utc,
  posts: readonly QueuedPost[]
): Result.Result<ReshufflePlan, QueueNoRoom> => {
  if (queue.slots.length === 0) {
    return Result.fail("noSlots");
  }

  const held = new Set(
    posts.flatMap(({ at, publishing }) =>
      publishing ? [DateTime.toEpochMillis(at)] : []
    )
  );

  const waiting = Arr.sort(
    posts.filter(
      ({ at, publishing }) => !publishing && DateTime.isGreaterThan(at, after)
    ),
    byTimeThenId
  );

  const horizon = horizonOf(after);
  const moves: ReshuffleMove[] = [];

  if (waiting.length > 0) {
    for (const at of slotsAfter(queue, after)) {
      const next = waiting[moves.length];

      if (next === undefined || DateTime.isGreaterThan(at, horizon)) {
        break;
      }

      if (!held.has(DateTime.toEpochMillis(at))) {
        moves.push({ from: next.at, postId: next.id, to: at });
      }
    }
  }

  return Result.succeed({ moves, unplaced: waiting.length - moves.length });
};
