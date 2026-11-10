import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { UtcDay } from "#analytics/domain/account-metrics.ts";
import type { PostMetrics } from "#analytics/domain/post-metrics.ts";
import type { TrackedPost } from "#analytics/domain/tracked-post.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { ChannelId, PostId, WorkspaceId } from "#shared/domain/ids.ts";
import type { Platform } from "#shared/domain/platform.ts";

/** A post's counts as read at one moment. */
export interface MetricsSnapshot {
  readonly collectedAt: DateTime.Utc;
  readonly metrics: PostMetrics;
}

/** A post followed on one channel, with its snapshots, oldest first. */
export interface PostHistory {
  readonly post: TrackedPost;
  readonly snapshots: readonly MetricsSnapshot[];
}

/** Likes, reposts and replies, added up; quotes and impressions too, where some post had them. */
export interface CountTotals {
  readonly impressions: Option.Option<number>;
  readonly likes: number;
  readonly posts: number;
  readonly quotes: Option.Option<number>;
  readonly replies: number;
  readonly reposts: number;
}

/** A channel's posts published in a report's range, and their latest counts. */
export interface ChannelTotals extends CountTotals {
  readonly channelId: ChannelId;
}

/**
 * What a report's posts gained over one of its days, which `day` numbers
 * from 0: the counts read by the end of the day, less those read by its
 * start. Counts can go down, when people take a like back.
 */
export interface DayGains {
  readonly day: number;
  readonly likes: number;
  readonly quotes: number;
  readonly replies: number;
  readonly reposts: number;
}

/**
 * A channel's posts published in a range, with every count added up: the
 * ones only some platforms tell are none when no post had them.
 */
export interface ChannelCounts extends ChannelTotals {
  readonly clicks: Option.Option<number>;
  readonly reach: Option.Option<number>;
  readonly saves: Option.Option<number>;
}

/** A channel analytics follows, and its platform. */
export interface FollowedChannel {
  readonly channelId: ChannelId;
  readonly platform: Platform;
}

/** A channel's account on one UTC day, as stored. */
export interface AccountDayRow {
  readonly channelId: ChannelId;
  readonly day: UtcDay;
  readonly followers: Option.Option<number>;
  readonly following: Option.Option<number>;
  readonly platform: Platform;
  readonly posts: Option.Option<number>;
  readonly reach: Option.Option<number>;
  readonly views: Option.Option<number>;
}

/** A post of a range on one channel, for an export. */
export interface ExportedPost {
  readonly platform: Option.Option<Platform>;
  readonly post: TrackedPost;
}

/** A span of instants, and one channel's posts only when given. */
export interface PostsAsked {
  readonly channelId: Option.Option<ChannelId>;
  readonly end: DateTime.Utc;
  readonly start: DateTime.Utc;
  readonly workspaceId: WorkspaceId;
}

/** A span of UTC days, and one channel's only when given. */
export interface AccountDaysAsked {
  readonly channelId: Option.Option<ChannelId>;
  readonly from: UtcDay;
  readonly to: UtcDay;
  readonly workspaceId: WorkspaceId;
}

/** What a report reads: by channel, by day, and the posts doing best. */
export interface ReportRows {
  readonly channels: readonly ChannelTotals[];
  readonly days: readonly DayGains[];
  readonly top: readonly TrackedPost[];
}

/** Reads what analytics stored, for reports. */
export class AnalyticsReports extends Context.Service<
  AnalyticsReports,
  {
    /** The post's channels that analytics follows, by when they went live. */
    readonly history: (
      workspaceId: WorkspaceId,
      postId: PostId
    ) => Effect.Effect<readonly PostHistory[], DatabaseError>;
    /**
     * The workspace's posts published from the first of `starts` to the
     * last: `starts` lists when each day of the range starts, then when the
     * range ends. `top` is how many posts to rank, by engagement.
     */
    readonly report: (
      workspaceId: WorkspaceId,
      starts: readonly DateTime.Utc[],
      top: number
    ) => Effect.Effect<ReportRows, DatabaseError>;
    /** The posts published in a span, by channel, with every count. */
    readonly counts: (
      asked: PostsAsked
    ) => Effect.Effect<readonly ChannelCounts[], DatabaseError>;
    /**
     * What the posts published from the first of `starts` to the last
     * gained each day, on one channel only when given.
     */
    readonly gains: (
      workspaceId: WorkspaceId,
      starts: readonly DateTime.Utc[],
      channelId: Option.Option<ChannelId>
    ) => Effect.Effect<readonly DayGains[], DatabaseError>;
    /** The posts of a span people did the most with, `limit` at most. */
    readonly top: (
      asked: PostsAsked,
      limit: number
    ) => Effect.Effect<readonly TrackedPost[], DatabaseError>;
    /** The workspace's channels analytics follows, with their platforms. */
    readonly channels: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<readonly FollowedChannel[], DatabaseError>;
    /**
     * The accounts' days over a span, by channel then day, and before them
     * each channel's last day with followers before the span, so a change
     * over it has where it started.
     */
    readonly accountDays: (
      asked: AccountDaysAsked
    ) => Effect.Effect<readonly AccountDayRow[], DatabaseError>;
    /**
     * A page of a span's posts for an export, in the order they went
     * live, after `after` when given.
     */
    readonly postsPage: (
      asked: PostsAsked,
      after: Option.Option<Pick<TrackedPost, "publishedAt" | "targetId">>,
      limit: number
    ) => Effect.Effect<readonly ExportedPost[], DatabaseError>;
    /**
     * A page of a span's account days for an export, by channel then day,
     * after `after` when given.
     */
    readonly accountDaysPage: (
      asked: AccountDaysAsked,
      after: Option.Option<Pick<AccountDayRow, "channelId" | "day">>,
      limit: number
    ) => Effect.Effect<readonly AccountDayRow[], DatabaseError>;
  }
>()("peal-server/analytics/application/AnalyticsReports") {}
