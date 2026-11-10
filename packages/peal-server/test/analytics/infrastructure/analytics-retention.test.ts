import { assert, layer } from "@effect/vitest";
import { DateTime, Effect, Layer, Schema } from "effect";
import { SqlClient } from "effect/sql";

import { PurgeAnalytics } from "#analytics/application/purge-analytics.ts";
import { SqlExpiredAnalytics } from "#analytics/infrastructure/sql-expired-analytics.ts";
import { newId } from "#shared/application/ids.ts";
import { PostIdSchema, PostTargetIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { forgetWorkspace, newChannelId } from "#test/analytics/support.ts";
import { DatabaseTest, freshWorkspace } from "#test/channels/support.ts";

// The retention job on Postgres, as if it ran in 1975: before every other
// suite's rows, which it must leave alone. Its own rows are dated by how
// long before that they were read.

const now = DateTime.makeUnsafe("1975-06-01T03:23:00Z");

const RetentionTest = PurgeAnalytics.layer.pipe(
  Layer.provide(SqlExpiredAnalytics),
  Layer.provideMerge(DatabaseTest)
);

const CountsSchema = Schema.Array(
  Schema.Struct({ label: Schema.String, rows: Schema.Int })
);

const daysAgo = (days: number) =>
  DateTime.formatIso(DateTime.subtract(now, { days }));

// A channel followed on `platform`, with an account day and a post read
// `age` days ago, labelled so the test can say what is left.
const seed = Effect.fn("test.seedRetention")(function* seed(
  workspaceId: WorkspaceId,
  label: string,
  platform: string,
  age: number,
  gone: boolean
) {
  const sql = yield* SqlClient.SqlClient;
  const channelId = yield* newChannelId;
  const targetId = yield* newId(PostTargetIdSchema);
  const postId = yield* newId(PostIdSchema);
  const at = daysAgo(age);

  yield* sql`INSERT INTO analytics.tracked_channels (channel_id, workspace_id, platform, next_collection_at, gone_at)
    VALUES (${channelId}, ${workspaceId}, ${gone ? "gone" : platform}, '2090-01-01T00:00:00Z', ${gone ? at : null}::timestamptz)`;

  if (!gone) {
    yield* sql`INSERT INTO analytics.account_snapshots (channel_id, day, collected_at, followers)
      VALUES (${channelId}, ${at}::timestamptz::date, ${at}::timestamptz, 10)`;
  }

  yield* sql`INSERT INTO analytics.tracked_posts (target_id, post_id, channel_id, workspace_id, platform_post_id, published_at, ended_at, end_reason, permalink, likes, reposts, replies)
    VALUES (${targetId}, ${postId}, ${channelId}, ${workspaceId}, ${label}, ${at}::timestamptz, ${at}::timestamptz, 'window', ${label}, 1, 0, 0)`;
  yield* sql`INSERT INTO analytics.metric_snapshots (target_id, collected_at, likes, reposts, replies)
    VALUES (${targetId}, ${at}::timestamptz, 1, 0, 0)`;
});

const left = (workspaceId: WorkspaceId) =>
  SqlClient.SqlClient.use(
    (sql) => sql`
      SELECT p.permalink AS label, count(s.*)::int AS rows
      FROM analytics.tracked_posts p
      LEFT JOIN analytics.metric_snapshots s ON s.target_id = p.target_id
      WHERE p.workspace_id = ${workspaceId}
      GROUP BY p.permalink ORDER BY p.permalink`
  ).pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(CountsSchema)),
    Effect.orDie,
    Effect.map((rows) => rows.map(({ label }) => label))
  );

const accountDays = (workspaceId: WorkspaceId) =>
  SqlClient.SqlClient.use(
    (sql) => sql`
      SELECT c.platform AS label, count(s.*)::int AS rows
      FROM analytics.tracked_channels c
      LEFT JOIN analytics.account_snapshots s ON s.channel_id = c.channel_id
      WHERE c.workspace_id = ${workspaceId}
      GROUP BY c.platform, c.channel_id ORDER BY c.platform, rows`
  ).pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(CountsSchema)),
    Effect.orDie,
    Effect.map((rows) =>
      rows.map(({ label, rows: kept }) => `${label}:${kept}`)
    )
  );

layer(RetentionTest, { excludeTestServices: true })(
  "the analytics retention job",
  (it) => {
    it.effect(
      "deletes what is older than its platform's terms allow, the posts of channels gone a month, and old read counts",
      () =>
        Effect.gen(function* purges() {
          const workspaceId = yield* freshWorkspace;
          const sql = yield* SqlClient.SqlClient;

          yield* Effect.gen(function* checks() {
            yield* seed(workspaceId, "mastodon-recent", "mastodon", 700, false);
            yield* seed(workspaceId, "mastodon-old", "mastodon", 731, false);
            yield* seed(workspaceId, "linkedin-recent", "linkedin", 360, false);
            yield* seed(workspaceId, "linkedin-old", "linkedin", 366, false);
            yield* seed(
              workspaceId,
              "pinterest-recent",
              "pinterest",
              80,
              false
            );
            yield* seed(workspaceId, "pinterest-old", "pinterest", 91, false);
            // Channels that left their workspace 20 and 31 days ago.
            yield* seed(workspaceId, "gone-lately", "mastodon", 20, true);
            yield* seed(workspaceId, "gone-a-month", "mastodon", 31, true);

            yield* sql`INSERT INTO analytics.paid_reads (workspace_id, platform, day, resource)
              VALUES (${workspaceId}, 'x', ${daysAgo(10)}::timestamptz::date, 'recent'),
                     (${workspaceId}, 'x', ${daysAgo(36)}::timestamptz::date, 'old')`;

            const report = yield* PurgeAnalytics.use(({ purge }) => purge(now));

            assert.isAtLeast(report.posts, 4);
            assert.isAtLeast(report.accountDays, 3);
            assert.isAtLeast(report.paidReads, 1);

            assert.deepStrictEqual(yield* left(workspaceId), [
              "gone-lately",
              "linkedin-recent",
              "mastodon-recent",
              "pinterest-recent",
            ]);
            assert.deepStrictEqual(yield* accountDays(workspaceId), [
              "gone:0",
              "linkedin:0",
              "linkedin:1",
              "mastodon:0",
              "mastodon:1",
              "pinterest:0",
              "pinterest:1",
            ]);

            const reads =
              yield* sql`SELECT resource FROM analytics.paid_reads WHERE workspace_id = ${workspaceId}`;

            assert.deepStrictEqual(reads, [{ resource: "recent" }]);

            // Nothing more to delete of this workspace: a second run
            // leaves it as it is.
            yield* PurgeAnalytics.use(({ purge }) => purge(now));

            assert.lengthOf(yield* left(workspaceId), 4);
          }).pipe(
            Effect.ensuring(
              Effect.all([
                forgetWorkspace(workspaceId),
                sql`DELETE FROM analytics.paid_reads WHERE workspace_id = ${workspaceId}`.pipe(
                  Effect.orDie
                ),
              ])
            )
          );
        })
    );
  }
);
