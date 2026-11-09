import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { PostMetrics } from "#analytics/domain/post-metrics.ts";
import type { TrackedPost } from "#analytics/domain/tracked-post.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { ChannelId, PostId, WorkspaceId } from "#shared/domain/ids.ts";

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
  }
>()("peal-server/analytics/application/AnalyticsReports") {}
