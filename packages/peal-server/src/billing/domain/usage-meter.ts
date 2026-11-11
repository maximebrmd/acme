import { DateTime, Option, Result, Schema } from "effect";

import { PlatformSchema } from "#shared/domain/platform.ts";
import type { Platform } from "#shared/domain/platform.ts";

import { InvalidUsageRange } from "./invalid-usage-range.ts";

/**
 * What billing counts of each workspace, day by day (UTC), in its usage
 * ledger: counts only, never a post, a name or an address. Nothing here
 * limits or prices anything: the counts are the figures a price per post
 * or per connected channel and day would later be computed from.
 *
 * - `publishedPosts` is a counter: each post that went out adds one, on
 *   the day (UTC) it went out, under its platform (the record's
 *   `dimension`).
 * - `channels`, `members` and `mediaStorage` are the workspace's state at
 *   the end of a day, which the daily snapshot writes; `assistantRequests`
 *   the day's requests to the writing assistant, which it copies from the
 *   assistant's count. A day the snapshot did not run has none.
 *
 * A meter added later (messages, calls to a platform that bills per call)
 * is a new value of `meter`, with its own dimension.
 */
export const UsageStateSchema = Schema.Literals([
  "assistantRequests",
  "channels",
  "mediaStorage",
  "members",
]);

export type UsageState = typeof UsageStateSchema.Type;

/** One count of the ledger: a meter's quantity on a day, by dimension. */
export const UsageRecordSchema = Schema.Union([
  Schema.Struct({
    day: Schema.DateTimeUtc,
    dimension: PlatformSchema,
    meter: Schema.Literal("publishedPosts"),
    quantity: Schema.Int,
  }),
  Schema.Struct({
    day: Schema.DateTimeUtc,
    dimension: Schema.Literal(""),
    meter: UsageStateSchema,
    quantity: Schema.Int,
  }),
]);

export type UsageRecord = typeof UsageRecordSchema.Type;

/** How many days the ledger keeps (thirteen months and a little). */
export const usageRetentionDays = 400;

/** How many days one report covers at most, both ends included. */
export const maxUsageRangeDays = 92;

/** How many days a report covers when it is not told, ending today. */
export const defaultUsageRangeDays = 30;

/** The day (UTC) an instant counts in, as its first instant. */
export const usageDayOf = (instant: DateTime.Utc): DateTime.Utc =>
  DateTime.startOf(instant, "day");

/** At `now`, the ledger deletes the days before this one. */
export const usageCutoff = (now: DateTime.Utc): DateTime.Utc =>
  DateTime.subtract(usageDayOf(now), { days: usageRetentionDays });

/** The days a report covers, as their first instants, both included. */
export interface UsagePeriod {
  readonly from: DateTime.Utc;
  readonly to: DateTime.Utc;
}

const dayMillis = 86_400_000;

// How many days the period covers, both ends included.
const daysIn = ({ from, to }: UsagePeriod): number =>
  Math.round(
    (DateTime.toEpochMillis(to) - DateTime.toEpochMillis(from)) / dayMillis
  ) + 1;

/**
 * The period a report covers: `to` or today, and `from` or the 30 days
 * that end on `to`. Refused when it ends before it starts or spans more
 * than 92 days.
 */
export const usagePeriodOf = (
  asked: {
    readonly from: Option.Option<DateTime.Utc>;
    readonly to: Option.Option<DateTime.Utc>;
  },
  now: DateTime.Utc
): Result.Result<UsagePeriod, InvalidUsageRange> => {
  const to = usageDayOf(Option.getOrElse(asked.to, () => now));

  const from = usageDayOf(
    Option.getOrElse(asked.from, () =>
      DateTime.subtract(to, { days: defaultUsageRangeDays - 1 })
    )
  );

  const period: UsagePeriod = { from, to };
  const days = daysIn(period);

  return days >= 1 && days <= maxUsageRangeDays
    ? Result.succeed(period)
    : Result.fail(new InvalidUsageRange({ maxDays: maxUsageRangeDays }));
};

/** How many posts went out on one platform. */
export interface PlatformPosts {
  readonly platform: Platform;
  readonly posts: number;
}

/** A day of a workspace's usage. */
export interface UsageDay {
  /** The requests sent to the writing assistant that day. */
  readonly assistantRequests: number;
  /** The day's posts by platform, in the platforms' order by name. */
  readonly byPlatform: readonly PlatformPosts[];
  /** Connected at the end of the day; none for a day without a snapshot. */
  readonly channels: Option.Option<number>;
  readonly day: DateTime.Utc;
  /** Bytes stored at the end of the day. */
  readonly mediaStorage: Option.Option<number>;
  readonly members: Option.Option<number>;
  /** The posts that went out that day, one per channel. */
  readonly publishedPosts: number;
}

/** A period's usage, added up. */
export interface UsageTotals {
  readonly byPlatform: readonly PlatformPosts[];
  /**
   * The days' connected channels added up, the base of a price per
   * connected channel and day; the days without a snapshot are left out.
   */
  readonly channelDays: number;
  /** The days whose channels `channelDays` adds up. */
  readonly daysCounted: number;
  readonly publishedPosts: number;
}

/** A workspace's usage over a period: every day, then the totals. */
export interface UsageReport {
  readonly days: readonly UsageDay[];
  readonly totals: UsageTotals;
}

// The platforms' counts, in the platforms' order by name.
const platformPostsOf = (
  counts: ReadonlyMap<Platform, number>
): readonly PlatformPosts[] =>
  [...counts.entries()]
    .toSorted(([left], [right]) => left.localeCompare(right))
    .map(([platform, posts]) => ({ platform, posts }));

const addTo = (
  counts: Map<Platform, number>,
  platform: Platform,
  quantity: number
) => {
  counts.set(platform, (counts.get(platform) ?? 0) + quantity);
};

interface DayTally {
  assistantRequests: number;
  readonly byPlatform: Map<Platform, number>;
  readonly states: Map<UsageState, number>;
}

/**
 * The report of a period from the ledger's records: one entry per day,
 * oldest first, a day without records included, and the totals. Records
 * outside the period are left out.
 */
export const reportOf = (
  records: readonly UsageRecord[],
  period: UsagePeriod
): UsageReport => {
  const tallies = new Map<number, DayTally>();
  const days = daysIn(period);

  for (let index = 0; index < days; index += 1) {
    tallies.set(
      DateTime.toEpochMillis(DateTime.add(period.from, { days: index })),
      { assistantRequests: 0, byPlatform: new Map(), states: new Map() }
    );
  }

  for (const record of records) {
    const tally = tallies.get(DateTime.toEpochMillis(usageDayOf(record.day)));

    if (tally !== undefined) {
      if (record.meter === "publishedPosts") {
        addTo(tally.byPlatform, record.dimension, record.quantity);
      } else if (record.meter === "assistantRequests") {
        tally.assistantRequests += record.quantity;
      } else {
        tally.states.set(record.meter, record.quantity);
      }
    }
  }

  const totalByPlatform = new Map<Platform, number>();
  let channelDays = 0;
  let daysCounted = 0;

  const usageDays = [...tallies.entries()].map(([millis, tally]): UsageDay => {
    const channels = Option.fromUndefinedOr(tally.states.get("channels"));

    for (const [platform, posts] of tally.byPlatform) {
      addTo(totalByPlatform, platform, posts);
    }

    if (Option.isSome(channels)) {
      channelDays += channels.value;
      daysCounted += 1;
    }

    return {
      assistantRequests: tally.assistantRequests,
      byPlatform: platformPostsOf(tally.byPlatform),
      channels,
      day: DateTime.makeUnsafe(millis),
      mediaStorage: Option.fromUndefinedOr(tally.states.get("mediaStorage")),
      members: Option.fromUndefinedOr(tally.states.get("members")),
      publishedPosts: [...tally.byPlatform.values()].reduce(
        (sum, posts) => sum + posts,
        0
      ),
    };
  });

  const byPlatform = platformPostsOf(totalByPlatform);

  return {
    days: usageDays,
    totals: {
      byPlatform,
      channelDays,
      daysCounted,
      publishedPosts: byPlatform.reduce((sum, { posts }) => sum + posts, 0),
    },
  };
};
