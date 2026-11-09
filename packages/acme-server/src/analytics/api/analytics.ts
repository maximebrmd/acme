import {
  Api,
  CurrentMember,
  Forbidden,
  InvalidDateRange,
  InvalidTimeZone,
} from "acme-contract";
import type {
  AnalyticsSummary as SummaryView,
  CalendarDay,
  PostMetrics as MetricsView,
  TargetMetrics,
} from "acme-contract";
import { Effect, Option, Schema } from "effect";
import { HttpApiBuilder } from "effect/http-api";

import { AnalyticsQueries } from "#analytics/application/analytics-queries.ts";
import type { AnalyticsSummary } from "#analytics/application/analytics-queries.ts";
import type {
  CountTotals,
  PostHistory,
} from "#analytics/application/analytics-reports.ts";
import { engagementOf } from "#analytics/domain/post-metrics.ts";
import type { PostMetrics } from "#analytics/domain/post-metrics.ts";
import { actorOf } from "#shared/api/actor.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { authorize } from "#shared/domain/authorize.ts";
import { PostIdSchema } from "#shared/domain/ids.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";
import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";
import { LocalDateSchema } from "#shared/domain/wall-clock.ts";
import type { LocalDate } from "#shared/domain/wall-clock.ts";

const decodePostId = Schema.decodeUnknownOption(PostIdSchema);

const decodeTimeZone = Schema.decodeUnknownOption(TimeZoneIdSchema);

const decodeDate = Schema.decodeUnknownOption(LocalDateSchema);

const forbidden = () => Effect.fail(new Forbidden());

const noHistory: readonly PostHistory[] = [];

const pad = (value: number, length = 2) =>
  value.toString().padStart(length, "0");

/** A day as the contract writes it: YYYY-MM-DD. */
const dayView = ({ day, month, year }: LocalDate): CalendarDay =>
  `${pad(year, 4)}-${pad(month)}-${pad(day)}`;

// The contract checked the day is on the calendar. One before 1970 is not
// a date Acme keeps, and no post went out then: no range has it.
const dateFrom = (day: CalendarDay) => {
  const [year = 0, month = 0, date = 0] = day.split("-").map(Number);

  return decodeDate({ day: date, month, year });
};

const metricsView = (metrics: PostMetrics): MetricsView => ({
  impressions: Option.getOrNull(metrics.impressions),
  likes: metrics.likes,
  quotes: Option.getOrNull(metrics.quotes),
  replies: metrics.replies,
  reposts: metrics.reposts,
});

const totalsView = (totals: CountTotals) => ({
  impressions: Option.getOrNull(totals.impressions),
  likes: totals.likes,
  posts: totals.posts,
  quotes: Option.getOrNull(totals.quotes),
  replies: totals.replies,
  reposts: totals.reposts,
});

const targetView = ({ post, snapshots }: PostHistory): TargetMetrics => ({
  channelId: post.channelId,
  collecting: post.collection._tag === "collecting",
  lastCollectedAt: Option.getOrNull(post.lastCollectedAt),
  latest: post.latest.pipe(Option.map(metricsView), Option.getOrNull),
  permalink: Option.getOrNull(post.permalink),
  publishedAt: post.publishedAt,
  snapshots: snapshots.map(({ collectedAt, metrics }) => ({
    collectedAt,
    metrics: metricsView(metrics),
  })),
  targetId: post.targetId,
});

const summaryView = (summary: AnalyticsSummary): SummaryView => ({
  channels: summary.channels.map((channel) => ({
    ...totalsView(channel),
    channelId: channel.channelId,
  })),
  days: summary.days.map(({ date, ...gains }) => ({
    ...gains,
    date: dayView(date),
  })),
  from: dayView(summary.range.from),
  timeZone: summary.range.timeZone,
  to: dayView(summary.range.to),
  topPosts: summary.topPosts.flatMap((post) =>
    Option.match(post.latest, {
      onNone: () => [],
      onSome: (metrics) => [
        {
          channelId: post.channelId,
          engagement: engagementOf(metrics),
          metrics: metricsView(metrics),
          permalink: Option.getOrNull(post.permalink),
          postId: post.postId,
          publishedAt: post.publishedAt,
          targetId: post.targetId,
        },
      ],
    })
  ),
  totals: totalsView(summary.totals),
});

export const AnalyticsHandlers = HttpApiBuilder.group(
  Api,
  "analytics",
  Effect.fn(function* analyticsHandlers(handlers) {
    const queries = yield* AnalyticsQueries;

    return handlers.handleAll({
      post: ({ params }) =>
        Effect.gen(function* post() {
          const actor = actorOf(yield* CurrentMember);
          const postId = decodePostId(params.postId);

          // An id that is not a post's names none: nothing was read of it.
          const found: Effect.Effect<
            readonly PostHistory[],
            DatabaseError | MissingPermission
          > = Option.match(postId, {
            onNone: () =>
              Effect.fromResult(authorize(actor, "analytics:read")).pipe(
                Effect.as(noHistory)
              ),
            onSome: (id) => queries.post(actor, id),
          });

          const histories = yield* found.pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: forbidden,
            })
          );

          return { postId: params.postId, targets: histories.map(targetView) };
        }),
      summary: ({ query }) =>
        Effect.gen(function* summary() {
          const actor = actorOf(yield* CurrentMember);
          const timeZone = decodeTimeZone(query.timeZone);

          if (Option.isNone(timeZone)) {
            return yield* new InvalidTimeZone({ timeZone: query.timeZone });
          }

          const from = dateFrom(query.from);
          const to = dateFrom(query.to);

          if (Option.isNone(from) || Option.isNone(to)) {
            return yield* new InvalidDateRange();
          }

          const found = yield* queries
            .summary(actor, {
              from: from.value,
              timeZone: timeZone.value,
              to: to.value,
            })
            .pipe(
              Effect.catchTags({
                DatabaseError: Effect.die,
                InvalidReportRange: () => Effect.fail(new InvalidDateRange()),
                MissingPermission: forbidden,
              })
            );

          return summaryView(found);
        }),
    });
  })
);
