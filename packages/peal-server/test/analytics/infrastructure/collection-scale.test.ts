import { assert, layer } from "@effect/vitest";
import { DateTime, Duration, Effect, Layer, Metric, Schema } from "effect";
import { SqlClient } from "effect/sql";

import {
  collectionLeft,
  CollectionPaceRef,
  CollectMetrics,
} from "#analytics/application/collect-metrics.ts";
import { DrizzleTrackedPosts } from "#analytics/infrastructure/drizzle-tracked-posts.ts";
import { Ids } from "#shared/application/ids.ts";
import { PublishedPostsTest } from "#test/analytics/publications.ts";
import {
  readerAnswering,
  ReadLog,
  ReadLogTest,
} from "#test/analytics/read-log.ts";
import { countsOf, forgetWorkspace } from "#test/analytics/support.ts";
import { DatabaseTest, freshWorkspace } from "#test/channels/support.ts";

// The hourly collection on Postgres, with readers that answer at once:
// what the store and the run cost, platforms left out.

// On the real clock: the database pool's timers would replay every second
// of a virtual one set decades back. The run is scheduled at an instant no
// other suite uses, long ago, so its budget reaches to today.
const CollectionTest = CollectMetrics.layer.pipe(
  Layer.provide(
    Layer.succeed(CollectionPaceRef, {
      budget: Duration.days(36_500),
      channelConcurrency: 16,
      channelsPerPage: 500,
    })
  ),
  Layer.provideMerge(
    Layer.mergeAll(
      DrizzleTrackedPosts,
      PublishedPostsTest,
      readerAnswering((request) =>
        Effect.succeed({
          halted: false,
          readings: request.posts.map(({ targetId }) => ({
            _tag: "counted" as const,
            metrics: countsOf(3, 1, 0),
            targetId,
          })),
        })
      )
    )
  ),
  Layer.provideMerge(Layer.mergeAll(ReadLogTest, Ids.layerTest)),
  Layer.provideMerge(DatabaseTest)
);

const channels = 4000;

const postsPerChannel = 5;

// A run of the collection at an instant no other suite uses, so only these
// posts are due.
const at = DateTime.makeUnsafe("1985-01-01T11:07:00.000Z");

const decodeCount = Schema.decodeUnknownEffect(
  Schema.Tuple([Schema.Struct({ rows: Schema.Number })])
);

layer(CollectionTest, { excludeTestServices: true })(
  "the collection on Postgres, at scale",
  (it) => {
    it.effect(
      "reads 20,000 posts due on 4,000 channels in one run, within 30 seconds",
      () =>
        Effect.gen(function* tensOfThousands() {
          const workspaceId = yield* freshWorkspace;
          const sql = yield* SqlClient.SqlClient;

          yield* Effect.gen(function* checks() {
            // Synthetic posts, followed and due: five on each channel.
            yield* sql`
            INSERT INTO analytics.tracked_posts
              (target_id, post_id, workspace_id, channel_id, platform_post_id,
               published_at, next_collection_at)
            SELECT uuidv7(), uuidv7(), ${workspaceId}::uuid,
                   channel.id, '11000000000' || post::text,
                   '1985-01-01T10:20:00Z'::timestamptz + post * interval '1 second',
                   '1985-01-01T11:07:00Z'::timestamptz
            FROM (
              SELECT uuidv7() AS id
              FROM generate_series(1, ${channels})
            ) AS channel
            CROSS JOIN generate_series(1, ${postsPerChannel}) AS post
          `;

            const startedAt = performance.now();

            const report = yield* CollectMetrics.use((collect) =>
              collect.run(at)
            );

            const seconds = (performance.now() - startedAt) / 1000;

            assert.deepStrictEqual(report, {
              deferred: 0,
              discovered: 0,
              ended: 0,
              left: 0,
              read: channels * postsPerChannel,
              skipped: 0,
            });

            // A call a channel, its five posts together, and one snapshot a
            // post.
            assert.lengthOf(
              yield* ReadLog.use((log) => log.requests),
              channels
            );

            const [snapshots] = yield* sql`
            SELECT count(*)::int AS rows
            FROM analytics.metric_snapshots AS snapshot
            JOIN analytics.tracked_posts AS post
              ON post.target_id = snapshot.target_id
            WHERE post.workspace_id = ${workspaceId}::uuid
              AND post.next_collection_at = '1985-01-01T12:07:00Z'
          `.pipe(Effect.flatMap(decodeCount));

            assert.strictEqual(snapshots.rows, channels * postsPerChannel);
            assert.strictEqual((yield* Metric.value(collectionLeft)).value, 0);
            assert.isBelow(seconds, 30);

            yield* Effect.logInfo("The collection read its posts").pipe(
              Effect.annotateLogs({ posts: report.read, seconds })
            );
          }).pipe(Effect.ensuring(forgetWorkspace(workspaceId)));
        }),
      120_000
    );
  }
);
