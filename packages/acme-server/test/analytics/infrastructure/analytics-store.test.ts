import { assert, layer } from "@effect/vitest";
import { DateTime, Effect, Layer, Option, Result } from "effect";

import { AnalyticsRecords } from "#analytics/application/analytics-records.ts";
import { AnalyticsReports } from "#analytics/application/analytics-reports.ts";
import { TrackedPosts } from "#analytics/application/tracked-posts.ts";
import { dayStarts, reportRange } from "#analytics/domain/report-range.ts";
import {
  endCollection,
  recordReading,
  trackPublication,
} from "#analytics/domain/tracked-post.ts";
import { DrizzleAnalyticsRecords } from "#analytics/infrastructure/drizzle-analytics-records.ts";
import { DrizzleTrackedPosts } from "#analytics/infrastructure/drizzle-tracked-posts.ts";
import { SqlAnalyticsReports } from "#analytics/infrastructure/sql-analytics-reports.ts";
import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";
import {
  countsOf,
  forgetWorkspace,
  newChannelId,
  publicationOf,
  seedPost,
} from "#test/analytics/support.ts";
import { DatabaseTest, freshWorkspace } from "#test/channels/support.ts";

// The Postgres store and its reports, on the database DATABASE_URL names.
// Each test writes rows of its own workspace, at instants no other suite
// uses, and deletes them after.

const StoreTest = Layer.mergeAll(
  DrizzleTrackedPosts,
  SqlAnalyticsReports,
  DrizzleAnalyticsRecords
).pipe(Layer.provideMerge(DatabaseTest));

const utc = (iso: string) => DateTime.makeUnsafe(iso);

const paris = TimeZoneIdSchema.make("Europe/Paris");

layer(StoreTest)("the analytics store", (it) => {
  it.effect("follows a post once, and keeps its readings", () =>
    Effect.gen(function* follows() {
      const workspaceId = yield* freshWorkspace;
      const tracked = yield* TrackedPosts;

      const publication = yield* publicationOf(
        workspaceId,
        yield* newChannelId,
        "2041-03-02T10:20:00.000Z"
      );

      const post = trackPublication(publication);

      yield* Effect.gen(function* checks() {
        assert.strictEqual(yield* tracked.track([post]), 1);
        assert.strictEqual(yield* tracked.track([post]), 0);

        const due = yield* tracked.due(utc("2041-03-02T11:07:00.000Z"), 10_000);

        assert.deepStrictEqual(
          due.filter(({ targetId }) => targetId === post.targetId),
          [post]
        );

        const read = recordReading(
          post,
          countsOf(3, 1, 0, 2),
          utc("2041-03-02T11:07:01.250Z"),
          utc("2041-03-02T11:07:00.000Z")
        );

        yield* tracked.saveReading(read);

        // Not due before its next turn, and due then, as read.
        const before = yield* tracked.due(
          utc("2041-03-02T12:06:59.999Z"),
          10_000
        );

        const after = yield* tracked.due(
          utc("2041-03-02T12:07:00.000Z"),
          10_000
        );

        assert.isFalse(
          before.some(({ targetId }) => targetId === post.targetId)
        );
        assert.deepStrictEqual(
          after.filter(({ targetId }) => targetId === post.targetId),
          [read]
        );

        assert.deepStrictEqual(
          yield* tracked.latestPublication(utc("2041-03-02T11:00:00.000Z")),
          Option.some({
            publishedAt: publication.publishedAt,
            targetId: publication.targetId,
          })
        );

        const [history] = yield* AnalyticsReports.use((reports) =>
          reports.history(workspaceId, publication.postId)
        );

        assert.deepStrictEqual(history?.snapshots, [
          {
            collectedAt: utc("2041-03-02T11:07:01.250Z"),
            metrics: countsOf(3, 1, 0, 2),
          },
        ]);
      }).pipe(Effect.ensuring(forgetWorkspace(workspaceId)));
    })
  );

  it.effect("reports totals by channel, gains by day and top posts", () =>
    Effect.gen(function* reportsByChannelAndDay() {
      const workspaceId = yield* freshWorkspace;
      const mastodon = yield* newChannelId;
      const bluesky = yield* newChannelId;

      yield* Effect.gen(function* checks() {
        const first = yield* seedPost(
          yield* publicationOf(workspaceId, mastodon, "2042-10-25T08:00:00Z"),
          [
            { at: "2042-10-25T09:07:00Z", metrics: countsOf(2, 1, 0) },
            { at: "2042-10-25T20:07:00Z", metrics: countsOf(5, 1, 0) },
            { at: "2042-10-26T09:07:00Z", metrics: countsOf(9, 2, 1) },
          ]
        );

        const second = yield* seedPost(
          yield* publicationOf(workspaceId, bluesky, "2042-10-26T10:00:00Z"),
          [
            { at: "2042-10-26T11:07:00Z", metrics: countsOf(1, 0, 0, 0) },
            { at: "2042-10-27T11:07:00Z", metrics: countsOf(4, 1, 0, 1) },
          ]
        );

        // 00:30 in Paris on the first day: in the range, never read.
        yield* seedPost(
          yield* publicationOf(workspaceId, mastodon, "2042-10-24T22:30:00Z"),
          []
        );

        // 23:00 in Paris the day before, and the day after: outside.
        for (const outside of [
          "2042-10-24T21:00:00Z",
          "2042-10-28T10:00:00Z",
        ]) {
          yield* seedPost(
            yield* publicationOf(workspaceId, mastodon, outside),
            [{ at: outside, metrics: countsOf(100, 100, 100) }]
          );
        }

        const range = yield* Effect.fromResult(
          reportRange({
            from: { day: 25, month: 10, year: 2042 },
            timeZone: paris,
            to: { day: 27, month: 10, year: 2042 },
          })
        );

        const rows = yield* AnalyticsReports.use((reports) =>
          reports.report(workspaceId, dayStarts(range), 5)
        );

        assert.deepStrictEqual(
          rows.channels.toSorted((left, right) =>
            left.channelId.localeCompare(right.channelId)
          ),
          [
            {
              channelId: mastodon,
              impressions: Option.none(),
              likes: 9,
              posts: 2,
              quotes: Option.none(),
              replies: 1,
              reposts: 2,
            },
            {
              channelId: bluesky,
              impressions: Option.none(),
              likes: 4,
              posts: 1,
              quotes: Option.some(1),
              replies: 0,
              reposts: 1,
            },
          ].toSorted((left, right) =>
            left.channelId.localeCompare(right.channelId)
          )
        );

        assert.deepStrictEqual(rows.days, [
          { day: 0, likes: 5, quotes: 0, replies: 0, reposts: 1 },
          { day: 1, likes: 5, quotes: 0, replies: 1, reposts: 1 },
          { day: 2, likes: 3, quotes: 1, replies: 0, reposts: 1 },
        ]);

        assert.deepStrictEqual(
          rows.top.map(({ targetId }) => targetId),
          [first.targetId, second.targetId]
        );
      }).pipe(Effect.ensuring(forgetWorkspace(workspaceId)));
    })
  );

  it.effect("counts a day the clocks change in full", () =>
    Effect.gen(function* daylightSaving() {
      const workspaceId = yield* freshWorkspace;

      yield* Effect.gen(function* checks() {
        // Paris falls back on 26 October 2042, so its evening is on UTC+1:
        // 22:30 UTC is 23:30 on the 26th there, where summer time would
        // make it 00:30 on the 27th.
        yield* seedPost(
          yield* publicationOf(
            workspaceId,
            yield* newChannelId,
            "2042-10-26T12:00:00Z"
          ),
          [{ at: "2042-10-26T22:30:00Z", metrics: countsOf(4, 0, 0) }]
        );

        const range = Result.getOrThrow(
          reportRange({
            from: { day: 26, month: 10, year: 2042 },
            timeZone: paris,
            to: { day: 27, month: 10, year: 2042 },
          })
        );

        const { days } = yield* AnalyticsReports.use((reports) =>
          reports.report(workspaceId, dayStarts(range), 5)
        );

        assert.deepStrictEqual(days, [
          { day: 0, likes: 4, quotes: 0, replies: 0, reposts: 0 },
        ]);
      }).pipe(Effect.ensuring(forgetWorkspace(workspaceId)));
    })
  );

  it.effect(
    "exports and erases a workspace's posts followed, and drops a reading of one erased meanwhile",
    () =>
      Effect.gen(function* records() {
        const workspaceId = yield* freshWorkspace;
        const tracked = yield* TrackedPosts;
        const analytics = yield* AnalyticsRecords;

        const publication = yield* publicationOf(
          workspaceId,
          yield* newChannelId,
          "2041-04-02T10:20:00.000Z"
        );

        yield* Effect.gen(function* checks() {
          const post = trackPublication(publication);

          yield* tracked.track([post]);

          const read = recordReading(
            post,
            countsOf(5, 2, 1),
            utc("2041-04-02T11:07:01.000Z"),
            utc("2041-04-02T11:07:00.000Z")
          );

          yield* tracked.saveReading(read);

          assert.deepStrictEqual(
            yield* analytics.exportWorkspace(workspaceId),
            [
              {
                channelId: publication.channelId,
                permalink: Option.getOrNull(publication.permalink),
                postId: publication.postId,
                publishedAt: publication.publishedAt,
                snapshots: [
                  {
                    collectedAt: utc("2041-04-02T11:07:01.000Z"),
                    impressions: null,
                    likes: 5,
                    quotes: null,
                    replies: 1,
                    reposts: 2,
                  },
                ],
                targetId: publication.targetId,
              },
            ]
          );

          yield* analytics.eraseWorkspace(workspaceId);

          assert.deepStrictEqual(
            yield* analytics.exportWorkspace(workspaceId),
            []
          );

          // A reading that ends after the erasure keeps nothing, and fails
          // nothing.
          yield* tracked.saveReading(
            recordReading(
              read,
              countsOf(6, 2, 1),
              utc("2041-04-02T12:07:01.000Z"),
              utc("2041-04-02T12:07:00.000Z")
            )
          );

          assert.deepStrictEqual(
            yield* analytics.exportWorkspace(workspaceId),
            []
          );
        }).pipe(Effect.ensuring(forgetWorkspace(workspaceId)));
      })
  );

  it.effect(
    "leaves out of its reports the posts of a platform it reads no counts on",
    () =>
      Effect.gen(function* unreadable() {
        const workspaceId = yield* freshWorkspace;
        const tracked = yield* TrackedPosts;
        const linkedin = yield* newChannelId;

        yield* Effect.gen(function* checks() {
          const publication = yield* publicationOf(
            workspaceId,
            linkedin,
            "2043-02-10T09:00:00Z"
          );

          const post = trackPublication(publication);

          yield* tracked.track([post]);
          yield* tracked.saveSchedule(
            endCollection(post, "unsupported", utc("2043-02-10T09:07:00Z"))
          );

          const range = yield* Effect.fromResult(
            reportRange({
              from: { day: 10, month: 2, year: 2043 },
              timeZone: paris,
              to: { day: 10, month: 2, year: 2043 },
            })
          );

          const rows = yield* AnalyticsReports.use((reports) =>
            reports.report(workspaceId, dayStarts(range), 5)
          );

          assert.deepStrictEqual(rows.channels, []);
          assert.deepStrictEqual(rows.top, []);
          assert.deepStrictEqual(
            yield* AnalyticsReports.use((reports) =>
              reports.history(workspaceId, publication.postId)
            ),
            []
          );
        }).pipe(Effect.ensuring(forgetWorkspace(workspaceId)));
      })
  );
});
