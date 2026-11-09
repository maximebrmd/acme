import { assert, layer } from "@effect/vitest";
import { DateTime, Effect, Layer } from "effect";
import { HttpServer } from "effect/http";
import { HttpApiTest } from "effect/http-api";
import {
  Api,
  Forbidden,
  InvalidDateRange,
  InvalidTimeZone,
} from "peal-contract";
import type { Member } from "peal-contract";

import { AnalyticsApiLive, AnalyticsLive } from "#analytics/container.ts";
import { DrizzleTrackedPosts } from "#analytics/infrastructure/drizzle-tracked-posts.ts";
import type { Permission } from "#shared/domain/access.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import {
  countsOf,
  forgetWorkspace,
  newChannelId,
  publicationOf,
  seedPost,
} from "#test/analytics/support.ts";
import {
  DatabaseTest,
  freshWorkspace,
  memberOf,
} from "#test/channels/support.ts";
import { securityTest } from "#workspace/api/security.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

// The analytics endpoints on their real use cases and Postgres. Each
// request acts as a member, as the WorkspaceAccess middleware would.

const ApiTest = Layer.mergeAll(AnalyticsLive, DrizzleTrackedPosts).pipe(
  Layer.provideMerge(DatabaseTest)
);

const clientAs = (member: Member) =>
  HttpApiTest.groups(Api, ["analytics"]).pipe(
    Effect.provide(
      Layer.mergeAll(
        AnalyticsApiLive.pipe(Layer.provideMerge(securityTest(member))),
        HttpServer.layerServices
      )
    )
  );

const as = (
  workspaceId: WorkspaceId,
  permissions: readonly Permission[] = permissionsFor("viewer")
) => clientAs(memberOf(workspaceId, permissions));

// A workspace with a post on one channel, read twice.
const seeded = Effect.gen(function* seeded() {
  const workspaceId = yield* freshWorkspace;
  const channelId = yield* newChannelId;

  const publication = yield* seedPost(
    yield* publicationOf(workspaceId, channelId, "2043-05-04T08:00:00Z"),
    [
      { at: "2043-05-04T09:07:00Z", metrics: countsOf(2, 1, 0) },
      { at: "2043-05-05T09:07:00Z", metrics: countsOf(6, 2, 1) },
    ]
  );

  return { channelId, publication, workspaceId };
});

layer(ApiTest)("the analytics endpoints", (it) => {
  it.effect("sum up a range of days in the reader's time zone", () =>
    Effect.gen(function* summary() {
      const { channelId, publication, workspaceId } = yield* seeded;

      yield* Effect.gen(function* checks() {
        const client = yield* as(workspaceId);

        const found = yield* client.analytics.summary({
          params: { workspaceId },
          query: {
            from: "2043-05-04",
            timeZone: "America/New_York",
            to: "2043-05-06",
          },
        });

        assert.deepStrictEqual(found.totals, {
          impressions: null,
          likes: 6,
          posts: 1,
          quotes: null,
          replies: 1,
          reposts: 2,
        });
        assert.deepStrictEqual(found.channels, [
          { ...found.totals, channelId },
        ]);
        // 05:07 and the day after in New York: what was gained each day.
        assert.deepStrictEqual(found.days, [
          { date: "2043-05-04", likes: 2, quotes: 0, replies: 0, reposts: 1 },
          { date: "2043-05-05", likes: 4, quotes: 0, replies: 1, reposts: 1 },
          { date: "2043-05-06", likes: 0, quotes: 0, replies: 0, reposts: 0 },
        ]);
        assert.deepStrictEqual(
          found.topPosts.map(({ engagement, postId, targetId }) => ({
            engagement,
            postId,
            targetId,
          })),
          [
            {
              engagement: 9,
              postId: publication.postId,
              targetId: publication.targetId,
            },
          ]
        );
        assert.deepStrictEqual(
          { from: found.from, timeZone: found.timeZone, to: found.to },
          {
            from: "2043-05-04",
            timeZone: "America/New_York",
            to: "2043-05-06",
          }
        );
      }).pipe(Effect.ensuring(forgetWorkspace(workspaceId)));
    })
  );

  it.effect("answer a post's counts over time", () =>
    Effect.gen(function* post() {
      const { channelId, publication, workspaceId } = yield* seeded;

      yield* Effect.gen(function* checks() {
        const client = yield* as(workspaceId);

        const found = yield* client.analytics.post({
          params: { postId: publication.postId, workspaceId },
        });

        assert.deepStrictEqual(found, {
          postId: publication.postId,
          targets: [
            {
              channelId,
              collecting: false,
              lastCollectedAt: DateTime.makeUnsafe("2043-05-05T09:07:00Z"),
              latest: {
                impressions: null,
                likes: 6,
                quotes: null,
                replies: 1,
                reposts: 2,
              },
              permalink: "https://mastodon.test/@alice/110000000000000001",
              publishedAt: DateTime.makeUnsafe("2043-05-04T08:00:00Z"),
              snapshots: [
                {
                  collectedAt: DateTime.makeUnsafe("2043-05-04T09:07:00Z"),
                  metrics: {
                    impressions: null,
                    likes: 2,
                    quotes: null,
                    replies: 0,
                    reposts: 1,
                  },
                },
                {
                  collectedAt: DateTime.makeUnsafe("2043-05-05T09:07:00Z"),
                  metrics: {
                    impressions: null,
                    likes: 6,
                    quotes: null,
                    replies: 1,
                    reposts: 2,
                  },
                },
              ],
              targetId: publication.targetId,
            },
          ],
        });

        // Another workspace reads nothing of it.
        const elsewhere = yield* freshWorkspace;
        const stranger = yield* as(elsewhere);

        const hidden = yield* stranger.analytics.post({
          params: { postId: publication.postId, workspaceId: elsewhere },
        });

        assert.deepStrictEqual(hidden.targets, []);

        const malformed = yield* client.analytics.post({
          params: { postId: "not-a-post", workspaceId },
        });

        assert.deepStrictEqual(malformed.targets, []);
      }).pipe(Effect.ensuring(forgetWorkspace(workspaceId)));
    })
  );

  it.effect("need analytics:read", () =>
    Effect.gen(function* forbidden() {
      const workspaceId = yield* freshWorkspace;
      const client = yield* as(workspaceId, ["post:read"]);
      const params = { workspaceId };

      const summary = yield* client.analytics
        .summary({
          params,
          query: { from: "2043-05-04", timeZone: "UTC", to: "2043-05-04" },
        })
        .pipe(Effect.flip);

      const post = yield* client.analytics
        .post({ params: { ...params, postId: "not-a-post" } })
        .pipe(Effect.flip);

      assert.instanceOf(summary, Forbidden);
      assert.instanceOf(post, Forbidden);
    })
  );

  it.effect("refuse a range backwards or longer than a year, and offsets", () =>
    Effect.gen(function* refusals() {
      const workspaceId = yield* freshWorkspace;
      const client = yield* as(workspaceId);
      const params = { workspaceId };

      const backwards = yield* client.analytics
        .summary({
          params,
          query: { from: "2043-05-04", timeZone: "UTC", to: "2043-05-03" },
        })
        .pipe(Effect.flip);

      const long = yield* client.analytics
        .summary({
          params,
          query: { from: "2043-01-01", timeZone: "UTC", to: "2044-01-02" },
        })
        .pipe(Effect.flip);

      const offset = yield* client.analytics
        .summary({
          params,
          query: { from: "2043-05-04", timeZone: "+01:00", to: "2043-05-04" },
        })
        .pipe(Effect.flip);

      assert.instanceOf(backwards, InvalidDateRange);
      assert.instanceOf(long, InvalidDateRange);
      assert.instanceOf(offset, InvalidTimeZone);
    })
  );

  // Days the contract takes, as they are on the calendar, but past the
  // ends of the one Peal keeps: before 1970, and the last day of 9999,
  // whose end is in year 10000.
  it.effect("refuse a range off the calendar Peal keeps", () =>
    Effect.gen(function* edges() {
      const workspaceId = yield* freshWorkspace;
      const client = yield* as(workspaceId);
      const params = { workspaceId };

      const refused = yield* Effect.forEach(
        [
          { from: "1969-12-01", timeZone: "UTC", to: "1969-12-31" },
          { from: "1969-12-31", timeZone: "UTC", to: "1970-01-01" },
          { from: "9999-12-01", timeZone: "UTC", to: "9999-12-31" },
        ],
        (query) =>
          client.analytics.summary({ params, query }).pipe(Effect.flip),
        { concurrency: 1 }
      );

      for (const failure of refused) {
        assert.instanceOf(failure, InvalidDateRange);
      }

      // Its first and last days, otherwise, are days like any other.
      const first = yield* client.analytics.summary({
        params,
        query: { from: "1970-01-01", timeZone: "Asia/Tokyo", to: "1970-01-02" },
      });

      const last = yield* client.analytics.summary({
        params,
        query: {
          from: "9999-12-30",
          timeZone: "America/New_York",
          to: "9999-12-30",
        },
      });

      assert.deepStrictEqual(
        [first.days.length, last.days.length, last.totals.posts],
        [2, 1, 0]
      );
    })
  );
});
