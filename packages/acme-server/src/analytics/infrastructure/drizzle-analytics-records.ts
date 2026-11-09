import { asc, eq, inArray } from "drizzle-orm";
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

        const snapshots =
          posts.length === 0
            ? []
            : yield* db
                .select()
                .from(metricSnapshots)
                .where(
                  inArray(
                    metricSnapshots.targetId,
                    posts.map(({ targetId }) => targetId)
                  )
                )
                .orderBy(asc(metricSnapshots.collectedAt))
                .pipe(Effect.mapError(failed));

        return posts.map((post): AnalyticsRecord => ({
          ...post,
          publishedAt: utc(post.publishedAt),
          snapshots: snapshots.flatMap(
            (snapshot): readonly MetricsSnapshotRecord[] =>
              snapshot.targetId === post.targetId
                ? [
                    {
                      collectedAt: utc(snapshot.collectedAt),
                      impressions: snapshot.impressions,
                      likes: snapshot.likes,
                      quotes: snapshot.quotes,
                      replies: snapshot.replies,
                      reposts: snapshot.reposts,
                    },
                  ]
                : []
          ),
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
