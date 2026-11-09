import {
  and,
  asc,
  desc,
  eq,
  getColumns,
  inArray,
  isNotNull,
  lte,
  sql as drizzleSql,
} from "drizzle-orm";
import { DateTime, Effect, Layer, Option, Schema } from "effect";
import { SqlClient } from "effect/sql";

import { TrackedPosts } from "#analytics/application/tracked-posts.ts";
import type { LatestPublication } from "#analytics/application/tracked-posts.ts";
import { TrackedPost } from "#analytics/domain/tracked-post.ts";
import type { Collection } from "#analytics/domain/tracked-post.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { PostTargetIdSchema } from "#shared/domain/ids.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { erasedWorkspaces, metricSnapshots, trackedPosts } from "./schema.ts";
import { holdTrackingLock } from "./tracking-lock.ts";

export type TrackedRow = typeof trackedPosts.$inferSelect;

// Rows are decoded with the domain's schema, so a row it could not have
// written fails loudly instead of being trusted.
const decodePost = Schema.decodeUnknownEffect(TrackedPost);

const utc = (date: Date | null) =>
  date === null ? undefined : DateTime.fromDateUnsafe(date);

const date = (instant: DateTime.Utc) => DateTime.toDateUtc(instant);

const collectionOf = (row: TrackedRow) =>
  row.nextCollectionAt === null
    ? { _tag: "ended", at: utc(row.endedAt), reason: row.endReason }
    : { _tag: "collecting", nextAt: utc(row.nextCollectionAt) };

/** The post a row holds, as the domain has it. */
export const trackedPostOf = (row: TrackedRow) =>
  decodePost({
    channelId: row.channelId,
    collection: collectionOf(row),
    lastCollectedAt: Option.fromUndefinedOr(utc(row.lastCollectedAt)),
    latest:
      row.likes === null
        ? Option.none()
        : Option.some({
            impressions: row.impressions,
            likes: row.likes,
            quotes: row.quotes,
            replies: row.replies,
            reposts: row.reposts,
          }),
    permalink: Option.fromNullOr(row.permalink),
    platformPostId: row.platformPostId,
    postId: row.postId,
    publishedAt: utc(row.publishedAt),
    targetId: row.targetId,
    workspaceId: row.workspaceId,
  }).pipe(Effect.orDie);

const scheduleColumns = (collection: Collection) =>
  collection._tag === "collecting"
    ? {
        endReason: null,
        endedAt: null,
        nextCollectionAt: date(collection.nextAt),
      }
    : {
        endReason: collection.reason,
        endedAt: date(collection.at),
        nextCollectionAt: null,
      };

const latestColumns = (post: TrackedPost) =>
  Option.match(post.latest, {
    onNone: () => ({
      impressions: null,
      likes: null,
      quotes: null,
      replies: null,
      reposts: null,
    }),
    onSome: (metrics) => ({
      impressions: Option.getOrNull(metrics.impressions),
      likes: metrics.likes,
      quotes: Option.getOrNull(metrics.quotes),
      replies: metrics.replies,
      reposts: metrics.reposts,
    }),
  });

const rowOf = (post: TrackedPost) => ({
  ...scheduleColumns(post.collection),
  ...latestColumns(post),
  channelId: post.channelId,
  lastCollectedAt: post.lastCollectedAt.pipe(
    Option.map(date),
    Option.getOrNull
  ),
  permalink: Option.getOrNull(post.permalink),
  platformPostId: post.platformPostId,
  postId: post.postId,
  publishedAt: date(post.publishedAt),
  targetId: post.targetId,
  workspaceId: post.workspaceId,
});

const failed = (cause: unknown) => new DatabaseError({ cause });

const decodeLatest = Schema.decodeUnknownEffect(
  Schema.Struct({
    publishedAt: Schema.DateTimeUtcFromDate,
    targetId: PostTargetIdSchema,
  })
);

/** The posts analytics follows, in the analytics schema, through Drizzle. */
export const DrizzleTrackedPosts = Layer.effect(
  TrackedPosts,
  Effect.gen(function* DrizzleTrackedPosts() {
    const db = yield* Drizzle;
    const sql = yield* SqlClient.SqlClient;

    const latestPublication = Effect.fn("TrackedPosts.latestPublication")(
      function* latestPublication(before: DateTime.Utc) {
        const [row] = yield* db
          .select({
            publishedAt: trackedPosts.publishedAt,
            targetId: trackedPosts.targetId,
          })
          .from(trackedPosts)
          .where(lte(trackedPosts.publishedAt, date(before)))
          .orderBy(desc(trackedPosts.publishedAt), desc(trackedPosts.targetId))
          .limit(1)
          .pipe(Effect.mapError(failed));

        if (row === undefined) {
          return Option.none<LatestPublication>();
        }

        const latest: LatestPublication = yield* decodeLatest(row).pipe(
          Effect.orDie
        );

        return Option.some(latest);
      }
    );

    // Under the tracking lock, which no erasure in progress holds then: a
    // workspace erased since its posts were listed is passed over.
    const trackLocked = Effect.fn("TrackedPosts.trackLocked")(
      function* trackLocked(posts: readonly TrackedPost[]) {
        yield* holdTrackingLock(sql);

        const erased = yield* db
          .select({ workspaceId: erasedWorkspaces.workspaceId })
          .from(erasedWorkspaces)
          .where(
            inArray(erasedWorkspaces.workspaceId, [
              ...new Set(posts.map(({ workspaceId }) => workspaceId)),
            ])
          );

        const gone = new Set(erased.map(({ workspaceId }) => workspaceId));
        const kept = posts.filter(({ workspaceId }) => !gone.has(workspaceId));

        if (kept.length === 0) {
          return 0;
        }

        const inserted = yield* db
          .insert(trackedPosts)
          .values(kept.map(rowOf))
          .onConflictDoNothing()
          .returning({ targetId: trackedPosts.targetId });

        return inserted.length;
      }
    );

    const track = Effect.fn("TrackedPosts.track")(function* track(
      posts: readonly TrackedPost[]
    ) {
      if (posts.length === 0) {
        return 0;
      }

      return yield* sql
        .withTransaction(trackLocked(posts))
        .pipe(Effect.mapError(failed));
    });

    const due = Effect.fn("TrackedPosts.due")(function* due(
      at: DateTime.Utc,
      limit: number
    ) {
      // Each channel's due posts, numbered in the order they came due.
      const ranked = db
        .select({
          ...getColumns(trackedPosts),
          turn: drizzleSql<number>`row_number() OVER (PARTITION BY ${trackedPosts.channelId} ORDER BY ${trackedPosts.nextCollectionAt}, ${trackedPosts.targetId})`.as(
            "turn"
          ),
        })
        .from(trackedPosts)
        .where(
          and(
            isNotNull(trackedPosts.nextCollectionAt),
            lte(trackedPosts.nextCollectionAt, date(at))
          )
        )
        .as("ranked");

      const rows = yield* db
        .select()
        .from(ranked)
        .orderBy(
          asc(ranked.turn),
          asc(ranked.nextCollectionAt),
          asc(ranked.targetId)
        )
        .limit(limit)
        .pipe(
          Effect.mapError(failed),
          Effect.flatMap(Effect.forEach(trackedPostOf))
        );

      return rows;
    });

    const update = (post: TrackedPost) =>
      db
        .update(trackedPosts)
        .set(rowOf(post))
        .where(eq(trackedPosts.targetId, post.targetId))
        .returning({ targetId: trackedPosts.targetId });

    const saveReading = Effect.fn("TrackedPosts.saveReading")(
      function* saveReading(post: TrackedPost) {
        const reading = Option.all({
          collectedAt: post.lastCollectedAt,
          latest: post.latest,
        });

        if (Option.isNone(reading)) {
          return yield* Effect.die("A reading is saved with its counts");
        }

        const { collectedAt, latest } = reading.value;

        return yield* sql
          .withTransaction(
            Effect.gen(function* saving() {
              // The post first, under its row lock: one erased with its
              // workspace while it was read keeps no snapshot.
              const saved = yield* update(post);

              if (saved.length === 0) {
                return;
              }

              yield* db
                .insert(metricSnapshots)
                .values({
                  collectedAt: date(collectedAt),
                  impressions: Option.getOrNull(latest.impressions),
                  likes: latest.likes,
                  quotes: Option.getOrNull(latest.quotes),
                  replies: latest.replies,
                  reposts: latest.reposts,
                  targetId: post.targetId,
                })
                .onConflictDoNothing();
            })
          )
          .pipe(Effect.mapError(failed));
      }
    );

    const saveSchedule = Effect.fn("TrackedPosts.saveSchedule")(
      function* saveSchedule(post: TrackedPost) {
        yield* db
          .update(trackedPosts)
          .set(scheduleColumns(post.collection))
          .where(eq(trackedPosts.targetId, post.targetId))
          .pipe(Effect.mapError(failed));
      }
    );

    return TrackedPosts.of({
      due,
      latestPublication,
      saveReading,
      saveSchedule,
      track,
    });
  })
);
