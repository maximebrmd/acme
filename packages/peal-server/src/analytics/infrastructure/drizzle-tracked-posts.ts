import {
  and,
  asc,
  count,
  desc,
  getColumns,
  inArray,
  isNotNull,
  lte,
  sql as drizzleSql,
} from "drizzle-orm";
import { DateTime, Effect, Layer, Option, Schema } from "effect";
import { SqlClient } from "effect/sql";

import { TrackedPosts } from "#analytics/application/tracked-posts.ts";
import type {
  DueChannel,
  LatestPublication,
} from "#analytics/application/tracked-posts.ts";
import { TrackedPost } from "#analytics/domain/tracked-post.ts";
import type { Collection } from "#analytics/domain/tracked-post.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { ChannelIdSchema, PostTargetIdSchema } from "#shared/domain/ids.ts";
import type { ChannelId } from "#shared/domain/ids.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { erasedWorkspaces, trackedPosts } from "./schema.ts";
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
            clicks: row.clicks,
            impressions: row.impressions,
            likes: row.likes,
            quotes: row.quotes,
            reach: row.reach,
            replies: row.replies,
            reposts: row.reposts,
            saves: row.saves,
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
      clicks: null,
      impressions: null,
      likes: null,
      quotes: null,
      reach: null,
      replies: null,
      reposts: null,
      saves: null,
    }),
    onSome: (metrics) => ({
      clicks: Option.getOrNull(metrics.clicks),
      impressions: Option.getOrNull(metrics.impressions),
      likes: metrics.likes,
      quotes: Option.getOrNull(metrics.quotes),
      reach: Option.getOrNull(metrics.reach),
      replies: metrics.replies,
      reposts: metrics.reposts,
      saves: Option.getOrNull(metrics.saves),
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

const decodeDueChannels = Schema.decodeUnknownEffect(
  Schema.Array(
    Schema.Struct({
      channelId: ChannelIdSchema,
      dueSince: Schema.DateTimeUtcFromDate,
    })
  )
);

const decodeLatest = Schema.decodeUnknownEffect(
  Schema.Struct({
    publishedAt: Schema.DateTimeUtcFromDate,
    targetId: PostTargetIdSchema,
  })
);

// The posts' schedules as one JSON document, which Postgres reads as
// rows: one statement and one parameter, however many posts.
const schedulesOf = (posts: readonly TrackedPost[]) =>
  JSON.stringify(
    posts.map((post) => {
      const schedule = scheduleColumns(post.collection);

      return {
        end_reason: schedule.endReason,
        ended_at: schedule.endedAt,
        next_collection_at: schedule.nextCollectionAt,
        target_id: post.targetId,
      };
    })
  );

// The posts with their readings, as one JSON document too.
const readingsOf = (posts: readonly TrackedPost[]) =>
  Effect.forEach(
    posts,
    (post) => {
      const reading = Option.all({
        collectedAt: post.lastCollectedAt,
        latest: post.latest,
      });

      if (Option.isNone(reading)) {
        return Effect.die("A reading is saved with its counts");
      }

      const { collectedAt, latest } = reading.value;
      const schedule = scheduleColumns(post.collection);

      return Effect.succeed({
        clicks: Option.getOrNull(latest.clicks),
        collected_at: date(collectedAt),
        end_reason: schedule.endReason,
        ended_at: schedule.endedAt,
        impressions: Option.getOrNull(latest.impressions),
        likes: latest.likes,
        next_collection_at: schedule.nextCollectionAt,
        quotes: Option.getOrNull(latest.quotes),
        reach: Option.getOrNull(latest.reach),
        replies: latest.replies,
        reposts: latest.reposts,
        saves: Option.getOrNull(latest.saves),
        target_id: post.targetId,
      });
    },
    { concurrency: 1 }
  ).pipe(Effect.map((rows) => JSON.stringify(rows)));

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

    const dueChannels = Effect.fn("TrackedPosts.dueChannels")(
      function* dueChannels(
        at: DateTime.Utc,
        limit: number,
        after: Option.Option<DueChannel>
      ) {
        const dueSince = drizzleSql<Date>`min(${trackedPosts.nextCollectionAt})`;

        const rows = yield* db
          .select({ channelId: trackedPosts.channelId, dueSince })
          .from(trackedPosts)
          .where(
            and(
              isNotNull(trackedPosts.nextCollectionAt),
              lte(trackedPosts.nextCollectionAt, date(at))
            )
          )
          .groupBy(trackedPosts.channelId)
          .having(
            after.pipe(
              Option.map(
                (last) =>
                  drizzleSql`(${dueSince}, ${trackedPosts.channelId}) > (${DateTime.formatIso(last.dueSince)}::timestamptz, ${last.channelId}::uuid)`
              ),
              Option.getOrUndefined
            )
          )
          .orderBy(asc(dueSince), asc(trackedPosts.channelId))
          .limit(limit)
          .pipe(Effect.mapError(failed));

        return yield* decodeDueChannels(rows).pipe(Effect.orDie);
      }
    );

    const dueOn = Effect.fn("TrackedPosts.dueOn")(function* dueOn(
      at: DateTime.Utc,
      channelIds: readonly ChannelId[],
      perChannel: number
    ) {
      if (channelIds.length === 0) {
        return [];
      }

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
            lte(trackedPosts.nextCollectionAt, date(at)),
            // One array parameter, however many channels.
            drizzleSql`${trackedPosts.channelId} = ANY(string_to_array(${channelIds.join(",")}, ',')::uuid[])`
          )
        )
        .as("ranked");

      return yield* db
        .select()
        .from(ranked)
        .where(lte(ranked.turn, perChannel))
        .orderBy(
          asc(ranked.channelId),
          asc(ranked.nextCollectionAt),
          asc(ranked.targetId)
        )
        .pipe(
          Effect.mapError(failed),
          Effect.flatMap(Effect.forEach(trackedPostOf))
        );
    });

    const countDue = Effect.fn("TrackedPosts.countDue")(function* countDue(
      at: DateTime.Utc
    ) {
      const [row] = yield* db
        .select({ due: count() })
        .from(trackedPosts)
        .where(
          and(
            isNotNull(trackedPosts.nextCollectionAt),
            lte(trackedPosts.nextCollectionAt, date(at))
          )
        )
        .pipe(Effect.mapError(failed));

      return row?.due ?? 0;
    });

    const saveSchedules = Effect.fn("TrackedPosts.saveSchedules")(
      function* saveSchedules(posts: readonly TrackedPost[]) {
        if (posts.length === 0) {
          return;
        }

        yield* sql`
          UPDATE analytics.tracked_posts AS post
          SET next_collection_at = saved.next_collection_at,
              ended_at = saved.ended_at,
              end_reason = saved.end_reason
          FROM jsonb_to_recordset(${schedulesOf(posts)}::jsonb) AS saved(
            target_id uuid,
            next_collection_at timestamptz,
            ended_at timestamptz,
            end_reason text
          )
          WHERE post.target_id = saved.target_id
        `.pipe(Effect.mapError(failed));
      }
    );

    const saveReadings = Effect.fn("TrackedPosts.saveReadings")(
      function* saveReadings(posts: readonly TrackedPost[]) {
        if (posts.length === 0) {
          return;
        }

        const readings = yield* readingsOf(posts);

        // One statement: the posts first, under their row locks, then a
        // snapshot for each post that was still there, so one erased with
        // its workspace while it was read keeps none.
        yield* sql`
          WITH reading AS (
            SELECT * FROM jsonb_to_recordset(${readings}::jsonb) AS saved(
              target_id uuid,
              collected_at timestamptz,
              next_collection_at timestamptz,
              ended_at timestamptz,
              end_reason text,
              likes integer,
              reposts integer,
              replies integer,
              quotes integer,
              impressions integer,
              clicks integer,
              reach integer,
              saves integer
            )
          ), saved AS (
            UPDATE analytics.tracked_posts AS post
            SET next_collection_at = reading.next_collection_at,
                ended_at = reading.ended_at,
                end_reason = reading.end_reason,
                last_collected_at = reading.collected_at,
                likes = reading.likes,
                reposts = reading.reposts,
                replies = reading.replies,
                quotes = reading.quotes,
                impressions = reading.impressions,
                clicks = reading.clicks,
                reach = reading.reach,
                saves = reading.saves
            FROM reading
            WHERE post.target_id = reading.target_id
            RETURNING post.target_id
          )
          INSERT INTO analytics.metric_snapshots
            (target_id, collected_at, likes, reposts, replies, quotes,
             impressions, clicks, reach, saves)
          SELECT reading.target_id, reading.collected_at, reading.likes,
                 reading.reposts, reading.replies, reading.quotes,
                 reading.impressions, reading.clicks, reading.reach,
                 reading.saves
          FROM reading
          JOIN saved ON saved.target_id = reading.target_id
          ON CONFLICT DO NOTHING
        `.pipe(Effect.mapError(failed));
      }
    );

    return TrackedPosts.of({
      countDue,
      dueChannels,
      dueOn,
      latestPublication,
      saveReading: (post) => saveReadings([post]),
      saveReadings,
      saveSchedule: (post) => saveSchedules([post]),
      saveSchedules,
      track,
    });
  })
);
