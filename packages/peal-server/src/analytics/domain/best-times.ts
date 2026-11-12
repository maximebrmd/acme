import { DateTime, Option, Order } from "effect";

import type { Platform } from "#shared/domain/platform.ts";
import type { TimeZoneId } from "#shared/domain/time-zone.ts";
import {
  addDays,
  fromWallClock,
  LocalTimeSchema,
} from "#shared/domain/wall-clock.ts";
import type { LocalDate, Weekday } from "#shared/domain/wall-clock.ts";

import { postCounts } from "./analytics-numbers.ts";

// When a channel's posts did best, from the counts Peal already kept: by
// weekday and hour in a zone, the median of what each post was given. It
// says what happened, never what will: the floors keep a handful of posts
// from reading as a pattern. The numbers are judgement, copied in the
// contract and kept equal by a test.

/** An hour with fewer posts than this has no figure. */
export const minimumPostsPerHour = 3;

/** A channel with fewer posts than this in the range is not ranked. */
export const minimumPosts = 20;

/** How many hours `best` lists at most. */
export const bestHours = 5;

/**
 * A post younger than this is left out: its counts are still read every
 * hour and still moving.
 */
export const settlingHours = 48;

/** The days a reading of best times may cover. */
export const bestTimesPeriods = [30, 90, 180] as const;

export type BestTimesPeriod = (typeof bestTimesPeriods)[number];

/**
 * What a post was given that the reading weighs: likes, reposts, replies
 * and quotes, those of them the platform gives. A platform that gives none
 * of them has nothing to weigh.
 */
export const weighedCounts = (
  platform: Platform
): readonly ("likes" | "quotes" | "replies" | "reposts")[] =>
  postCounts[platform].flatMap((count) =>
    count === "likes" ||
    count === "quotes" ||
    count === "replies" ||
    count === "reposts"
      ? [count]
      : []
  );

/** A post of the range, when it went live and what it was given. */
export interface WeighedPost {
  readonly publishedAt: DateTime.Utc;
  readonly score: number;
}

/** When a local hour of the range starts, and which weekday and hour it is. */
export interface HourStart {
  readonly at: DateTime.Utc;
  readonly hour: number;
  readonly weekday: Weekday;
}

const weekdays: readonly Weekday[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const hours = Array.from({ length: 24 }, (_, hour) => hour);

const dayMillis = 24 * 60 * 60 * 1000;

const byDay: Order.Order<LocalDate> = Order.combine(
  Order.mapInput(Order.Number, ({ year }: LocalDate) => year),
  Order.combine(
    Order.mapInput(Order.Number, ({ month }: LocalDate) => month),
    Order.mapInput(Order.Number, ({ day }: LocalDate) => day)
  )
);

/**
 * When each local hour of the days `from` to `to` starts in the zone, in
 * order. A day the clocks go forward has 23: the skipped hour starts when
 * the next does, so it has no start of its own. A day they go back has 25
 * hours but 24 starts: the repeated hour is one, from its first start to
 * the next hour's.
 */
export const hourStarts = (
  from: LocalDate,
  to: LocalDate,
  timeZone: TimeZoneId
): HourStart[] => {
  const starts: HourStart[] = [];
  const midnight = LocalTimeSchema.make({ hour: 0, minute: 0 });
  let dayStart = fromWallClock(from, midnight, timeZone);

  for (
    let date = from;
    Order.isLessThanOrEqualTo(byDay)(date, to);
    date = addDays(date, 1)
  ) {
    const next = addDays(date, 1);
    const nextStart = fromWallClock(next, midnight, timeZone);
    const weekday = weekdays[DateTime.getPart(dayStart, "weekDay")] ?? "sunday";

    // A day of 24 hours has no change of the clocks: its hours follow its
    // midnight, an hour apart. Only a day the clocks change is read hour
    // by hour, so a reading of 180 days asks the zone's rules about 180
    // midnights, not 4,320 hours.
    const plain =
      DateTime.toEpochMillis(nextStart) - DateTime.toEpochMillis(dayStart) ===
      dayMillis;

    for (const hour of hours) {
      const zoned = plain
        ? DateTime.add(dayStart, { hours: hour })
        : fromWallClock(
            date,
            LocalTimeSchema.make({ hour, minute: 0 }),
            timeZone
          );

      const at = DateTime.toUtc(zoned);
      const last = starts.at(-1);

      // The jump's moment, which the next hour starts at too.
      if (last !== undefined && DateTime.Equivalence(last.at, at)) {
        starts.pop();
      }

      starts.push({ at, hour, weekday });
    }

    dayStart = nextStart;
  }

  return starts;
};

/** The posts of one weekday and hour, and their median when there are enough. */
export interface HourBucket {
  readonly hour: number;
  /** None under `minimumPostsPerHour`, or where nothing is ranked. */
  readonly median: Option.Option<number>;
  readonly posts: number;
  readonly weekday: Weekday;
}

/** When a channel's posts did best over a range. */
export interface BestTimes {
  /** At most `bestHours`, by median then posts; none when not enough. */
  readonly best: readonly HourBucket[];
  /** Every weekday and hour with a post, by weekday then hour. */
  readonly buckets: readonly HourBucket[];
  /** Whether the range holds `minimumPosts` posts at least. */
  readonly enough: boolean;
  /** How many posts were weighed. */
  readonly posts: number;
}

const median = (scores: readonly number[]): number => {
  const sorted = scores.toSorted((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 1
    ? (sorted[middle] ?? 0)
    : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
};

// The start of the hour an instant falls in: the last that is not after it.
const hourOf = (
  starts: readonly HourStart[],
  at: DateTime.Utc
): Option.Option<HourStart> => {
  let low = 0;
  let high = starts.length - 1;
  let found: HourStart | undefined;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const start = starts[middle];

    if (start === undefined) {
      break;
    }

    if (DateTime.isLessThanOrEqualTo(start.at, at)) {
      found = start;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  return Option.fromUndefinedOr(found);
};

const weekdayIndex = (weekday: Weekday) => weekdays.indexOf(weekday);

const byBest: Order.Order<HourBucket> = Order.combine(
  Order.mapInput(Order.flip(Order.Number), ({ median: value }: HourBucket) =>
    Option.getOrElse(value, () => 0)
  ),
  Order.combine(
    Order.mapInput(Order.flip(Order.Number), ({ posts }: HourBucket) => posts),
    Order.combine(
      Order.mapInput(Order.Number, ({ weekday }: HourBucket) =>
        weekdayIndex(weekday)
      ),
      Order.mapInput(Order.Number, ({ hour }: HourBucket) => hour)
    )
  )
);

/**
 * The posts folded into the weekday and hour they went live in, by the
 * hours `starts` lists: each hour's posts and their median, the floors
 * applied, and the best hours, ties broken by posts, then by weekday and
 * hour so the answer is the same every time.
 */
export const bestTimesOf = (
  starts: readonly HourStart[],
  posts: readonly WeighedPost[]
): BestTimes => {
  const scores = new Map<string, { scores: number[]; start: HourStart }>();
  let weighed = 0;

  for (const post of posts) {
    const start = hourOf(starts, post.publishedAt);

    if (Option.isSome(start)) {
      const key = `${start.value.weekday}:${String(start.value.hour)}`;
      const bucket = scores.get(key) ?? { scores: [], start: start.value };

      bucket.scores.push(post.score);
      scores.set(key, bucket);
      weighed += 1;
    }
  }

  const enough = weighed >= minimumPosts;

  const buckets = [...scores.values()]
    .map(({ scores: given, start }): HourBucket => ({
      hour: start.hour,
      median:
        enough && given.length >= minimumPostsPerHour
          ? Option.some(median(given))
          : Option.none(),
      posts: given.length,
      weekday: start.weekday,
    }))
    .toSorted(
      (left, right) =>
        weekdayIndex(left.weekday) - weekdayIndex(right.weekday) ||
        left.hour - right.hour
    );

  return {
    best: buckets
      .filter(({ median: value }) => Option.isSome(value))
      .toSorted(byBest)
      .slice(0, bestHours),
    buckets,
    enough,
    posts: weighed,
  };
};
