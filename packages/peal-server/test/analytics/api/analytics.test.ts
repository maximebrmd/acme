import { assert, layer } from "@effect/vitest";
import { DateTime, Effect, Layer, Option, Schema, Stream } from "effect";
import { HttpServer } from "effect/http";
import { HttpApiTest } from "effect/http-api";
import { SqlClient } from "effect/sql";
import {
  Api,
  exportColumns,
  Forbidden,
  InvalidDateRange,
  InvalidTimeZone,
} from "peal-contract";
import type { Member } from "peal-contract";

import { dayView } from "#analytics/api/analytics-view.ts";
import { AnalyticsApiLive, AnalyticsLive } from "#analytics/container.ts";
import { PostMetrics } from "#analytics/domain/post-metrics.ts";
import { DrizzleTrackedPosts } from "#analytics/infrastructure/drizzle-tracked-posts.ts";
import type { Permission } from "#shared/domain/access.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";
import { addDays, localDateOf } from "#shared/domain/wall-clock.ts";
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

type Client = Effect.Success<ReturnType<typeof as>>;

// An export, whole, as text.
const exported = (
  client: Client,
  workspaceId: WorkspaceId,
  query: Parameters<Client["analytics"]["export"]>[0]["query"]
) =>
  client.analytics
    .export({ params: { workspaceId }, query })
    .pipe(
      Effect.flatMap((file) => file.pipe(Stream.decodeText(), Stream.mkString))
    );

const AccountRowSchema = Schema.fromJsonString(
  Schema.Struct({
    channelId: Schema.String,
    date: Schema.String,
    followers: Schema.NullOr(Schema.Int),
    following: Schema.NullOr(Schema.Int),
    platform: Schema.NullOr(Schema.String),
    posts: Schema.NullOr(Schema.Int),
    reach: Schema.NullOr(Schema.Int),
    views: Schema.NullOr(Schema.Int),
  })
);

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

  it.effect(
    "answer a dashboard in one call: totals against the range before, by channel and platform, followers and each day",
    () =>
      Effect.gen(function* dashboard() {
        const workspaceId = yield* freshWorkspace;
        const mastodon = yield* newChannelId;
        const linkedin = yield* newChannelId;
        const sql = yield* SqlClient.SqlClient;

        yield* Effect.gen(function* checks() {
          // This week: a post on each channel. Last week: one on Mastodon.
          const recent = yield* seedPost(
            yield* publicationOf(workspaceId, mastodon, "2044-03-09T08:00:00Z"),
            [{ at: "2044-03-09T09:07:00Z", metrics: countsOf(6, 2, 1) }]
          );

          yield* seedPost(
            yield* publicationOf(workspaceId, linkedin, "2044-03-10T08:00:00Z"),
            [
              {
                at: "2044-03-10T09:07:00Z",
                metrics: new PostMetrics({
                  clicks: Option.some(9),
                  impressions: Option.some(400),
                  likes: 3,
                  quotes: Option.none(),
                  reach: Option.some(250),
                  replies: 0,
                  reposts: 1,
                }),
              },
            ]
          );

          yield* seedPost(
            yield* publicationOf(workspaceId, mastodon, "2044-03-02T08:00:00Z"),
            [{ at: "2044-03-02T09:07:00Z", metrics: countsOf(1, 0, 0) }]
          );

          yield* sql`INSERT INTO analytics.tracked_channels (channel_id, workspace_id, platform, next_collection_at)
            VALUES (${mastodon}, ${workspaceId}, 'mastodon', '2090-01-01T00:00:00Z'),
                   (${linkedin}, ${workspaceId}, 'linkedin', '2090-01-01T00:00:00Z')`;

          yield* sql`INSERT INTO analytics.account_snapshots (channel_id, day, collected_at, followers, views, reach)
            VALUES (${mastodon}, '2044-02-29', '2044-02-29T10:37:00Z', 90, NULL, NULL),
                   (${mastodon}, '2044-03-07', '2044-03-07T10:37:00Z', 100, NULL, NULL),
                   (${mastodon}, '2044-03-09', '2044-03-09T10:37:00Z', 104, NULL, NULL),
                   (${mastodon}, '2044-03-12', '2044-03-12T10:37:00Z', 110, NULL, NULL),
                   (${linkedin}, '2044-03-10', '2044-03-10T10:37:00Z', 2000, 400, 250),
                   (${linkedin}, '2044-03-11', '2044-03-11T10:37:00Z', 2010, 30, 20)`;

          const client = yield* as(workspaceId);

          const found = yield* client.analytics.dashboard({
            params: { workspaceId },
            query: { from: "2044-03-08", timeZone: "UTC", to: "2044-03-14" },
          });

          const none = {
            clicks: null,
            impressions: null,
            quotes: null,
            reach: null,
            saves: null,
          };

          assert.deepStrictEqual(found.previous, {
            from: "2044-03-01",
            to: "2044-03-07",
          });
          assert.deepStrictEqual(found.totals, {
            clicks: 9,
            engagement: 13,
            impressions: 400,
            likes: 9,
            posts: 2,
            quotes: null,
            reach: 250,
            replies: 1,
            reposts: 3,
            saves: null,
          });
          assert.deepStrictEqual(found.previousTotals, {
            ...none,
            engagement: 1,
            likes: 1,
            posts: 1,
            replies: 0,
            reposts: 0,
          });
          // Mastodon went from 100 to 110; LinkedIn was first read in the
          // range, at 2000, and ends at 2010.
          assert.deepStrictEqual(found.followers, {
            current: 2120,
            gained: 20,
          });
          assert.deepStrictEqual(found.previousFollowers, {
            current: 100,
            gained: 10,
          });
          assert.deepStrictEqual(
            found.channels.map(
              ({ channelId, followers, platform, totals }) => ({
                channelId,
                followers,
                platform,
                posts: totals.posts,
              })
            ),
            [
              {
                channelId: linkedin,
                followers: { current: 2010, gained: 10 },
                platform: "linkedin" as const,
                posts: 1,
              },
              {
                channelId: mastodon,
                followers: { current: 110, gained: 10 },
                platform: "mastodon" as const,
                posts: 1,
              },
            ].toSorted((left, right) =>
              left.channelId.localeCompare(right.channelId)
            )
          );
          assert.deepStrictEqual(
            found.platforms.map(({ followers, platform, previousTotals }) => ({
              followers,
              platform,
              previousPosts: previousTotals.posts,
            })),
            [
              {
                followers: { current: 2010, gained: 10 },
                platform: "linkedin",
                previousPosts: 0,
              },
              {
                followers: { current: 110, gained: 10 },
                platform: "mastodon",
                previousPosts: 1,
              },
            ]
          );
          assert.deepStrictEqual(
            found.days.map(({ date, followers, likes, reach, views }) => ({
              date,
              followers,
              likes,
              reach,
              views,
            })),
            [
              {
                date: "2044-03-08",
                followers: 100,
                likes: 0,
                reach: null,
                views: null,
              },
              {
                date: "2044-03-09",
                followers: 104,
                likes: 6,
                reach: null,
                views: null,
              },
              {
                date: "2044-03-10",
                followers: 2104,
                likes: 3,
                reach: 250,
                views: 400,
              },
              {
                date: "2044-03-11",
                followers: 2114,
                likes: 0,
                reach: 20,
                views: 30,
              },
              {
                date: "2044-03-12",
                followers: 2120,
                likes: 0,
                reach: null,
                views: null,
              },
              {
                date: "2044-03-13",
                followers: 2120,
                likes: 0,
                reach: null,
                views: null,
              },
              {
                date: "2044-03-14",
                followers: 2120,
                likes: 0,
                reach: null,
                views: null,
              },
            ]
          );
          // The post people did the most with comes first.
          assert.lengthOf(found.topPosts, 2);
          assert.strictEqual(found.topPosts[0]?.targetId, recent.targetId);

          const single = yield* client.analytics.dashboard({
            params: { workspaceId },
            query: {
              from: "2044-03-08",
              timeZone: "UTC",
              to: "2044-03-14",
              topPosts: 0,
            },
          });

          assert.lengthOf(single.topPosts, 0);

          // One channel, day by day.
          const series = yield* client.analytics.channel({
            params: { channelId: linkedin, workspaceId },
            query: { from: "2044-03-09", timeZone: "UTC", to: "2044-03-11" },
          });

          assert.deepStrictEqual(
            {
              followers: series.followers,
              platform: series.platform,
              posts: series.totals.posts,
            },
            {
              followers: { current: 2010, gained: 10 },
              platform: "linkedin",
              posts: 1,
            }
          );
          assert.deepStrictEqual(
            series.days.map(({ date, followers, likes, views }) => ({
              date,
              followers,
              likes,
              views,
            })),
            [
              { date: "2044-03-09", followers: null, likes: 0, views: null },
              { date: "2044-03-10", followers: 2000, likes: 3, views: 400 },
              { date: "2044-03-11", followers: 2010, likes: 0, views: 30 },
            ]
          );

          // Another workspace's member reads nothing of this channel.
          const other = yield* as(yield* freshWorkspace);

          const foreign = yield* other.analytics.channel({
            params: { channelId: linkedin, workspaceId },
            query: { from: "2044-03-09", timeZone: "UTC", to: "2044-03-11" },
          });

          assert.deepStrictEqual(
            [foreign.platform, foreign.followers, foreign.totals.posts],
            [null, { current: null, gained: null }, 0]
          );

          // The same numbers as files.
          const postsCsv = yield* exported(client, workspaceId, {
            from: "2044-03-08",
            kind: "posts",
            timeZone: "UTC",
            to: "2044-03-14",
          });

          const [header, ...lines] = postsCsv.trimEnd().split("\r\n");

          assert.strictEqual(header, exportColumns.posts.join(","));
          assert.lengthOf(lines, 2);
          assert.match(
            lines[1] ?? "",
            new RegExp(
              `^2044-03-10T08:00:00\\.000Z,[0-9a-f-]+,[0-9a-f-]+,${linkedin},linkedin,https://[^,]+,3,1,0,,400,9,250,,2044-03-10T09:07:00\\.000Z$`,
              "u"
            )
          );

          const accountsJson = yield* exported(client, workspaceId, {
            format: "json",
            from: "2044-03-08",
            kind: "accounts",
            timeZone: "UTC",
            to: "2044-03-14",
          });

          const rows = accountsJson
            .trimEnd()
            .split("\n")
            .map((line) => Schema.decodeUnknownSync(AccountRowSchema)(line));

          assert.lengthOf(rows, 4);
          assert.deepStrictEqual(
            rows.find(
              (row) => row.channelId === linkedin && row.date === "2044-03-11"
            ),
            {
              channelId: linkedin,
              date: "2044-03-11",
              followers: 2010,
              following: null,
              platform: "linkedin",
              posts: null,
              reach: 20,
              views: 30,
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
                clicks: null,
                impressions: null,
                likes: 6,
                quotes: null,
                reach: null,
                replies: 1,
                reposts: 2,
                saves: null,
              },
              permalink: "https://mastodon.test/@alice/110000000000000001",
              publishedAt: DateTime.makeUnsafe("2043-05-04T08:00:00Z"),
              snapshots: [
                {
                  collectedAt: DateTime.makeUnsafe("2043-05-04T09:07:00Z"),
                  metrics: {
                    clicks: null,
                    impressions: null,
                    likes: 2,
                    quotes: null,
                    reach: null,
                    replies: 0,
                    reposts: 1,
                    saves: null,
                  },
                },
                {
                  collectedAt: DateTime.makeUnsafe("2043-05-05T09:07:00Z"),
                  metrics: {
                    clicks: null,
                    impressions: null,
                    likes: 6,
                    quotes: null,
                    reach: null,
                    replies: 1,
                    reposts: 2,
                    saves: null,
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

// On the real clock: "today" is the server's.
layer(ApiTest, { excludeTestServices: true })(
  "the analytics endpoints, today",
  (it) => {
    it.effect("take the last 7, 30 or 90 days ending today in the zone", () =>
      Effect.gen(function* periods() {
        const workspaceId = yield* freshWorkspace;
        const client = yield* as(workspaceId);
        const params = { workspaceId };

        const week = yield* client.analytics.dashboard({
          params,
          query: { days: 7, timeZone: "Pacific/Auckland" },
        });

        const quarter = yield* client.analytics.dashboard({
          params,
          query: { days: 90, timeZone: "Pacific/Auckland" },
        });

        assert.lengthOf(week.days, 7);
        assert.lengthOf(quarter.days, 90);
        assert.strictEqual(week.to, quarter.to);

        const today = localDateOf(
          yield* DateTime.now,
          TimeZoneIdSchema.make("Pacific/Auckland")
        );

        assert.deepStrictEqual(
          [week.from, week.to, quarter.from],
          [
            dayView(addDays(today, -6)),
            dayView(today),
            dayView(addDays(today, -89)),
          ]
        );

        // Both ways of naming a range, or neither, is no range.
        const both = yield* client.analytics
          .dashboard({
            params,
            query: {
              days: 7,
              from: "2044-03-08",
              timeZone: "UTC",
              to: "2044-03-14",
            },
          })
          .pipe(Effect.flip);

        const neither = yield* client.analytics
          .dashboard({ params, query: { timeZone: "UTC" } })
          .pipe(Effect.flip);

        const half = yield* client.analytics
          .channel({
            params: { channelId: "not-a-channel", workspaceId },
            query: { from: "2044-03-08", timeZone: "UTC" },
          })
          .pipe(Effect.flip);

        assert.instanceOf(both, InvalidDateRange);
        assert.instanceOf(neither, InvalidDateRange);
        assert.instanceOf(half, InvalidDateRange);

        const denied = yield* as(workspaceId, []);

        const refusals = yield* Effect.all([
          denied.analytics
            .dashboard({ params, query: { days: 7, timeZone: "UTC" } })
            .pipe(Effect.flip),
          denied.analytics
            .channel({
              params: { channelId: "x", workspaceId },
              query: { days: 7, timeZone: "UTC" },
            })
            .pipe(Effect.flip),
          denied.analytics
            .export({
              params,
              query: { days: 7, kind: "posts", timeZone: "UTC" },
            })
            .pipe(Effect.flip),
        ]);

        for (const refusal of refusals) {
          assert.instanceOf(refusal, Forbidden);
        }
      })
    );
  }
);
