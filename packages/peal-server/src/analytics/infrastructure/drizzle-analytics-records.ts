import { asc, eq } from "drizzle-orm";
import { DateTime, Effect, Layer } from "effect";
import { Digest } from "effect/crypto";
import { SqlClient } from "effect/sql";

import { AnalyticsRecords } from "#analytics/application/analytics-records.ts";
import type { FollowedAccount } from "#analytics/application/analytics-records.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import type {
  AccountSnapshotRecord,
  AnalyticsRecord,
  MetricsSnapshotRecord,
} from "#shared/application/personal-data.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import {
  erasedWorkspaces,
  metricSnapshots,
  accountSnapshots,
  paidReads,
  trackedChannels,
  trackedPosts,
} from "./schema.ts";
import { shareTrackingLock } from "./tracking-lock.ts";

const failed = (cause: unknown) => new DatabaseError({ cause });

const encoder = new TextEncoder();

const utc = (date: Date) => DateTime.fromDateUnsafe(date);

/**
 * AnalyticsRecords on the analytics schema. Deleting a post followed
 * deletes its snapshots, which reference it with ON DELETE CASCADE. An
 * erased workspace is recorded first, under the tracking lock, so posts of
 * it a collection run listed before are never followed after.
 */
export const DrizzleAnalyticsRecords = Layer.effect(
  AnalyticsRecords,
  Effect.gen(function* DrizzleAnalyticsRecords() {
    const db = yield* Drizzle;
    const sql = yield* SqlClient.SqlClient;
    const digest = yield* Digest.Digest;

    const exportWorkspace = Effect.fn("AnalyticsRecords.exportWorkspace")(
      function* exportWorkspace(workspaceId: string) {
        const posts = yield* db
          .select({
            channelId: trackedPosts.channelId,
            permalink: trackedPosts.permalink,
            postId: trackedPosts.postId,
            publishedAt: trackedPosts.publishedAt,
            targetId: trackedPosts.targetId,
          })
          .from(trackedPosts)
          .where(eq(trackedPosts.workspaceId, workspaceId))
          .orderBy(asc(trackedPosts.publishedAt), asc(trackedPosts.targetId))
          .pipe(Effect.mapError(failed));

        // Every snapshot of the workspace's posts, through the posts: a
        // list of their ids would pass the parameters one query takes.
        const snapshots = yield* db
          .select({
            clicks: metricSnapshots.clicks,
            collectedAt: metricSnapshots.collectedAt,
            impressions: metricSnapshots.impressions,
            likes: metricSnapshots.likes,
            quotes: metricSnapshots.quotes,
            reach: metricSnapshots.reach,
            replies: metricSnapshots.replies,
            reposts: metricSnapshots.reposts,
            saves: metricSnapshots.saves,
            targetId: metricSnapshots.targetId,
          })
          .from(metricSnapshots)
          .innerJoin(
            trackedPosts,
            eq(trackedPosts.targetId, metricSnapshots.targetId)
          )
          .where(eq(trackedPosts.workspaceId, workspaceId))
          .orderBy(
            asc(metricSnapshots.targetId),
            asc(metricSnapshots.collectedAt)
          )
          .pipe(Effect.mapError(failed));

        const byTarget = new Map<string, MetricsSnapshotRecord[]>();

        for (const { collectedAt, targetId, ...counts } of snapshots) {
          const record: MetricsSnapshotRecord = {
            ...counts,
            collectedAt: utc(collectedAt),
          };

          const kept = byTarget.get(targetId);

          if (kept === undefined) {
            byTarget.set(targetId, [record]);
          } else {
            kept.push(record);
          }
        }

        return posts.map((post): AnalyticsRecord => ({
          ...post,
          publishedAt: utc(post.publishedAt),
          snapshots: byTarget.get(post.targetId) ?? [],
        }));
      }
    );

    const eraseWorkspace = Effect.fn("AnalyticsRecords.eraseWorkspace")(
      function* eraseWorkspace(workspaceId: string) {
        const now = yield* DateTime.now;

        // In the caller's transaction, whose end releases the lock.
        yield* sql
          .withTransaction(
            Effect.gen(function* erasing() {
              yield* shareTrackingLock(sql);

              yield* db
                .insert(erasedWorkspaces)
                .values({ erasedAt: DateTime.toDateUtc(now), workspaceId })
                .onConflictDoNothing();

              yield* db
                .delete(trackedPosts)
                .where(eq(trackedPosts.workspaceId, workspaceId));

              yield* db
                .delete(trackedChannels)
                .where(eq(trackedChannels.workspaceId, workspaceId));

              yield* db
                .delete(paidReads)
                .where(eq(paidReads.workspaceId, workspaceId));
            })
          )
          .pipe(Effect.mapError(failed));
      }
    );

    const exportAccounts = Effect.fn("AnalyticsRecords.exportAccounts")(
      function* exportAccounts(workspaceId: string) {
        const days = yield* db
          .select({
            channelId: accountSnapshots.channelId,
            day: accountSnapshots.day,
            followers: accountSnapshots.followers,
            following: accountSnapshots.following,
            platform: trackedChannels.platform,
            posts: accountSnapshots.posts,
            reach: accountSnapshots.reach,
            views: accountSnapshots.views,
          })
          .from(accountSnapshots)
          .innerJoin(
            trackedChannels,
            eq(trackedChannels.channelId, accountSnapshots.channelId)
          )
          .where(eq(trackedChannels.workspaceId, workspaceId))
          .orderBy(asc(accountSnapshots.channelId), asc(accountSnapshots.day))
          .pipe(Effect.mapError(failed));

        const records: readonly AccountSnapshotRecord[] = days;

        return records;
      }
    );

    // What names an account while its channel is gone: a digest, never
    // the account's id.
    const accountRefOf = (channel: FollowedAccount) =>
      digest.digestHex(
        Digest.sha256,
        encoder.encode(`${channel.platform}:${channel.accountId}`)
      );

    const channelGone = Effect.fn("AnalyticsRecords.channelGone")(
      function* channelGone(
        channel: FollowedAccount,
        how: { readonly at: DateTime.Utc; readonly erase: boolean }
      ) {
        if (how.erase) {
          yield* sql`
            DELETE FROM analytics.tracked_posts
            WHERE channel_id = ${channel.channelId}
          `;
          yield* sql`
            DELETE FROM analytics.tracked_channels
            WHERE channel_id = ${channel.channelId}
          `;

          return;
        }

        const at = DateTime.formatIso(how.at);
        const accountRef = yield* accountRefOf(channel);

        // A row even for a channel never followed: its posts are then
        // purged with it, and by its platform's own cap meanwhile.
        yield* sql`
          INSERT INTO analytics.tracked_channels
            (channel_id, workspace_id, platform, next_collection_at, gone_at, account_ref)
          VALUES (${channel.channelId}, ${channel.workspaceId}, ${channel.platform},
                  ${at}::timestamptz, ${at}::timestamptz, ${accountRef})
          ON CONFLICT (channel_id) DO UPDATE
          SET gone_at = coalesce(analytics.tracked_channels.gone_at, excluded.gone_at),
              account_ref = excluded.account_ref
        `;
      }
    );

    const channelBack = Effect.fn("AnalyticsRecords.channelBack")(
      function* channelBack(channel: FollowedAccount, at: DateTime.Utc) {
        const accountRef = yield* accountRefOf(channel);

        // The channel of this account that left the workspace last.
        const [gone] = yield* sql<{ readonly channelId: string }>`
          SELECT channel_id AS "channelId"
          FROM analytics.tracked_channels
          WHERE workspace_id = ${channel.workspaceId}
            AND platform = ${channel.platform}
            AND account_ref = ${accountRef}
            AND gone_at IS NOT NULL
            AND channel_id <> ${channel.channelId}
          ORDER BY gone_at DESC
          LIMIT 1
          FOR UPDATE
        `;

        if (gone === undefined) {
          return;
        }

        // The new channel takes over the row's schedule, days and posts;
        // the old row goes. A row the collection made for the new channel
        // meanwhile keeps its own schedule.
        yield* sql`
          INSERT INTO analytics.tracked_channels
            (channel_id, workspace_id, platform, next_collection_at, last_collected_at)
          SELECT ${channel.channelId}, workspace_id, platform, ${DateTime.formatIso(at)}::timestamptz, last_collected_at
          FROM analytics.tracked_channels WHERE channel_id = ${gone.channelId}
          ON CONFLICT (channel_id) DO NOTHING
        `;
        yield* sql`
          UPDATE analytics.account_snapshots AS day
          SET channel_id = ${channel.channelId}
          WHERE day.channel_id = ${gone.channelId}
            AND NOT EXISTS (
              SELECT 1 FROM analytics.account_snapshots taken
              WHERE taken.channel_id = ${channel.channelId} AND taken.day = day.day
            )
        `;
        yield* sql`
          UPDATE analytics.tracked_posts
          SET channel_id = ${channel.channelId}
          WHERE channel_id = ${gone.channelId}
        `;
        yield* sql`
          DELETE FROM analytics.tracked_channels
          WHERE channel_id = ${gone.channelId}
        `;
      }
    );

    return AnalyticsRecords.of({
      channelBack: (channel, at) =>
        sql
          .withTransaction(channelBack(channel, at))
          .pipe(Effect.mapError(failed)),
      channelGone: (channel, how) =>
        sql
          .withTransaction(channelGone(channel, how))
          .pipe(Effect.mapError(failed)),
      eraseWorkspace,
      exportAccounts,
      exportWorkspace,
    });
  })
).pipe(Layer.provide(Digest.layerWebCrypto));
