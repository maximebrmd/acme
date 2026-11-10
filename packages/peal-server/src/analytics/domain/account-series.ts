import { Option } from "effect";

import type { UtcDay } from "./account-metrics.ts";

// Followers over time, from the days Peal read an account. Peal keeps them
// from the day a channel is connected, one read a day, so a range may
// start before the first read, and a day may have none.

/** The followers read on one day, if the platform gave them. */
export interface FollowersRead {
  readonly day: UtcDay;
  readonly followers: Option.Option<number>;
}

/** Followers at the end of a range, and their change over it. */
export interface FollowerChange {
  readonly current: Option.Option<number>;
  readonly gained: Option.Option<number>;
}

/** Nothing was read: neither is known. */
export const unknownFollowers: FollowerChange = {
  current: Option.none(),
  gained: Option.none(),
};

// The followers known on the days `keep` takes, in order. Days are
// written YYYY-MM-DD, which sorts as the calendar does.
const known = (
  series: readonly FollowersRead[],
  keep: (day: UtcDay) => boolean
): readonly number[] =>
  series.flatMap(({ day, followers }) =>
    keep(day) ? Option.toArray(followers) : []
  );

/**
 * A channel's followers over the days from `from` to `to`, from its reads
 * in order: how many by the end, and how many more than at the start,
 * which is the last read before the range, or the first in it for a
 * channel first read during it. Unknown when nothing was read by its end.
 */
export const followerChange = (
  series: readonly FollowersRead[],
  from: UtcDay,
  to: UtcDay
): FollowerChange => {
  const before = known(series, (day) => day < from);
  const during = known(series, (day) => day >= from && day <= to);
  const current = Option.fromUndefinedOr(during.at(-1) ?? before.at(-1));
  const start = Option.fromUndefinedOr(before.at(-1) ?? during[0]);

  return {
    current,
    gained: Option.zipWith(current, start, (end, first) => end - first),
  };
};

const add = (
  left: Option.Option<number>,
  right: Option.Option<number>
): Option.Option<number> =>
  Option.isNone(left)
    ? right
    : Option.some(left.value + Option.getOrElse(right, () => 0));

/** Several channels' changes together: unknown only when all are. */
export const addFollowerChanges = (
  changes: readonly FollowerChange[]
): FollowerChange => {
  let total = unknownFollowers;

  for (const change of changes) {
    total = {
      current: add(total.current, change.current),
      gained: add(total.gained, change.gained),
    };
  }

  return total;
};

/**
 * The followers of several channels together on each of `days`: each
 * channel's last known by that day, added up; none while no channel was
 * read yet.
 */
export const followersByDay = (
  channels: readonly (readonly FollowersRead[])[],
  days: readonly UtcDay[]
): readonly Option.Option<number>[] =>
  days.map((day) => {
    let total = Option.none<number>();

    for (const series of channels) {
      total = add(
        total,
        Option.fromUndefinedOr(known(series, (read) => read <= day).at(-1))
      );
    }

    return total;
  });
