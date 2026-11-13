import { DateTime, Option } from "effect";
import { weekdays } from "peal-contract";
import type { Queue } from "peal-contract";

import {
  addDays,
  instantOf,
  parseTime,
  rangeOf,
  wallClockOf,
  weekdayOf,
} from "#posts/zoned-time.ts";
import type { CalendarDate, WallClock } from "#posts/zoned-time.ts";

// The calendar's day view: one row per time of the day that holds a post
// or a queue's slot, on the viewer's clock.

/** A queue's slot on the day, at the instant it names. */
export interface DaySlot {
  readonly at: DateTime.Utc;
  readonly queueId: string;
  readonly queueName: string;
}

/** What the day view reads of a queue. */
type DayQueue = Pick<Queue, "id" | "name" | "slots" | "timeZone">;

const within = (
  instant: DateTime.Utc,
  { from, to }: { readonly from: DateTime.Utc; readonly to: DateTime.Utc }
) =>
  DateTime.isGreaterThanOrEqualTo(instant, from) &&
  DateTime.isLessThan(instant, to);

const byInstant = (left: DateTime.Utc, right: DateTime.Utc) =>
  DateTime.toEpochMillis(left) - DateTime.toEpochMillis(right);

/**
 * The slots of the queues that fall on `date` on the clock of `timeZone`,
 * by time. Each queue's slots are read on its own clock, which may be on
 * the day before or after the viewer's, with the server's policy for
 * daylight saving (`instantOf`): two slots the clocks make one instant
 * are one. A queue whose zone does not exist has none.
 */
export const queueSlotsOn = (
  queues: readonly DayQueue[],
  date: CalendarDate,
  timeZone: string
): readonly DaySlot[] =>
  Option.match(rangeOf([date], timeZone), {
    onNone: () => [],
    onSome: (range) =>
      queues
        .flatMap((queue) => {
          // Zones are at most 26 hours apart (UTC-12 to UTC+14): the
          // viewer's day spans the queue's dates two before to two after.
          const instants = [-2, -1, 0, 1, 2].flatMap((offset) => {
            const day = addDays(date, offset);
            const weekday = weekdays[weekdayOf(day) - 1];

            return queue.slots.flatMap((slot) =>
              slot.day === weekday
                ? Option.toArray(
                    parseTime(slot.time).pipe(
                      Option.flatMap((time) =>
                        instantOf({ date: day, time }, queue.timeZone)
                      )
                    )
                  )
                : []
            );
          });

          const once = new Map(
            instants.flatMap((instant) =>
              within(instant, range)
                ? [[DateTime.toEpochMillis(instant), instant] as const]
                : []
            )
          );

          return [...once.values()].map((at): DaySlot => ({
            at,
            queueId: queue.id,
            queueName: queue.name,
          }));
        })
        .toSorted((left, right) => byInstant(left.at, right.at)),
  });

/** What the rows read of a post placed on the day. */
interface DayPlaced {
  readonly at: DateTime.Utc;
  readonly post: { readonly id: string; readonly queueId: string | null };
}

/**
 * A post that holds its queue's slot at its time, as the server counts
 * one: scheduled, waiting for an approval or going out. Shown or not.
 */
export interface SlotHolder {
  readonly at: DateTime.Utc;
  readonly postId: string;
  readonly queueId: string;
}

/** A time of the day, the posts at it and the queues' slots there. */
export interface DayRow<Placed extends DayPlaced> {
  readonly at: DateTime.Utc;
  /** Slots held by a post the filters hide: taken, never free. */
  readonly heldSlots: readonly DaySlot[];
  /** Slots at this time that no post of their queue holds. */
  readonly openSlots: readonly DaySlot[];
  readonly posts: readonly Placed[];
}

/**
 * The day's rows, by time: each instant that holds a shown post or a slot,
 * once, with its posts in the order given; a slot is free when no post of
 * its queue holds it (`holders`, every post loaded, the filters' hidden
 * ones included), held when the one that does is hidden, and not listed
 * when it is shown.
 */
export const dayRows = <Placed extends DayPlaced>(
  placed: readonly Placed[],
  slots: readonly DaySlot[],
  holders: readonly SlotHolder[]
): readonly DayRow<Placed>[] => {
  const shown = new Set(placed.map(({ post }) => post.id));

  const holderOf = (slot: DaySlot) =>
    holders.find(
      (holder) =>
        holder.queueId === slot.queueId &&
        DateTime.toEpochMillis(holder.at) === DateTime.toEpochMillis(slot.at)
    );

  const instants = new Map<number, DateTime.Utc>(
    [...placed, ...slots].map(({ at }) => [DateTime.toEpochMillis(at), at])
  );

  return [...instants.entries()]
    .toSorted(([left], [right]) => left - right)
    .flatMap(([millis, at]) => {
      const posts = placed.filter(
        (item) => DateTime.toEpochMillis(item.at) === millis
      );

      const here = slots.filter(
        (slot) => DateTime.toEpochMillis(slot.at) === millis
      );

      const openSlots = here.filter((slot) => holderOf(slot) === undefined);

      const heldSlots = here.filter((slot) => {
        const holder = holderOf(slot);

        return holder !== undefined && !shown.has(holder.postId);
      });

      return posts.length + openSlots.length + heldSlots.length === 0
        ? []
        : [{ at, heldSlots, openSlots, posts }];
    });
};

/**
 * The wall-clock date and time a new post at a slot starts at, on the
 * viewer's clock; none when that time names another instant, as the second
 * of a time the clocks show twice does: the composer reads a time written
 * on the clock with the earlier offset.
 */
export const slotStartOf = (
  at: DateTime.Utc,
  timeZone: string
): Option.Option<WallClock> =>
  wallClockOf(at, timeZone).pipe(
    Option.filter((wall) =>
      Option.exists(
        instantOf(wall, timeZone),
        (instant) =>
          DateTime.toEpochMillis(instant) === DateTime.toEpochMillis(at)
      )
    )
  );

const dayMillis = 24 * 60 * 60 * 1000;

/**
 * Whether the clocks of `timeZone` change on `date`: its times are then
 * written with their offset, as one may be shown twice.
 */
export const offsetChangesOn = (
  date: CalendarDate,
  timeZone: string
): boolean =>
  Option.match(rangeOf([date], timeZone), {
    onNone: () => false,
    onSome: ({ from, to }) =>
      DateTime.toEpochMillis(to) - DateTime.toEpochMillis(from) !== dayMillis,
  });
