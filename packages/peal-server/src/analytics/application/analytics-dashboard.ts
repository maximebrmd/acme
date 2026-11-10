import { Option } from "effect";

import type { UtcDay } from "#analytics/domain/account-metrics.ts";
import {
  addFollowerChanges,
  followerChange,
  followersByDay,
} from "#analytics/domain/account-series.ts";
import type {
  FollowerChange,
  FollowersRead,
} from "#analytics/domain/account-series.ts";
import type { ReportRange } from "#analytics/domain/report-range.ts";
import type { TrackedPost } from "#analytics/domain/tracked-post.ts";
import type { ChannelId } from "#shared/domain/ids.ts";
import type { Platform } from "#shared/domain/platform.ts";
import type { LocalDate } from "#shared/domain/wall-clock.ts";

import type {
  AccountDayRow,
  ChannelCounts,
  DayGains,
} from "./analytics-reports.ts";

// A dashboard, put together from what the reports read: pure, so it is
// the same whatever stores the rows.

/** The latest counts of some posts, added up, and their engagement. */
export interface DashboardTotals {
  readonly clicks: Option.Option<number>;
  readonly engagement: number;
  readonly impressions: Option.Option<number>;
  readonly likes: number;
  readonly posts: number;
  readonly quotes: Option.Option<number>;
  readonly reach: Option.Option<number>;
  readonly replies: number;
  readonly reposts: number;
  readonly saves: Option.Option<number>;
}

/** A range's numbers beside those of the range before. */
export interface Comparison {
  readonly followers: FollowerChange;
  /**
   * Whether the range before is still all kept: false when a platform's
   * terms keep its numbers for less than the range before goes back, so
   * the previous figures are missing what was deleted.
   */
  readonly previousKept: boolean;
  readonly previousFollowers: FollowerChange;
  readonly previousTotals: DashboardTotals;
  readonly totals: DashboardTotals;
}

export interface ChannelComparison extends Comparison {
  readonly channelId: ChannelId;
  readonly platform: Option.Option<Platform>;
}

export interface PlatformComparison extends Comparison {
  readonly platform: Platform;
}

/** One day of a dashboard. */
export interface DashboardDay {
  readonly date: LocalDate;
  readonly followers: Option.Option<number>;
  readonly likes: number;
  readonly quotes: number;
  readonly reach: Option.Option<number>;
  readonly replies: number;
  readonly reposts: number;
  readonly views: Option.Option<number>;
}

/** A workspace's analytics over a range, beside the range before. */
export interface Dashboard extends Comparison {
  readonly channels: readonly ChannelComparison[];
  readonly days: readonly DashboardDay[];
  readonly platforms: readonly PlatformComparison[];
  readonly previous: ReportRange;
  readonly range: ReportRange;
  readonly topPosts: readonly TrackedPost[];
}

/** One day of a channel. */
export interface ChannelDay extends DashboardDay {
  readonly following: Option.Option<number>;
  readonly posts: Option.Option<number>;
}

/** One channel's numbers day by day over a range. */
export interface ChannelSeries {
  readonly days: readonly ChannelDay[];
  readonly followers: FollowerChange;
  readonly platform: Option.Option<Platform>;
  readonly range: ReportRange;
  readonly totals: DashboardTotals;
}

const add = (
  left: Option.Option<number>,
  right: Option.Option<number>
): Option.Option<number> =>
  Option.isNone(left)
    ? right
    : Option.some(left.value + Option.getOrElse(right, () => 0));

/** No post: zero where every platform counts, unknown where only some do. */
export const noTotals: DashboardTotals = {
  clicks: Option.none(),
  engagement: 0,
  impressions: Option.none(),
  likes: 0,
  posts: 0,
  quotes: Option.none(),
  reach: Option.none(),
  replies: 0,
  reposts: 0,
  saves: Option.none(),
};

/** Some channels' counts together. */
export const totalsOf = (
  channels: readonly Omit<ChannelCounts, "channelId">[]
): DashboardTotals => {
  let sum = noTotals;

  for (const channel of channels) {
    sum = {
      clicks: add(sum.clicks, channel.clicks),
      engagement:
        sum.engagement +
        channel.likes +
        channel.reposts +
        channel.replies +
        Option.getOrElse(channel.quotes, () => 0),
      impressions: add(sum.impressions, channel.impressions),
      likes: sum.likes + channel.likes,
      posts: sum.posts + channel.posts,
      quotes: add(sum.quotes, channel.quotes),
      reach: add(sum.reach, channel.reach),
      replies: sum.replies + channel.replies,
      reposts: sum.reposts + channel.reposts,
      saves: add(sum.saves, channel.saves),
    };
  }

  return sum;
};

/** Each channel's reads of followers, in the order of their days. */
export const followersOf = (
  days: readonly AccountDayRow[]
): ReadonlyMap<ChannelId, readonly FollowersRead[]> => {
  const byChannel = new Map<ChannelId, FollowersRead[]>();

  for (const { channelId, day, followers } of days) {
    const series = byChannel.get(channelId) ?? [];

    series.push({ day, followers });
    byChannel.set(channelId, series);
  }

  return byChannel;
};

/** What a dashboard is put together from. */
export interface DashboardRows {
  /** The accounts' days from the previous range's first to the range's last. */
  readonly accountDays: readonly AccountDayRow[];
  readonly counts: readonly ChannelCounts[];
  readonly gains: readonly DayGains[];
  readonly platforms: ReadonlyMap<ChannelId, Platform>;
  readonly previous: ReportRange;
  readonly previousCounts: readonly ChannelCounts[];
  readonly range: ReportRange;
  /** Each day of the range, with the UTC day of the same name. */
  readonly rangeDays: readonly {
    readonly date: LocalDate;
    readonly day: UtcDay;
  }[];
  /** The previous range's first and last days. */
  readonly previousSpan: { readonly from: UtcDay; readonly to: UtcDay };
  /** Whether a platform still keeps all of the range before. */
  readonly previousKeptOn: (platform: Platform) => boolean;
  readonly topPosts: readonly TrackedPost[];
}

const sumOn = (
  rows: readonly AccountDayRow[],
  day: UtcDay,
  pick: (row: AccountDayRow) => Option.Option<number>
) => {
  let total = Option.none<number>();

  for (const row of rows) {
    if (row.day === day) {
      total = add(total, pick(row));
    }
  }

  return total;
};

/** The dashboard these rows make. */
export const dashboardOf = (rows: DashboardRows): Dashboard => {
  const [first] = rows.rangeDays;
  const last = rows.rangeDays.at(-1);
  const followers = followersOf(rows.accountDays);
  const current = new Map(rows.counts.map((row) => [row.channelId, row]));

  const before = new Map(
    rows.previousCounts.map((row) => [row.channelId, row])
  );

  // Every channel with posts in either range, or an account read.
  const channelIds = [
    ...new Set([...current.keys(), ...before.keys(), ...followers.keys()]),
  ].toSorted();

  const changeOver = (channelId: ChannelId, from: UtcDay, to: UtcDay) =>
    followerChange(followers.get(channelId) ?? [], from, to);

  const channels = channelIds.map((channelId): ChannelComparison => ({
    channelId,
    followers:
      first === undefined || last === undefined
        ? { current: Option.none(), gained: Option.none() }
        : changeOver(channelId, first.day, last.day),
    platform: Option.fromUndefinedOr(rows.platforms.get(channelId)),
    previousFollowers: changeOver(
      channelId,
      rows.previousSpan.from,
      rows.previousSpan.to
    ),
    previousKept: Option.match(
      Option.fromUndefinedOr(rows.platforms.get(channelId)),
      { onNone: () => true, onSome: rows.previousKeptOn }
    ),
    previousTotals: totalsOf(
      Option.toArray(Option.fromUndefinedOr(before.get(channelId)))
    ),
    totals: totalsOf(
      Option.toArray(Option.fromUndefinedOr(current.get(channelId)))
    ),
  }));

  const together = (members: readonly ChannelComparison[]): Comparison => ({
    followers: addFollowerChanges(members.map((member) => member.followers)),
    previousFollowers: addFollowerChanges(
      members.map((member) => member.previousFollowers)
    ),
    previousKept: members.every((member) => member.previousKept),
    previousTotals: totalsOf(
      rows.previousCounts.filter(({ channelId }) =>
        members.some((member) => member.channelId === channelId)
      )
    ),
    totals: totalsOf(
      rows.counts.filter(({ channelId }) =>
        members.some((member) => member.channelId === channelId)
      )
    ),
  });

  const platformNames = [
    ...new Set(channels.flatMap(({ platform }) => Option.toArray(platform))),
  ].toSorted();

  const gains = new Map(rows.gains.map((day) => [day.day, day]));

  const followersEachDay = followersByDay(
    [...followers.values()],
    rows.rangeDays.map(({ day }) => day)
  );

  return {
    ...together(channels),
    channels,
    days: rows.rangeDays.map(({ date, day }, index) => ({
      date,
      followers: followersEachDay[index] ?? Option.none(),
      likes: gains.get(index)?.likes ?? 0,
      quotes: gains.get(index)?.quotes ?? 0,
      reach: sumOn(rows.accountDays, day, (row) => row.reach),
      replies: gains.get(index)?.replies ?? 0,
      reposts: gains.get(index)?.reposts ?? 0,
      views: sumOn(rows.accountDays, day, (row) => row.views),
    })),
    platforms: platformNames.map((platform) => ({
      ...together(
        channels.filter((channel) =>
          Option.contains(channel.platform, platform)
        )
      ),
      platform,
    })),
    previous: rows.previous,
    range: rows.range,
    topPosts: rows.topPosts,
  };
};
