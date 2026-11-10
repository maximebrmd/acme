import { assert, layer } from "@effect/vitest";
import { DateTime, Effect, Layer, Schema } from "effect";
import { SqlClient } from "effect/sql";

import { AnalyticsRecords } from "#analytics/application/analytics-records.ts";
import type { FollowedAccount } from "#analytics/application/analytics-records.ts";
import { PurgeAnalytics } from "#analytics/application/purge-analytics.ts";
import { DrizzleAnalyticsRecords } from "#analytics/infrastructure/drizzle-analytics-records.ts";
import { SqlExpiredAnalytics } from "#analytics/infrastructure/sql-expired-analytics.ts";
import { newId } from "#shared/application/ids.ts";
import { PostIdSchema, PostTargetIdSchema } from "#shared/domain/ids.ts";
import type { ChannelId, WorkspaceId } from "#shared/domain/ids.ts";
import { forgetWorkspace, newChannelId } from "#test/analytics/support.ts";
import { DatabaseTest, freshWorkspace } from "#test/channels/support.ts";

// The retention job on Postgres, as if it ran in 1975: before every other
// suite's rows, which it must leave alone. Its own rows are dated by how
// long before that they were read. The tests of a channel that leaves its
// workspace run it too, as if in 1976: they are in this file so that they
// take turns with it, as each run deletes whatever is old enough.

const now = DateTime.makeUnsafe("1975-06-01T03:23:00Z");

const RetentionTest = Layer.mergeAll(
  DrizzleAnalyticsRecords,
  PurgeAnalytics.layer.pipe(Layer.provide(SqlExpiredAnalytics))
).pipe(Layer.provideMerge(DatabaseTest));

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

  // A channel that left keeps its account's days until it is purged.
  yield* sql`INSERT INTO analytics.account_snapshots (channel_id, day, collected_at, followers)
    VALUES (${channelId}, ${at}::timestamptz::date, ${at}::timestamptz, 10)`;

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

// When the channels of the tests below left their workspace: after the
// purge above ran, and long before any other suite's rows.
const departed = DateTime.makeUnsafe("1976-03-01T10:00:00Z");

const account = (
  workspaceId: WorkspaceId,
  channelId: ChannelId,
  accountId = "synthetic-account-1"
): FollowedAccount => ({
  accountId,
  channelId,
  platform: "mastodon",
  workspaceId,
});

// A post followed on the channel, published the day before it left.
const followPost = Effect.fn("test.followPost")(function* followPost(
  workspaceId: WorkspaceId,
  channelId: ChannelId
) {
  const sql = yield* SqlClient.SqlClient;
  const targetId = yield* newId(PostTargetIdSchema);
  const postId = yield* newId(PostIdSchema);

  yield* sql`INSERT INTO analytics.tracked_posts (target_id, post_id, channel_id, workspace_id, platform_post_id, published_at, ended_at, end_reason, permalink, likes, reposts, replies)
    VALUES (${targetId}, ${postId}, ${channelId}, ${workspaceId}, 'synthetic-1', '1976-02-29T10:00:00Z', '1976-02-29T11:00:00Z', 'window', 'synthetic', 1, 0, 0)`;
});

// The channel as the collection follows it, with one day of its account.
const followChannel = Effect.fn("test.followChannel")(function* followChannel(
  workspaceId: WorkspaceId,
  channelId: ChannelId
) {
  const sql = yield* SqlClient.SqlClient;

  yield* sql`INSERT INTO analytics.tracked_channels (channel_id, workspace_id, platform, next_collection_at)
    VALUES (${channelId}, ${workspaceId}, 'mastodon', '2090-01-01T00:00:00Z')`;
  yield* sql`INSERT INTO analytics.account_snapshots (channel_id, day, collected_at, followers)
    VALUES (${channelId}, '1976-02-29', '1976-02-29T12:00:00Z', 42)`;
});

const KeptSchema = Schema.Array(
  Schema.Struct({
    channel: Schema.String,
    days: Schema.Int,
    gone: Schema.Boolean,
    posts: Schema.Int,
    ref: Schema.Boolean,
  })
);

// What analytics holds of the workspace, by channel.
const keptOf = (workspaceId: WorkspaceId) =>
  SqlClient.SqlClient.use(
    (sql) => sql`
      SELECT c.channel_id::text AS channel,
             c.gone_at IS NOT NULL AS gone,
             c.account_ref IS NOT NULL AS ref,
             (SELECT count(*)::int FROM analytics.account_snapshots s WHERE s.channel_id = c.channel_id) AS days,
             (SELECT count(*)::int FROM analytics.tracked_posts p WHERE p.channel_id = c.channel_id) AS posts
      FROM analytics.tracked_channels c
      WHERE c.workspace_id = ${workspaceId}
      ORDER BY c.channel_id`
  ).pipe(Effect.flatMap(Schema.decodeUnknownEffect(KeptSchema)), Effect.orDie);

const orphanPosts = (workspaceId: WorkspaceId) =>
  SqlClient.SqlClient.use(
    (sql) =>
      sql`SELECT 1 FROM analytics.tracked_posts WHERE workspace_id = ${workspaceId}`
  ).pipe(
    Effect.map((rows) => rows.length),
    Effect.orDie
  );

const inWorkspace = <A, E, R>(
  test: (workspaceId: WorkspaceId) => Effect.Effect<A, E, R>
) =>
  Effect.gen(function* running() {
    const workspaceId = yield* freshWorkspace;

    return yield* test(workspaceId).pipe(
      Effect.ensuring(forgetWorkspace(workspaceId))
    );
  });

layer(RetentionTest, { excludeTestServices: true })(
  "the analytics retention job",
  (it) => {
    it.effect(
      "deletes what is older than its platform's terms allow, the numbers of channels gone a week, and old read counts",
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
            // Channels that left their workspace 5 and 8 days ago: the
            // second is past the week their numbers are kept.
            yield* seed(workspaceId, "gone-lately", "mastodon", 5, true);
            yield* seed(workspaceId, "gone-a-week", "mastodon", 8, true);

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
              "gone:1",
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

    it.effect(
      "is marked gone at once, keeps its numbers a week, then loses them all",
      () =>
        inWorkspace((workspaceId) =>
          Effect.gen(function* leaves() {
            const records = yield* AnalyticsRecords;
            const channelId = yield* newChannelId;

            yield* followChannel(workspaceId, channelId);
            yield* followPost(workspaceId, channelId);
            yield* records.channelGone(account(workspaceId, channelId), {
              at: departed,
              erase: false,
            });

            const gone = {
              channel: channelId,
              days: 1,
              gone: true,
              posts: 1,
              ref: true,
            };

            assert.deepStrictEqual(yield* keptOf(workspaceId), [gone]);

            // Six days later nothing is deleted; after seven, all of it.
            yield* PurgeAnalytics.use(({ purge }) =>
              purge(DateTime.add(departed, { days: 6 }))
            );

            assert.deepStrictEqual(yield* keptOf(workspaceId), [gone]);

            yield* PurgeAnalytics.use(({ purge }) =>
              purge(DateTime.add(departed, { days: 7, minutes: 1 }))
            );

            assert.deepStrictEqual(yield* keptOf(workspaceId), []);
            assert.strictEqual(yield* orphanPosts(workspaceId), 0);
          })
        )
    );

    it.effect(
      "is purged with its posts even when it was never followed, as one connected and gone within the hour",
      () =>
        inWorkspace((workspaceId) =>
          Effect.gen(function* neverFollowed() {
            const records = yield* AnalyticsRecords;
            const channelId = yield* newChannelId;

            // Its post was followed; its account never was.
            yield* followPost(workspaceId, channelId);
            yield* records.channelGone(account(workspaceId, channelId), {
              at: departed,
              erase: false,
            });

            assert.deepStrictEqual(yield* keptOf(workspaceId), [
              { channel: channelId, days: 0, gone: true, posts: 1, ref: true },
            ]);

            yield* PurgeAnalytics.use(({ purge }) =>
              purge(DateTime.add(departed, { days: 8 }))
            );

            assert.deepStrictEqual(yield* keptOf(workspaceId), []);
            assert.strictEqual(yield* orphanPosts(workspaceId), 0);
          })
        )
    );

    it.effect(
      "hands its numbers to the channel the same account is connected again as",
      () =>
        inWorkspace((workspaceId) =>
          Effect.gen(function* comesBack() {
            const records = yield* AnalyticsRecords;
            const before = yield* newChannelId;
            const after = yield* newChannelId;
            const other = yield* newChannelId;

            yield* followChannel(workspaceId, before);
            yield* followPost(workspaceId, before);
            yield* records.channelGone(account(workspaceId, before), {
              at: departed,
              erase: false,
            });

            const back = DateTime.add(departed, { days: 2 });

            // Another account connected meanwhile takes nothing.
            yield* records.channelBack(
              account(workspaceId, other, "synthetic-account-2"),
              back
            );

            assert.lengthOf(yield* keptOf(workspaceId), 1);

            yield* records.channelBack(account(workspaceId, after), back);

            assert.deepStrictEqual(yield* keptOf(workspaceId), [
              { channel: after, days: 1, gone: false, posts: 1, ref: false },
            ]);

            // And the retention job has nothing to take from it.
            yield* PurgeAnalytics.use(({ purge }) =>
              purge(DateTime.add(departed, { days: 30 }))
            );

            assert.lengthOf(yield* keptOf(workspaceId), 1);
          })
        )
    );

    it.effect(
      "loses everything at once when its platform asks for the account's data to be deleted",
      () =>
        inWorkspace((workspaceId) =>
          Effect.gen(function* erased() {
            const records = yield* AnalyticsRecords;
            const channelId = yield* newChannelId;

            yield* followChannel(workspaceId, channelId);
            yield* followPost(workspaceId, channelId);
            yield* records.channelGone(account(workspaceId, channelId), {
              at: departed,
              erase: true,
            });

            assert.deepStrictEqual(yield* keptOf(workspaceId), []);
            assert.strictEqual(yield* orphanPosts(workspaceId), 0);
          })
        )
    );
  }
);
