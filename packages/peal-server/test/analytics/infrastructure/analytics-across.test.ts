import { assert, layer } from "@effect/vitest";
import { Effect, Layer, Option } from "effect";
import { SqlClient } from "effect/sql";

import { noTotals } from "#analytics/application/analytics-dashboard.ts";
import { AnalyticsQueries } from "#analytics/application/analytics-queries.ts";
import type { RangeAsked } from "#analytics/application/analytics-queries.ts";
import { AnalyticsLive } from "#analytics/container.ts";
import { DrizzleTrackedPosts } from "#analytics/infrastructure/drizzle-tracked-posts.ts";
import type { ChannelId, WorkspaceId } from "#shared/domain/ids.ts";
import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";
import { LocalDateSchema } from "#shared/domain/wall-clock.ts";
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

// The report across workspaces, in Postgres, against each workspace's own
// dashboard over the same range. The rows are workspaces of the test's
// own, in 2048, which no other suite uses, and are deleted after.

const AcrossTest = Layer.mergeAll(AnalyticsLive, DrizzleTrackedPosts).pipe(
  Layer.provideMerge(DatabaseTest)
);

// The 30 days up to 20 July 2048, as days run in Paris: named by their
// days, so no clock moves decades ahead.
const lastMonth: RangeAsked = {
  _tag: "between",
  from: LocalDateSchema.make({ day: 21, month: 6, year: 2048 }),
  timeZone: TimeZoneIdSchema.make("Europe/Paris"),
  to: LocalDateSchema.make({ day: 20, month: 7, year: 2048 }),
};

const followed = Effect.fn("test.followed")(function* followed(
  workspaceId: WorkspaceId,
  channelId: ChannelId,
  platform: string,
  days: readonly (readonly [string, number])[]
) {
  const sql = yield* SqlClient.SqlClient;

  yield* sql`INSERT INTO analytics.tracked_channels (channel_id, workspace_id, platform, next_collection_at)
    VALUES (${channelId}, ${workspaceId}, ${platform}, '2090-01-01T00:00:00Z')`;

  for (const [day, followers] of days) {
    yield* sql`INSERT INTO analytics.account_snapshots (channel_id, day, collected_at, followers)
      VALUES (${channelId}, ${day}::date, ${`${day}T10:37:00Z`}::timestamptz, ${followers})`;
  }
});

const forgetSnapshots = (channelIds: readonly ChannelId[]) =>
  SqlClient.SqlClient.use(
    (sql) =>
      sql`DELETE FROM analytics.account_snapshots WHERE channel_id IN ${sql.in(channelIds)}`
  ).pipe(Effect.orDie);

layer(AcrossTest)("the report across workspaces", (it) => {
  it.effect(
    "gives each workspace the totals and followers its own dashboard gives, and none to one without posts",
    () =>
      Effect.gen(function* equal() {
        const first = yield* freshWorkspace;
        const second = yield* freshWorkspace;
        const quiet = yield* freshWorkspace;
        const mastodon = yield* newChannelId;
        const pinterest = yield* newChannelId;
        const bluesky = yield* newChannelId;

        // In the range (21 June to 20 July), and in the range before.
        yield* seedPost(
          yield* publicationOf(first, mastodon, "2048-07-02T08:00:00Z"),
          [{ at: "2048-07-03T09:07:00Z", metrics: countsOf(7, 2, 1, 3) }]
        );
        yield* seedPost(
          yield* publicationOf(
            first,
            pinterest,
            "2048-07-10T08:00:00Z",
            "110000000000000002"
          ),
          [{ at: "2048-07-11T09:07:00Z", metrics: countsOf(4, 1, 0) }]
        );
        yield* seedPost(
          yield* publicationOf(
            first,
            mastodon,
            "2048-06-01T08:00:00Z",
            "110000000000000003"
          ),
          [{ at: "2048-06-02T09:07:00Z", metrics: countsOf(1, 0, 0) }]
        );
        yield* seedPost(
          yield* publicationOf(
            second,
            bluesky,
            "2048-07-19T21:30:00Z",
            "110000000000000004"
          ),
          [{ at: "2048-07-20T09:07:00Z", metrics: countsOf(10, 4, 2) }]
        );

        yield* followed(first, mastodon, "mastodon", [
          ["2048-06-15", 90],
          ["2048-07-01", 100],
          ["2048-07-18", 120],
        ]);
        yield* followed(first, pinterest, "pinterest", [["2048-07-12", 40]]);
        yield* followed(second, bluesky, "bluesky", [["2048-07-19", 7]]);

        const actors = [first, second, quiet].map((workspaceId) =>
          actorIn(workspaceId, ["analytics:read"])
        );

        const found = yield* Effect.gen(function* read() {
          const queries = yield* AnalyticsQueries;
          const report = yield* queries.acrossWorkspaces(actors, lastMonth);

          const dashboards = yield* Effect.all(
            actors.map((actor) => queries.dashboard(actor, lastMonth, 0))
          );

          return { dashboards, report };
        }).pipe(
          Effect.ensuring(
            Effect.all([
              forgetSnapshots([mastodon, pinterest, bluesky]),
              forgetWorkspace(first),
              forgetWorkspace(second),
            ])
          )
        );

        for (const [index, actor] of actors.entries()) {
          const dashboard = found.dashboards[index];
          const across = found.report.workspaces.get(actor.workspaceId);

          assert.isDefined(dashboard);
          assert.isDefined(across);
          assert.deepStrictEqual(across, {
            followers: dashboard.followers,
            previousFollowers: dashboard.previousFollowers,
            previousKept: dashboard.previousKept,
            previousTotals: dashboard.previousTotals,
            totals: dashboard.totals,
          });
          assert.deepStrictEqual(found.report.range, dashboard.range);
        }

        const mine = found.report.workspaces.get(first);

        assert.isDefined(mine);
        assert.strictEqual(mine.totals.posts, 2);
        assert.strictEqual(mine.totals.likes, 11);
        assert.deepStrictEqual(mine.totals.quotes, Option.some(3));
        assert.strictEqual(mine.previousTotals.posts, 1);
        // Pinterest keeps 90 days: the range before is all kept still.
        assert.isTrue(mine.previousKept);
        assert.deepStrictEqual(
          found.report.workspaces.get(quiet)?.totals,
          noTotals
        );
      })
  );

  it.effect("refuses an actor who may not read a workspace's analytics", () =>
    Effect.gen(function* refused() {
      const workspaceId = yield* freshWorkspace;
      const other = yield* freshWorkspace;

      const failure = yield* AnalyticsQueries.use((queries) =>
        queries.acrossWorkspaces(
          [
            actorIn(workspaceId, ["analytics:read"]),
            actorIn(other, ["post:read"]),
          ],
          lastMonth
        )
      ).pipe(Effect.flip);

      assert.strictEqual(failure._tag, "MissingPermission");
    })
  );
});
