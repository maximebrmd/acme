import { DateTime, Option } from "effect";
import { weekdays } from "peal-contract";
import type { Queue } from "peal-contract";

import {
  addDays,
  instantOf,
  parseTime,
  rangeOf,
  weekdayOf,
} from "#posts/zoned-time.ts";
import type { CalendarDate } from "#posts/zoned-time.ts";

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
          // The viewer's day spans at most three of the queue's dates.
          const instants = [-1, 0, 1].flatMap((offset) => {
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
  readonly post: { readonly queueId: string | null };
}

/** A time of the day, the posts at it and the queues' slots still free. */
export interface DayRow<Placed extends DayPlaced> {
  readonly at: DateTime.Utc;
  /** Slots at this time that no post of their queue holds. */
  readonly openSlots: readonly DaySlot[];
  readonly posts: readonly Placed[];
}

/**
 * The day's rows, by time: each instant that holds a post or a slot, once,
 * with its posts in the order given and the slots no post of their queue
 * holds at that instant.
 */
export const dayRows = <Placed extends DayPlaced>(
  placed: readonly Placed[],
  slots: readonly DaySlot[]
): readonly DayRow<Placed>[] => {
  const instants = new Map<number, DateTime.Utc>(
    [...placed, ...slots].map(({ at }) => [DateTime.toEpochMillis(at), at])
  );

  return [...instants.entries()]
    .toSorted(([left], [right]) => left - right)
    .map(([millis, at]) => {
      const posts = placed.filter(
        (item) => DateTime.toEpochMillis(item.at) === millis
      );

      return {
        at,
        openSlots: slots.filter(
          (slot) =>
            DateTime.toEpochMillis(slot.at) === millis &&
            !posts.some(({ post }) => post.queueId === slot.queueId)
        ),
        posts,
      };
    });
};

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
