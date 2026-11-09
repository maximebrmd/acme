import { Context, Effect, Layer, Option } from "effect";

import type { InvalidReportRange } from "#analytics/domain/invalid-report-range.ts";
import {
  dayStarts,
  reportDays,
  reportRange,
} from "#analytics/domain/report-range.ts";
import type { ReportRange } from "#analytics/domain/report-range.ts";
import type { TrackedPost } from "#analytics/domain/tracked-post.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import type { PostId } from "#shared/domain/ids.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";
import type { LocalDate } from "#shared/domain/wall-clock.ts";

import { AnalyticsReports } from "./analytics-reports.ts";
import type {
  ChannelTotals,
  CountTotals,
  PostHistory,
} from "./analytics-reports.ts";

/** How many posts a summary ranks. */
export const topPostCount = 5;

/** What the posts of a range gained on one of its days. */
export interface EngagementDay {
  readonly date: LocalDate;
  readonly likes: number;
  readonly quotes: number;
  readonly replies: number;
  readonly reposts: number;
}

/**
 * The posts a workspace published over a range of days: their latest
 * counts, in all and by channel, what they gained each day, and those
 * doing best.
 */
export interface AnalyticsSummary {
  readonly channels: readonly ChannelTotals[];
  readonly days: readonly EngagementDay[];
  readonly range: ReportRange;
  readonly topPosts: readonly TrackedPost[];
  readonly totals: CountTotals;
}

const addOptional = (
  left: Option.Option<number>,
  right: Option.Option<number>
): Option.Option<number> =>
  Option.isNone(left)
    ? right
    : Option.some(left.value + Option.getOrElse(right, () => 0));

const totalOf = (channels: readonly ChannelTotals[]): CountTotals => {
  let sum: CountTotals = {
    impressions: Option.none(),
    likes: 0,
    posts: 0,
    quotes: Option.none(),
    replies: 0,
    reposts: 0,
  };

  for (const channel of channels) {
    sum = {
      impressions: addOptional(sum.impressions, channel.impressions),
      likes: sum.likes + channel.likes,
      posts: sum.posts + channel.posts,
      quotes: addOptional(sum.quotes, channel.quotes),
      replies: sum.replies + channel.replies,
      reposts: sum.reposts + channel.reposts,
    };
  }

  return sum;
};

/** Reading a workspace's analytics. Needs analytics:read. */
export class AnalyticsQueries extends Context.Service<
  AnalyticsQueries,
  {
    /**
     * The channels of one of the workspace's posts that analytics follows,
     * each with its counts over time. None for a post not published yet,
     * or not the workspace's.
     */
    readonly post: (
      actor: Actor,
      postId: PostId
    ) => Effect.Effect<
      readonly PostHistory[],
      DatabaseError | MissingPermission
    >;
    /** The posts published over the days of a range, in its time zone. */
    readonly summary: (
      actor: Actor,
      range: Pick<ReportRange, "from" | "timeZone" | "to">
    ) => Effect.Effect<
      AnalyticsSummary,
      DatabaseError | InvalidReportRange | MissingPermission
    >;
  }
>()("peal-server/analytics/application/AnalyticsQueries") {
  static readonly layer = Layer.effect(
    AnalyticsQueries,
    Effect.gen(function* AnalyticsQueriesLive() {
      const reports = yield* AnalyticsReports;

      const post = Effect.fn("AnalyticsQueries.post")(function* post(
        actor: Actor,
        postId: PostId
      ) {
        yield* Effect.fromResult(authorize(actor, "analytics:read"));

        return yield* reports.history(actor.workspaceId, postId);
      });

      const summary = Effect.fn("AnalyticsQueries.summary")(function* summary(
        actor: Actor,
        asked: Pick<ReportRange, "from" | "timeZone" | "to">
      ) {
        yield* Effect.fromResult(authorize(actor, "analytics:read"));

        const range = yield* Effect.fromResult(reportRange(asked));

        const rows = yield* reports.report(
          actor.workspaceId,
          dayStarts(range),
          topPostCount
        );

        const gains = new Map(rows.days.map((day) => [day.day, day]));

        const days = reportDays(range).map((date, index): EngagementDay => ({
          date,
          likes: gains.get(index)?.likes ?? 0,
          quotes: gains.get(index)?.quotes ?? 0,
          replies: gains.get(index)?.replies ?? 0,
          reposts: gains.get(index)?.reposts ?? 0,
        }));

        const found: AnalyticsSummary = {
          channels: rows.channels,
          days,
          range,
          topPosts: rows.top,
          totals: totalOf(rows.channels),
        };

        return found;
      });

      return AnalyticsQueries.of({ post, summary });
    })
  );
}
