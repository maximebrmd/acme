import { assert, layer } from "@effect/vitest";
import { DateTime, Effect, Layer, Option } from "effect";
import { SqlClient } from "effect/sql";

import { AnalyticsQueries } from "#analytics/application/analytics-queries.ts";
import { AnalyticsLive } from "#analytics/container.ts";
import { DrizzleTrackedPosts } from "#analytics/infrastructure/drizzle-tracked-posts.ts";
import type { ChannelId, WorkspaceId } from "#shared/domain/ids.ts";
import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";
import {
  countsOf,
  forgetWorkspace,
  newChannelId,
  publicationOf,
  seedPost,
} from "#test/analytics/support.ts";
import {
  actorIn,
  DatabaseTest,
  freshWorkspace,
} from "#test/channels/support.ts";

// When a channel's posts did best, in Postgres, over the last days of the
// real clock: the rows are a workspace of the test's own, whose posts are
// no longer read, and are deleted after.

const BestTimesTest = Layer.mergeAll(AnalyticsLive, DrizzleTrackedPosts).pipe(
  Layer.provideMerge(DatabaseTest)
);

const utc = TimeZoneIdSchema.make("UTC");

const follow = (
  workspaceId: WorkspaceId,
  channelId: ChannelId,
  platform: string
) =>
  SqlClient.SqlClient.use(
    (sql) =>
      sql`INSERT INTO analytics.tracked_channels (channel_id, workspace_id, platform, next_collection_at)
        VALUES (${channelId}, ${workspaceId}, ${platform}, '2090-01-01T00:00:00Z')`
  ).pipe(Effect.orDie);

layer(BestTimesTest, { excludeTestServices: true })(
  "when a channel's posts did best",
  (it) => {
    it.effect(
      "weighs the channel's settled posts by the hour they went live, and leaves out the recent and the removed",
      () =>
        Effect.gen(function* weighs() {
          const workspaceId = yield* freshWorkspace;
          const channelId = yield* newChannelId;
          const other = yield* newChannelId;
          const now = yield* DateTime.now;

          // The same hour (UTC) of 24 days, the last five days ago.
          const daysAgo = (days: number, hour: number) =>
            DateTime.formatIso(
              DateTime.add(DateTime.startOf(now, "day"), {
                days: -days,
                hours: hour,
              })
            );

          yield* follow(workspaceId, channelId, "bluesky");
          yield* follow(workspaceId, other, "mastodon");

          // Four on the same weekday at nine, 13 each; twenty at six in
          // the evening, 4 each.
          const posts = [
            ...[5, 12, 19, 26].map((days) => ({ days, hour: 9, likes: 10 })),
            ...Array.from({ length: 20 }, (_, index) => ({
              days: 5 + index,
              hour: 18,
              likes: 1,
            })),
          ];

          for (const [index, { days, hour, likes }] of posts.entries()) {
            yield* seedPost(
              yield* publicationOf(
                workspaceId,
                channelId,
                daysAgo(days, hour),
                `11000000000000${String(1000 + index)}`
              ),
              [{ at: daysAgo(4, 0), metrics: countsOf(likes, 1, 1, 1) }]
            );
          }

          // Settling still, and deleted from the platform, and another
          // channel's: none weighed.
          yield* seedPost(
            yield* publicationOf(
              workspaceId,
              channelId,
              DateTime.formatIso(DateTime.subtract(now, { hours: 3 })),
              "110000000000009001"
            ),
            [{ at: DateTime.formatIso(now), metrics: countsOf(99, 0, 0) }]
          );

          const removed = yield* seedPost(
            yield* publicationOf(
              workspaceId,
              channelId,
              daysAgo(6, 12),
              "110000000000009002"
            ),
            [{ at: daysAgo(5, 0), metrics: countsOf(500, 0, 0) }]
          );

          yield* SqlClient.SqlClient.use(
            (sql) =>
              sql`UPDATE analytics.tracked_posts SET end_reason = 'removed' WHERE target_id = ${removed.targetId}`
          ).pipe(Effect.orDie);

          yield* seedPost(
            yield* publicationOf(
              workspaceId,
              other,
              daysAgo(6, 12),
              "110000000000009003"
            ),
            [{ at: daysAgo(5, 0), metrics: countsOf(500, 0, 0) }]
          );

          const found = yield* AnalyticsQueries.use((queries) =>
            queries.bestTimes(
              actorIn(workspaceId, ["analytics:read"]),
              Option.some(channelId),
              30,
              utc
            )
          ).pipe(Effect.ensuring(forgetWorkspace(workspaceId)));

          assert.strictEqual(found.platform, "bluesky");
          assert.isTrue(found.counted);
          assert.strictEqual(found.days, 30);
          assert.strictEqual(found.posts, 24);
          assert.strictEqual(found.recent, 1);
          assert.isTrue(found.enough);

          const [first] = found.best;

          // Likes, reposts, replies and quotes together: 13 at nine.
          assert.isDefined(first);
          assert.strictEqual(first.hour, 9);
          assert.deepStrictEqual(first.median, Option.some(13));
          assert.isTrue(
            found.buckets.every(({ hour }) => hour === 9 || hour === 18)
          );
        })
    );

    it.effect(
      "answers a channel the workspace does not follow as not found, and one whose platform gives no count as not counted",
      () =>
        Effect.gen(function* refusals() {
          const workspaceId = yield* freshWorkspace;
          const business = yield* newChannelId;
          const stranger = yield* newChannelId;
          const actor = actorIn(workspaceId, ["analytics:read"]);

          yield* follow(workspaceId, business, "googleBusiness");

          const found = yield* Effect.gen(function* read() {
            const queries = yield* AnalyticsQueries;

            const missing = yield* queries
              .bestTimes(actor, Option.some(stranger), 90, utc)
              .pipe(Effect.flip);

            const uncounted = yield* queries.bestTimes(
              actor,
              Option.some(business),
              180,
              utc
            );

            return { missing, uncounted };
          }).pipe(Effect.ensuring(forgetWorkspace(workspaceId)));

          assert.strictEqual(found.missing._tag, "ChannelNotFound");
          assert.isFalse(found.uncounted.counted);
          // Google Business Profile's numbers are kept 30 days at most.
          assert.strictEqual(found.uncounted.days, 30);
          assert.isFalse(found.uncounted.enough);
        })
    );
  }
);
