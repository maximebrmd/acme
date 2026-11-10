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
import { DateTime, Effect, Layer, Option, Schema } from "effect";
import { SqlClient } from "effect/sql";

import { AnalyticsReports } from "#analytics/application/analytics-reports.ts";
import type {
  AccountDayRow,
  AccountDaysAsked,
  ChannelCounts,
  ChannelTotals,
  DayGains,
  ExportedPost,
  PostHistory,
  PostsAsked,
  ReportRows,
} from "#analytics/application/analytics-reports.ts";
import { UtcDaySchema } from "#analytics/domain/account-metrics.ts";
import { PostMetrics } from "#analytics/domain/post-metrics.ts";
import type {
  CollectionEnd,
  TrackedPost,
} from "#analytics/domain/tracked-post.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { ChannelIdSchema } from "#shared/domain/ids.ts";
import type { ChannelId, PostId, WorkspaceId } from "#shared/domain/ids.ts";
import { PlatformSchema } from "#shared/domain/platform.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { trackedPostOf } from "./drizzle-tracked-posts.ts";
import { metricSnapshots, trackedChannels, trackedPosts } from "./schema.ts";

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

const optionalSum = Schema.OptionFromNullOr(Schema.Number);

const decodeCounts = Schema.decodeUnknownEffect(
  Schema.Array(
    Schema.Struct({
      ...ChannelRowSchema.fields,
      clicks: optionalSum,
      reach: optionalSum,
      saves: optionalSum,
    })
  )
);

const decodeFollowed = Schema.decodeUnknownEffect(
  Schema.Array(
    Schema.Struct({ channelId: ChannelIdSchema, platform: PlatformSchema })
  )
);

const optionalCount = Schema.OptionFromNullOr(Schema.Int);

const decodeAccountDays = Schema.decodeUnknownEffect(
  Schema.Array(
    Schema.Struct({
      channelId: ChannelIdSchema,
      day: UtcDaySchema,
      followers: optionalCount,
      following: optionalCount,
      platform: PlatformSchema,
      posts: optionalCount,
      reach: optionalCount,
      views: optionalCount,
    })
  )
);

const decodePlatform = Schema.decodeUnknownOption(PlatformSchema);

const iso = (instant: DateTime.Utc) => DateTime.formatIso(instant);

const accountDayColumns = `
  s.channel_id AS "channelId", s.day::text AS day, c.platform,
  s.followers, s.following, s.posts, s.reach, s.views
`;

type SnapshotRow = typeof metricSnapshots.$inferSelect;

const snapshotOf = (snapshot: SnapshotRow) =>
  decodeMetrics({
    clicks: snapshot.clicks,
    impressions: snapshot.impressions,
    likes: snapshot.likes,
    quotes: snapshot.quotes,
    reach: snapshot.reach,
    replies: snapshot.replies,
    reposts: snapshot.reposts,
    saves: snapshot.saves,
  }).pipe(
    Effect.orDie,
    Effect.map((metrics) => ({
      collectedAt: DateTime.fromDateUnsafe(snapshot.collectedAt),
      metrics,
    }))
  );

// A post on a platform Peal reads no counts on, which it stopped reading at
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

    // What the posts published in the range gained each day: the last
    // snapshot of each post in each day, less the one of its day before
    // (none before the first, as a post starts from nothing). Day 1 is the
    // range's first.
    const gains = Effect.fn("AnalyticsReports.gains")(function* gains(
      workspaceId: WorkspaceId,
      starts: readonly DateTime.Utc[],
      channelId: Option.Option<ChannelId>
    ) {
      const [first] = starts;
      const last = starts.at(-1);

      if (first === undefined || last === undefined) {
        return yield* Effect.die("A report covers at least one day");
      }

      const start = date(first);
      const end = date(last);
      const bounds = starts.map(date);
      const channel = Option.getOrNull(channelId);

      const rows: readonly DayGains[] = yield* client`
        WITH posts AS (
          SELECT target_id FROM analytics.tracked_posts
          WHERE workspace_id = ${workspaceId}
            AND published_at >= ${start}
            AND published_at < ${end}
            AND (${channel}::uuid IS NULL OR channel_id = ${channel}::uuid)
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

      return rows;
    });

    const counts = Effect.fn("AnalyticsReports.counts")(function* counts(
      asked: PostsAsked
    ) {
      const channel = Option.getOrNull(asked.channelId);

      const rows: readonly ChannelCounts[] = yield* client`
        SELECT
          channel_id AS "channelId",
          count(*)::int AS posts,
          coalesce(sum(likes), 0)::float8 AS likes,
          coalesce(sum(reposts), 0)::float8 AS reposts,
          coalesce(sum(replies), 0)::float8 AS replies,
          sum(quotes)::float8 AS quotes,
          sum(impressions)::float8 AS impressions,
          sum(clicks)::float8 AS clicks,
          sum(reach)::float8 AS reach,
          sum(saves)::float8 AS saves
        FROM analytics.tracked_posts
        WHERE workspace_id = ${asked.workspaceId}
          AND published_at >= ${date(asked.start)}
          AND published_at < ${date(asked.end)}
          AND end_reason IS DISTINCT FROM ${unreadable}
          AND (${channel}::uuid IS NULL OR channel_id = ${channel}::uuid)
        GROUP BY channel_id
        ORDER BY channel_id
      `.pipe(Effect.flatMap(decodeCounts), Effect.mapError(failed));

      return rows;
    });

    // Added up in bigint: one post's counts together can pass what an
    // integer holds.
    const engagement = sql`${trackedPosts.likes}::bigint + ${trackedPosts.reposts} + ${trackedPosts.replies} + coalesce(${trackedPosts.quotes}, 0)`;

    const top = Effect.fn("AnalyticsReports.top")(function* top(
      asked: PostsAsked,
      limit: number
    ) {
      if (limit === 0) {
        return [];
      }

      const rows = yield* db
        .select()
        .from(trackedPosts)
        .where(
          and(
            eq(trackedPosts.workspaceId, asked.workspaceId),
            gte(trackedPosts.publishedAt, date(asked.start)),
            lt(trackedPosts.publishedAt, date(asked.end)),
            isNotNull(trackedPosts.likes),
            asked.channelId.pipe(
              Option.map((channelId) => eq(trackedPosts.channelId, channelId)),
              Option.getOrUndefined
            )
          )
        )
        .orderBy(
          desc(engagement),
          desc(trackedPosts.publishedAt),
          asc(trackedPosts.targetId)
        )
        .limit(limit)
        .pipe(Effect.mapError(failed));

      return yield* Effect.all(rows.map(trackedPostOf));
    });

    const followed = Effect.fn("AnalyticsReports.channels")(function* followed(
      workspaceId: WorkspaceId
    ) {
      const rows = yield* client`
          SELECT channel_id AS "channelId", platform
          FROM analytics.tracked_channels
          WHERE workspace_id = ${workspaceId}
            AND gone_at IS NULL
          ORDER BY channel_id
        `.pipe(Effect.mapError(failed));

      return yield* decodeFollowed(rows).pipe(Effect.orDie);
    });

    const accountDays = Effect.fn("AnalyticsReports.accountDays")(
      function* accountDays(asked: AccountDaysAsked) {
        const channel = Option.getOrNull(asked.channelId);

        // The days of the span, and each channel's last day with followers
        // before it: where a change over the span starts.
        const rows = yield* client`
          SELECT ${client.unsafe(accountDayColumns)}
          FROM analytics.account_snapshots s
          JOIN analytics.tracked_channels c ON c.channel_id = s.channel_id
          WHERE c.workspace_id = ${asked.workspaceId}
            AND c.gone_at IS NULL
            AND (${channel}::uuid IS NULL OR c.channel_id = ${channel}::uuid)
            AND (
              (s.day >= ${asked.from}::date AND s.day <= ${asked.to}::date)
              OR s.day = (
                SELECT max(b.day) FROM analytics.account_snapshots b
                WHERE b.channel_id = s.channel_id
                  AND b.day < ${asked.from}::date
                  AND b.followers IS NOT NULL
              )
            )
          ORDER BY s.channel_id, s.day
        `.pipe(Effect.mapError(failed));

        return yield* decodeAccountDays(rows).pipe(Effect.orDie);
      }
    );

    const postsPage = Effect.fn("AnalyticsReports.postsPage")(
      function* postsPage(
        asked: PostsAsked,
        after: Option.Option<Pick<TrackedPost, "publishedAt" | "targetId">>,
        limit: number
      ) {
        const rows = yield* db
          .select({
            platform: trackedChannels.platform,
            post: trackedPosts,
          })
          .from(trackedPosts)
          .leftJoin(
            trackedChannels,
            eq(trackedChannels.channelId, trackedPosts.channelId)
          )
          .where(
            and(
              eq(trackedPosts.workspaceId, asked.workspaceId),
              gte(trackedPosts.publishedAt, date(asked.start)),
              lt(trackedPosts.publishedAt, date(asked.end)),
              readable,
              after.pipe(
                Option.map(
                  (last) =>
                    sql`(${trackedPosts.publishedAt}, ${trackedPosts.targetId}) > (${iso(last.publishedAt)}::timestamptz, ${last.targetId}::uuid)`
                ),
                Option.getOrUndefined
              )
            )
          )
          .orderBy(asc(trackedPosts.publishedAt), asc(trackedPosts.targetId))
          .limit(limit)
          .pipe(Effect.mapError(failed));

        return yield* Effect.all(
          rows.map(({ platform, post }) =>
            trackedPostOf(post).pipe(
              Effect.map((tracked): ExportedPost => ({
                platform: decodePlatform(platform),
                post: tracked,
              }))
            )
          )
        );
      }
    );

    const accountDaysPage = Effect.fn("AnalyticsReports.accountDaysPage")(
      function* accountDaysPage(
        asked: AccountDaysAsked,
        after: Option.Option<Pick<AccountDayRow, "channelId" | "day">>,
        limit: number
      ) {
        const last = Option.getOrNull(after);

        const rows = yield* client`
          SELECT ${client.unsafe(accountDayColumns)}
          FROM analytics.account_snapshots s
          JOIN analytics.tracked_channels c ON c.channel_id = s.channel_id
          WHERE c.workspace_id = ${asked.workspaceId}
            AND c.gone_at IS NULL
            AND s.day >= ${asked.from}::date
            AND s.day <= ${asked.to}::date
            AND (
              ${last?.channelId ?? null}::uuid IS NULL
              OR (s.channel_id, s.day) > (${last?.channelId ?? null}::uuid, ${last?.day ?? null}::date)
            )
          ORDER BY s.channel_id, s.day
          LIMIT ${limit}
        `.pipe(Effect.mapError(failed));

        return yield* decodeAccountDays(rows).pipe(Effect.orDie);
      }
    );

    const report = Effect.fn("AnalyticsReports.report")(function* report(
      workspaceId: WorkspaceId,
      starts: readonly DateTime.Utc[],
      limit: number
    ) {
      const [first] = starts;
      const last = starts.at(-1);

      if (first === undefined || last === undefined) {
        return yield* Effect.die("A report covers at least one day");
      }

      const start = date(first);
      const end = date(last);

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

      const days = yield* gains(workspaceId, starts, Option.none());

      const topRows = yield* top(
        { channelId: Option.none(), end: last, start: first, workspaceId },
        limit
      );

      const found: ReportRows = {
        channels,
        days,
        top: topRows,
      };

      return found;
    });

    return AnalyticsReports.of({
      accountDays,
      accountDaysPage,
      channels: followed,
      counts,
      gains,
      history,
      postsPage,
      report,
      top,
    });
  })
);
