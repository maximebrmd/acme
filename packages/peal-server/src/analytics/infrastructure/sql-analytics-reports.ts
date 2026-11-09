import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { DateTime, Effect, Layer, Schema } from "effect";
import { SqlClient } from "effect/sql";

import { AnalyticsReports } from "#analytics/application/analytics-reports.ts";
import type {
  ChannelTotals,
  DayGains,
  PostHistory,
  ReportRows,
} from "#analytics/application/analytics-reports.ts";
import { PostMetrics } from "#analytics/domain/post-metrics.ts";
import type { CollectionEnd } from "#analytics/domain/tracked-post.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { ChannelIdSchema } from "#shared/domain/ids.ts";
import type { PostId, WorkspaceId } from "#shared/domain/ids.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { trackedPostOf } from "./drizzle-tracked-posts.ts";
import { metricSnapshots, trackedPosts } from "./schema.ts";

const failed = (cause: unknown) => new DatabaseError({ cause });

const date = (instant: DateTime.Utc) => DateTime.toDateUtc(instant);

// Sums come back as float8, which reads as a number; a count of posts as
// int4. Quotes and impressions are null where no post had them.
const ChannelRowSchema = Schema.Struct({
  channelId: ChannelIdSchema,
  impressions: Schema.OptionFromNullOr(Schema.Number),
  likes: Schema.Number,
  posts: Schema.Int,
  quotes: Schema.OptionFromNullOr(Schema.Number),
  replies: Schema.Number,
  reposts: Schema.Number,
});

const DayRowSchema = Schema.Struct({
  day: Schema.Int,
  likes: Schema.Number,
  quotes: Schema.Number,
  replies: Schema.Number,
  reposts: Schema.Number,
});

const decodeChannels = Schema.decodeUnknownEffect(
  Schema.Array(ChannelRowSchema)
);

const decodeDays = Schema.decodeUnknownEffect(Schema.Array(DayRowSchema));

const decodeMetrics = Schema.decodeUnknownEffect(PostMetrics);

type SnapshotRow = typeof metricSnapshots.$inferSelect;

const snapshotOf = (snapshot: SnapshotRow) =>
  decodeMetrics({
    impressions: snapshot.impressions,
    likes: snapshot.likes,
    quotes: snapshot.quotes,
    replies: snapshot.replies,
    reposts: snapshot.reposts,
  }).pipe(
    Effect.orDie,
    Effect.map((metrics) => ({
      collectedAt: DateTime.fromDateUnsafe(snapshot.collectedAt),
      metrics,
    }))
  );

// A post on a platform Acme reads no counts on, which it stopped reading at
// its first turn: it holds no counts and never will, so reports leave it
// out rather than show it with none.
const unreadable: CollectionEnd = "unsupported";

const readable = or(
  isNull(trackedPosts.endReason),
  ne(trackedPosts.endReason, unreadable)
);

/**
 * Reports on what analytics stored, in Postgres. The days of a range are
 * the instants each starts at, which the domain computes in the reader's
 * time zone: Postgres buckets snapshots with them (`width_bucket`) and
 * never applies a zone rule of its own.
 */
export const SqlAnalyticsReports = Layer.effect(
  AnalyticsReports,
  Effect.gen(function* SqlAnalyticsReports() {
    const db = yield* Drizzle;
    const client = yield* SqlClient.SqlClient;

    const history = Effect.fn("AnalyticsReports.history")(function* history(
      workspaceId: WorkspaceId,
      postId: PostId
    ) {
      const rows = yield* db
        .select()
        .from(trackedPosts)
        .where(
          and(
            eq(trackedPosts.workspaceId, workspaceId),
            eq(trackedPosts.postId, postId),
            readable
          )
        )
        .orderBy(asc(trackedPosts.publishedAt), asc(trackedPosts.targetId))
        .pipe(Effect.mapError(failed));

      if (rows.length === 0) {
        const none: readonly PostHistory[] = [];

        return none;
      }

      const snapshots = yield* db
        .select()
        .from(metricSnapshots)
        .where(
          inArray(
            metricSnapshots.targetId,
            rows.map(({ targetId }) => targetId)
          )
        )
        .orderBy(asc(metricSnapshots.collectedAt))
        .pipe(Effect.mapError(failed));

      const byTarget = new Map<string, SnapshotRow[]>();

      for (const snapshot of snapshots) {
        byTarget.set(snapshot.targetId, [
          ...(byTarget.get(snapshot.targetId) ?? []),
          snapshot,
        ]);
      }

      const histories: PostHistory[] = [];

      for (const row of rows) {
        histories.push({
          post: yield* trackedPostOf(row),
          snapshots: yield* Effect.all(
            (byTarget.get(row.targetId) ?? []).map(snapshotOf)
          ),
        });
      }

      return histories;
    });

    const report = Effect.fn("AnalyticsReports.report")(function* report(
      workspaceId: WorkspaceId,
      starts: readonly DateTime.Utc[],
      top: number
    ) {
      const [first] = starts;
      const last = starts.at(-1);

      if (first === undefined || last === undefined) {
        return yield* Effect.die("A report covers at least one day");
      }

      const start = date(first);
      const end = date(last);
      const bounds = starts.map(date);

      // The posts published in the range, by channel, with their latest
      // counts added up.
      const channels: readonly ChannelTotals[] = yield* client`
        SELECT
          channel_id AS "channelId",
          count(*)::int AS posts,
          coalesce(sum(likes), 0)::float8 AS likes,
          coalesce(sum(reposts), 0)::float8 AS reposts,
          coalesce(sum(replies), 0)::float8 AS replies,
          sum(quotes)::float8 AS quotes,
          sum(impressions)::float8 AS impressions
        FROM analytics.tracked_posts
        WHERE workspace_id = ${workspaceId}
          AND published_at >= ${start}
          AND published_at < ${end}
          AND end_reason IS DISTINCT FROM ${unreadable}
        GROUP BY channel_id
        ORDER BY channel_id
      `.pipe(Effect.flatMap(decodeChannels), Effect.mapError(failed));

      // What those posts gained each day: the last snapshot of each post
      // in each day, less the one of its day before (none before the first,
      // as a post starts from nothing). Day 1 is the range's first.
      const days: readonly DayGains[] = yield* client`
        WITH posts AS (
          SELECT target_id FROM analytics.tracked_posts
          WHERE workspace_id = ${workspaceId}
            AND published_at >= ${start}
            AND published_at < ${end}
        ),
        daily AS (
          SELECT DISTINCT ON (s.target_id, day)
            s.target_id,
            width_bucket(s.collected_at, ${bounds}::timestamptz[]) AS day,
            s.likes,
            s.reposts,
            s.replies,
            coalesce(s.quotes, 0) AS quotes
          FROM analytics.metric_snapshots s
          JOIN posts p ON p.target_id = s.target_id
          WHERE s.collected_at < ${end}
          ORDER BY s.target_id, day, s.collected_at DESC
        ),
        gains AS (
          SELECT
            day,
            likes - coalesce(lag(likes) OVER w, 0) AS likes,
            reposts - coalesce(lag(reposts) OVER w, 0) AS reposts,
            replies - coalesce(lag(replies) OVER w, 0) AS replies,
            quotes - coalesce(lag(quotes) OVER w, 0) AS quotes
          FROM daily
          WINDOW w AS (PARTITION BY target_id ORDER BY day)
        )
        SELECT
          (day - 1)::int AS day,
          sum(likes)::float8 AS likes,
          sum(reposts)::float8 AS reposts,
          sum(replies)::float8 AS replies,
          sum(quotes)::float8 AS quotes
        FROM gains
        WHERE day >= 1
        GROUP BY day
        ORDER BY day
      `.pipe(Effect.flatMap(decodeDays), Effect.mapError(failed));

      // The posts of the range people did the most with, added up in
      // bigint: one post's counts together can pass what an integer holds.
      const engagement = sql`${trackedPosts.likes}::bigint + ${trackedPosts.reposts} + ${trackedPosts.replies} + coalesce(${trackedPosts.quotes}, 0)`;

      const topRows = yield* db
        .select()
        .from(trackedPosts)
        .where(
          and(
            eq(trackedPosts.workspaceId, workspaceId),
            gte(trackedPosts.publishedAt, start),
            lt(trackedPosts.publishedAt, end),
            isNotNull(trackedPosts.likes)
          )
        )
        .orderBy(
          desc(engagement),
          desc(trackedPosts.publishedAt),
          asc(trackedPosts.targetId)
        )
        .limit(top)
        .pipe(Effect.mapError(failed));

      const found: ReportRows = {
        channels,
        days,
        top: yield* Effect.all(topRows.map(trackedPostOf)),
      };

      return found;
    });

    return AnalyticsReports.of({ history, report });
  })
);
