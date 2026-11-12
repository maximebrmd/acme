import { DateTime, Effect, Layer, Schema } from "effect";
import { SqlClient } from "effect/sql";

import { AnalyticsAcrossReads } from "#analytics/application/analytics-across-reads.ts";
import { UtcDaySchema } from "#analytics/domain/account-metrics.ts";
import type { CollectionEnd } from "#analytics/domain/tracked-post.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { ChannelIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { PlatformSchema } from "#shared/domain/platform.ts";

const failed = (cause: unknown) => new DatabaseError({ cause });

// A post on a platform Peal reads no counts on, as the dashboard leaves it
// out (`SqlAnalyticsReports`).
const unreadable: CollectionEnd = "unsupported";

// Every workspace's id in one text parameter, split in the database, as
// `anyUuid` writes it for Drizzle: a statement takes 65,535 parameters at
// most.
const idsOf = (workspaceIds: readonly WorkspaceId[]) => workspaceIds.join(",");

const optionalSum = Schema.OptionFromNullOr(Schema.Number);

const optionalCount = Schema.OptionFromNullOr(Schema.Int);

const decodeCounts = Schema.decodeUnknownEffect(
  Schema.Array(
    Schema.Struct({
      channelId: ChannelIdSchema,
      clicks: optionalSum,
      impressions: optionalSum,
      likes: Schema.Number,
      posts: Schema.Int,
      quotes: optionalSum,
      reach: optionalSum,
      replies: Schema.Number,
      reposts: Schema.Number,
      saves: optionalSum,
      workspaceId: WorkspaceIdSchema,
    })
  )
);

const decodeFollowed = Schema.decodeUnknownEffect(
  Schema.Array(
    Schema.Struct({
      channelId: ChannelIdSchema,
      platform: PlatformSchema,
      workspaceId: WorkspaceIdSchema,
    })
  )
);

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
      workspaceId: WorkspaceIdSchema,
    })
  )
);

/**
 * The report across workspaces' reads, in Postgres: the dashboard's
 * queries, with `workspace_id = ANY(…)` for one workspace's id, on the same
 * indexes (`tracked_posts_workspace_published`, `tracked_channels_workspace`
 * and the account snapshots' key).
 */
export const SqlAnalyticsAcrossReads = Layer.effect(
  AnalyticsAcrossReads,
  Effect.gen(function* SqlAnalyticsAcrossReads() {
    const client = yield* SqlClient.SqlClient;

    return AnalyticsAcrossReads.of({
      accountDays: (workspaceIds, from, to) =>
        client`
          SELECT
            c.workspace_id AS "workspaceId",
            s.channel_id AS "channelId", s.day::text AS day, c.platform,
            s.followers, s.following, s.posts, s.reach, s.views
          FROM analytics.account_snapshots s
          JOIN analytics.tracked_channels c ON c.channel_id = s.channel_id
          WHERE c.workspace_id = ANY(string_to_array(${idsOf(workspaceIds)}, ',')::uuid[])
            AND c.gone_at IS NULL
            AND (
              (s.day >= ${from}::date AND s.day <= ${to}::date)
              OR s.day = (
                SELECT max(b.day) FROM analytics.account_snapshots b
                WHERE b.channel_id = s.channel_id
                  AND b.day < ${from}::date
                  AND b.followers IS NOT NULL
              )
            )
          ORDER BY c.workspace_id, s.channel_id, s.day
        `.pipe(
          Effect.mapError(failed),
          Effect.flatMap((rows) => decodeAccountDays(rows).pipe(Effect.orDie)),
          Effect.withSpan("AnalyticsAcrossReads.accountDays")
        ),
      channels: (workspaceIds) =>
        client`
          SELECT workspace_id AS "workspaceId", channel_id AS "channelId", platform
          FROM analytics.tracked_channels
          WHERE workspace_id = ANY(string_to_array(${idsOf(workspaceIds)}, ',')::uuid[])
            AND gone_at IS NULL
          ORDER BY workspace_id, channel_id
        `.pipe(
          Effect.mapError(failed),
          Effect.flatMap((rows) => decodeFollowed(rows).pipe(Effect.orDie)),
          Effect.withSpan("AnalyticsAcrossReads.channels")
        ),
      counts: (workspaceIds, start, end) =>
        client`
          SELECT
            workspace_id AS "workspaceId",
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
          WHERE workspace_id = ANY(string_to_array(${idsOf(workspaceIds)}, ',')::uuid[])
            AND published_at >= ${DateTime.toDateUtc(start)}
            AND published_at < ${DateTime.toDateUtc(end)}
            AND end_reason IS DISTINCT FROM ${unreadable}
          GROUP BY workspace_id, channel_id
          ORDER BY workspace_id, channel_id
        `.pipe(
          Effect.mapError(failed),
          Effect.flatMap((rows) => decodeCounts(rows).pipe(Effect.orDie)),
          Effect.withSpan("AnalyticsAcrossReads.counts")
        ),
    });
  })
);
