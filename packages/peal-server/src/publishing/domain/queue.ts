import { DateTime, Option, Result, Schema } from "effect";

import { ChannelIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { ChannelId, PostId, WorkspaceId } from "#shared/domain/ids.ts";
import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";
import type { TimeZoneId } from "#shared/domain/time-zone.ts";
import {
  addDays,
  fromWallClock,
  isWeekday,
  LocalTimeSchema,
  localDateOf,
  WeekdaySchema,
} from "#shared/domain/wall-clock.ts";
import type { LocalTime } from "#shared/domain/wall-clock.ts";

import { ChannelSetIdSchema } from "./channel-set-id.ts";
import type { ChannelSetId } from "./channel-set-id.ts";
import { QueueIdSchema } from "./queue-id.ts";
import type { QueueId } from "./queue-id.ts";

// The limits below are the owner's to change: each is written once here,
// and the contract's copy is kept equal by a test.

/** The longest name a queue has. */
export const maxQueueNameLength = 60;

/** The most slots one queue's week holds. */
export const maxSlotsPerQueue = 100;

/** The most channels one queue is for. */
export const maxChannelsPerQueue = 50;

/** The most queues a workspace keeps, whatever its plan. */
export const maxQueuesPerWorkspace = 20;

/** How far ahead a post added to a queue looks for a free slot, in days. */
export const queueHorizonDays = 366;

/** The most slots a preview lists. */
export const maxQueuePreview = 50;

/** The slots a preview lists unless asked otherwise. */
export const defaultQueuePreview = 10;

/** A queue's name: a short line, by which requests name it too. */
export const QueueNameSchema = Schema.String.check(
  Schema.isBetweenLength(1, maxQueueNameLength),
  Schema.makeFilter((name: string) => name === name.trim(), {
    expected: "a name without spaces around it",
  }),
  Schema.makeFilter((name: string) => !/\p{Cc}/u.test(name), {
    expected: "a name on one line, without control characters",
  })
);

/** A time of the week: a weekday and a wall-clock time, to the minute. */
export const QueueSlotSchema = Schema.Struct({
  day: WeekdaySchema,
  time: LocalTimeSchema,
});

export type QueueSlot = typeof QueueSlotSchema.Type;

const slotKeyOf = ({ day, time }: QueueSlot) =>
  `${day}@${String(time.hour)}:${String(time.minute)}`;

/** A queue's week: each slot once. */
export const QueueSlotsSchema = Schema.Array(QueueSlotSchema).check(
  Schema.isMaxLength(maxSlotsPerQueue),
  Schema.makeFilter(
    (slots: readonly QueueSlot[]) =>
      new Set(slots.map(slotKeyOf)).size === slots.length,
    { expected: "each day and time once" }
  )
);

/** The channels a queue is for: possibly none, each once. */
export const QueueChannelIdsSchema = Schema.Array(ChannelIdSchema).check(
  Schema.isMaxLength(maxChannelsPerQueue),
  Schema.makeFilter(
    (channelIds: readonly string[]) =>
      new Set(channelIds).size === channelIds.length,
    { expected: "each channel once" }
  )
);

/**
 * A weekly timetable of slots in a time zone, for some channels and at
 * most one channel set: a post added to it takes its next free slot
 * instead of a time chosen by hand. Workspace content, naming nobody.
 *
 * A slot is taken while a post the queue placed is scheduled, held for an
 * approval or publishing at exactly its instant: that is read from the
 * posts, and nothing else is kept of slots. So a queue's slots change
 * freely, and the posts already placed keep their times.
 *
 * A queue keeps the channels it was given: one disconnected since stays
 * listed, and is left out, and said to be, when a post takes the queue's.
 */
export class Queue extends Schema.Class<Queue>(
  "peal-server/publishing/domain/Queue"
)({
  channelIds: QueueChannelIdsSchema,
  channelSetId: Schema.Option(ChannelSetIdSchema),
  createdAt: Schema.DateTimeUtc,
  id: QueueIdSchema,
  // The workspace's default queue, which a post added to no queue in
  // particular takes: one at most a workspace.
  isDefault: Schema.Boolean,
  name: QueueNameSchema,
  slots: QueueSlotsSchema,
  timeZone: TimeZoneIdSchema,
  workspaceId: WorkspaceIdSchema,
}) {}

/** What a member writes of a queue. */
export interface QueueDetails {
  readonly channelIds: readonly ChannelId[];
  readonly channelSetId: Option.Option<ChannelSetId>;
  readonly isDefault: boolean;
  readonly name: string;
  readonly slots: readonly QueueSlot[];
  readonly timeZone: TimeZoneId;
}

export const createQueue = (
  id: QueueId,
  workspaceId: WorkspaceId,
  details: QueueDetails,
  now: DateTime.Utc
): Queue => new Queue({ ...details, createdAt: now, id, workspaceId });

export const editQueue = (queue: Queue, details: QueueDetails): Queue =>
  new Queue({
    ...details,
    createdAt: queue.createdAt,
    id: queue.id,
    workspaceId: queue.workspaceId,
  });

/** The queue as it is once it is the default no longer. */
export const notDefault = (queue: Queue): Queue =>
  new Queue({
    channelIds: queue.channelIds,
    channelSetId: queue.channelSetId,
    createdAt: queue.createdAt,
    id: queue.id,
    isDefault: false,
    name: queue.name,
    slots: queue.slots,
    timeZone: queue.timeZone,
    workspaceId: queue.workspaceId,
  });

/**
 * What two names are compared by: a workspace has one queue per name,
 * whatever its case, and a request names a queue that way.
 */
export const queueKeyOf = (name: string): string =>
  name.normalize("NFC").trim().toLowerCase();

const minutesOf = ({ hour, minute }: LocalTime) => hour * 60 + minute;

/**
 * The instants of the queue's slots strictly after `after`, in order, for
 * as long as it is read: each a weekday and time of the week in the
 * queue's zone, through `fromWallClock`. A time daylight saving skips
 * moves to the moment the clocks jump, so two slots in the gap are one
 * instant, given once; a time it repeats happens once, at its earlier
 * offset. A queue without slots yields nothing.
 *
 * @yields {DateTime.Utc} Each slot's instant, in UTC, later than the one before.
 */
export const slotsAfter = function* slotsAfter(
  queue: Queue,
  after: DateTime.Utc
): Generator<DateTime.Utc, void, undefined> {
  if (queue.slots.length === 0) {
    return;
  }

  const byTime = queue.slots.toSorted(
    (left, right) => minutesOf(left.time) - minutesOf(right.time)
  );

  const firstDate = localDateOf(after, queue.timeZone);
  let last = after;

  // A wall-clock time of a date names an instant of that date, the jump
  // of a gap included, so the days are read from the local date of
  // `after` on, each day's slots by time, and every instant is later than
  // the one before it.
  for (let offset = 0; ; offset += 1) {
    const date = addDays(firstDate, offset);

    for (const { day, time } of byTime) {
      if (isWeekday(date, day)) {
        const at = DateTime.toUtc(fromWallClock(date, time, queue.timeZone));

        if (DateTime.isGreaterThan(at, last)) {
          last = at;

          yield at;
        }
      }
    }
  }
};

/**
 * The posts that hold some of a queue's slots, by the instant they hold
 * in epoch milliseconds.
 */
export type TakenSlots = ReadonlyMap<number, PostId>;

/** Why a queue has no slot to give: none at all, or none free. */
export type QueueNoRoom = "full" | "noSlots";

/** The last instant a post added at `after` may take. */
export const horizonOf = (after: DateTime.Utc): DateTime.Utc =>
  DateTime.add(after, { days: queueHorizonDays });

/**
 * The slot a post added at `after` takes: the first strictly after it
 * that no post holds, within `queueHorizonDays`. `noSlots` for a queue
 * without slots, `full` when every slot within the horizon is held.
 */
export const nextFreeSlot = (
  queue: Queue,
  after: DateTime.Utc,
  taken: TakenSlots
): Result.Result<DateTime.Utc, QueueNoRoom> => {
  if (queue.slots.length === 0) {
    return Result.fail("noSlots");
  }

  const horizon = horizonOf(after);

  for (const at of slotsAfter(queue, after)) {
    if (DateTime.isGreaterThan(at, horizon)) {
      break;
    }

    if (!taken.has(DateTime.toEpochMillis(at))) {
      return Result.succeed(at);
    }
  }

  return Result.fail("full");
};

/** A slot to come, and the post that holds it, if one does. */
export interface PreviewSlot {
  readonly at: DateTime.Utc;
  readonly postId: Option.Option<PostId>;
}

/** The queue's coming slots, and the one a post added now would take. */
export interface QueuePreview {
  readonly nextFree: Result.Result<DateTime.Utc, QueueNoRoom>;
  readonly slots: readonly PreviewSlot[];
}

/**
 * The next `count` slots after `after`, within the horizon, each with the
 * post that holds it, and the slot a post added then would take, which
 * may come after them.
 */
export const previewOf = (
  queue: Queue,
  after: DateTime.Utc,
  count: number,
  taken: TakenSlots
): QueuePreview => {
  const horizon = horizonOf(after);
  const slots: PreviewSlot[] = [];

  for (const at of slotsAfter(queue, after)) {
    if (slots.length >= count || DateTime.isGreaterThan(at, horizon)) {
      break;
    }

    slots.push({
      at,
      postId: Option.fromUndefinedOr(taken.get(DateTime.toEpochMillis(at))),
    });
  }

  return { nextFree: nextFreeSlot(queue, after, taken), slots };
};
