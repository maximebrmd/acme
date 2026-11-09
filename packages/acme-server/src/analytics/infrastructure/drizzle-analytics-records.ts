import { asc, eq } from "drizzle-orm";
import { DateTime, Effect, Layer } from "effect";

import { AnalyticsRecords } from "#analytics/application/analytics-records.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import type {
  AnalyticsRecord,
  MetricsSnapshotRecord,
} from "#shared/application/personal-data.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { metricSnapshots, trackedPosts } from "./schema.ts";

const failed = (cause: unknown) => new DatabaseError({ cause });

const utc = (date: Date) => DateTime.fromDateUnsafe(date);

/**
 * AnalyticsRecords on the analytics schema. Deleting a post followed
 * deletes its snapshots, which reference it with ON DELETE CASCADE.
 */
export const DrizzleAnalyticsRecords = Layer.effect(
  AnalyticsRecords,
  Effect.gen(function* DrizzleAnalyticsRecords() {
    const db = yield* Drizzle;

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
            collectedAt: metricSnapshots.collectedAt,
            impressions: metricSnapshots.impressions,
            likes: metricSnapshots.likes,
            quotes: metricSnapshots.quotes,
            replies: metricSnapshots.replies,
            reposts: metricSnapshots.reposts,
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
        yield* db
          .delete(trackedPosts)
          .where(eq(trackedPosts.workspaceId, workspaceId))
          .pipe(Effect.mapError(failed));
      }
    );

    return AnalyticsRecords.of({ eraseWorkspace, exportWorkspace });
  })
);
