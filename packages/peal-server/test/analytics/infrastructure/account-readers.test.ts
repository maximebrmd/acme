import { assert, describe, it } from "@effect/vitest";
import { DateTime, Effect, Layer, Option } from "effect";

import { ChannelUnreadable } from "#analytics/application/channel-unreadable.ts";
import { MetricsReader } from "#analytics/application/metrics-reader.ts";
import {
  AccountCounters,
  UtcDaySchema,
  utcDayOf,
} from "#analytics/domain/account-metrics.ts";
import type { ChannelAccount } from "#channels/application/channel-access.ts";
import { ChannelIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import { AccessLog, channelAccessOf } from "#test/analytics/access-log.ts";
import { paidReadsOf } from "#test/analytics/fakes/memory-paid-reads.ts";
import { readersWith } from "#test/analytics/support.ts";
import {
  empty,
  headerOf,
  json,
  platformServer,
  rawJson,
} from "#test/publishing/fakes/platform-server.ts";
import type {
  PlatformAnswer,
  PlatformRequest,
} from "#test/publishing/fakes/platform-server.ts";

// Each platform's account reader against a fake of the one or two calls
// it makes.

const channelId = ChannelIdSchema.make("01900000-0000-7000-8000-0000000000d1");

const workspaceId = WorkspaceIdSchema.make(
  "5b0f7f8e-2c1d-4a53-9e0a-7f1f6f3f0a02"
);

const accountOf = (
  platform: ChannelAccount["platform"],
  accountId: string,
  scopes: readonly string[] = [],
  connection: ChannelAccount["connection"] = Option.none()
): ChannelAccount => ({ accountId, channelId, connection, platform, scopes });

const bearer = (request: PlatformRequest) => headerOf(request, "authorization");

type Hosts = Parameters<typeof readersWith>[0];

const reading = (
  hosts: Hosts,
  owner: ChannelAccount,
  tokens: readonly string[] = ["token-synthetic-1"]
) =>
  Effect.gen(function* read() {
    const found = yield* MetricsReader.use((reader) =>
      reader.account({ channelId, workspaceId })
    ).pipe(Effect.result);

    return { found, handed: yield* AccessLog.use((log) => log.handed) };
  }).pipe(
    Effect.provide(
      readersWith(hosts).pipe(
        Layer.provideMerge(channelAccessOf(owner, tokens))
      )
    )
  );

const counters = (
  followers: number | undefined,
  following?: number,
  posts?: number
) =>
  new AccountCounters({
    followers: Option.fromUndefinedOr(followers),
    following: Option.fromUndefinedOr(following),
    posts: Option.fromUndefinedOr(posts),
  });

type Read = Effect.Success<ReturnType<typeof reading>>["found"];

const successOf = (result: Read) =>
  result._tag === "Success" ? result.success : undefined;

const failureOf = (result: Read) =>
  result._tag === "Failure" ? result.failure : undefined;

const serving = (answer: (request: PlatformRequest) => PlatformAnswer) =>
  platformServer(answer);

describe("reading an account's numbers", () => {
  it.live("Mastodon: the public account, without a token", () =>
    Effect.gen(function* mastodon() {
      const server = yield* serving((request) =>
        request.path === "/api/v1/accounts/109000000000000001"
          ? json({
              followers_count: 320,
              following_count: 41,
              id: "109000000000000001",
              statuses_count: 77,
            })
          : empty(404)
      );

      const { host } = new URL(server.url);

      const { found, handed } = yield* reading(
        {},
        accountOf("mastodon", `109000000000000001@${host}`, ["profile"])
      );

      assert.deepStrictEqual(successOf(found), {
        counters: counters(320, 41, 77),
        days: [],
      });
      assert.deepStrictEqual(handed, []);
      assert.deepStrictEqual(server.requests().map(bearer), [""]);
    }).pipe(Effect.scoped)
  );

  it.live("Bluesky: the profile on the public AppView", () =>
    Effect.gen(function* bluesky() {
      const server = yield* serving((request) =>
        request.path === "/xrpc/app.bsky.actor.getProfile" &&
        request.query.get("actor") === "did:plc:synthetic0000000000000001"
          ? json({
              did: "did:plc:synthetic0000000000000001",
              followersCount: 1200,
              followsCount: 300,
              handle: "peal.example",
              postsCount: 45,
            })
          : empty(400)
      );

      const { found } = yield* reading(
        { appView: server.url },
        accountOf("bluesky", "did:plc:synthetic0000000000000001")
      );

      assert.deepStrictEqual(successOf(found), {
        counters: counters(1200, 300, 45),
        days: [],
      });
    }).pipe(Effect.scoped)
  );

  it.live(
    "YouTube: the channel's statistics, and no subscribers when the owner hides them",
    () =>
      Effect.gen(function* youtube() {
        let hidden = false;

        const server = yield* serving((request) => {
          if (bearer(request) !== "Bearer token-synthetic-1") {
            return json({ error: { code: 401 } }, 401);
          }

          return json({
            items: [
              {
                id: request.query.get("id"),
                statistics: {
                  hiddenSubscriberCount: hidden,
                  subscriberCount: "15300",
                  videoCount: "212",
                  viewCount: "9000000000",
                },
              },
            ],
          });
        });

        const owner = accountOf("youtube", "UCsynthetic0000000000001", [
          "https://www.googleapis.com/auth/youtube.readonly",
        ]);

        const shown = yield* reading({ youtubeApi: server.url }, owner, [
          "token-expired",
          "token-synthetic-1",
        ]);

        hidden = true;

        const kept = yield* reading({ youtubeApi: server.url }, owner);

        assert.deepStrictEqual(successOf(shown.found), {
          counters: counters(15_300, undefined, 212),
          days: [],
        });
        // Google refused the first token: it was renewed once.
        assert.deepStrictEqual(shown.handed, [
          "token-expired",
          "token-synthetic-1",
        ]);
        assert.deepStrictEqual(successOf(kept.found), {
          counters: counters(undefined, undefined, 212),
          days: [],
        });
        assert.deepStrictEqual(
          server.requests().map(({ path, query }) => [path, query.get("part")]),
          [
            ["/youtube/v3/channels", "statistics"],
            ["/youtube/v3/channels", "statistics"],
            ["/youtube/v3/channels", "statistics"],
          ]
        );
      }).pipe(Effect.scoped)
  );

  it.live("Instagram and Facebook Pages: the account's own fields", () =>
    Effect.gen(function* meta() {
      const server = yield* serving((request) => {
        if (request.path === "/v27.0/17841400000000077") {
          return json({
            followers_count: 5400,
            follows_count: 120,
            id: "17841400000000077",
            media_count: 310,
          });
        }

        if (request.path === "/v27.0/104000000000001") {
          return json({ fan_count: 800, followers_count: 950, id: "1" });
        }

        return json({ error: { code: 100, message: "synthetic" } }, 400);
      });

      const instagram = yield* reading(
        { metaGraph: server.url },
        accountOf(
          "instagram",
          "17841400000000077",
          ["instagram_business_basic"],
          Option.some("instagramLogin")
        )
      );

      const page = yield* reading(
        { metaGraph: server.url },
        accountOf("facebook", "104000000000001", ["pages_read_engagement"])
      );

      const gone = yield* reading(
        { metaGraph: server.url },
        accountOf("facebook", "104000000000009", ["pages_read_engagement"])
      );

      assert.deepStrictEqual(successOf(instagram.found), {
        counters: counters(5400, 120, 310),
        days: [],
      });
      assert.deepStrictEqual(successOf(page.found), {
        counters: counters(950),
        days: [],
      });
      // A refusal of Meta's never marks the channel: it waits a day.
      assert.deepStrictEqual(
        failureOf(gone.found),
        new ChannelUnreadable({ reason: "paused" })
      );
      assert.deepStrictEqual(
        server.requests().map(({ query }) => query.get("fields")),
        [
          "followers_count,follows_count,media_count",
          "followers_count,fan_count",
          "followers_count,fan_count",
        ]
      );
    }).pipe(Effect.scoped)
  );

  it.live(
    "Threads and TikTok: only for accounts that granted the scope their numbers need",
    () =>
      Effect.gen(function* seams() {
        const server = yield* serving((request) => {
          if (request.path === "/v1.0/27000000000000001/threads_insights") {
            return json({
              data: [
                {
                  name: "followers_count",
                  period: "day",
                  total_value: { value: 640 },
                },
              ],
            });
          }

          if (request.path === "/v2/user/info/") {
            return json({
              data: {
                user: {
                  follower_count: 88_000,
                  following_count: 12,
                  likes_count: 400_000,
                  video_count: 96,
                },
              },
              error: { code: "ok", log_id: "synthetic", message: "" },
            });
          }

          return empty(404);
        });

        const hosts = { metaGraph: server.url, tiktokApi: server.url };

        const threads = yield* reading(
          hosts,
          accountOf("threads", "27000000000000001", [
            "threads_basic",
            "threads_manage_insights",
          ])
        );

        const tiktok = yield* reading(
          hosts,
          accountOf("tiktok", "-000synthetic-open-id-0001", [
            "user.info.basic",
            "user.info.stats",
          ])
        );

        const asked = server.requests().length;

        const withoutThreads = yield* reading(
          hosts,
          accountOf("threads", "27000000000000001", ["threads_basic"])
        );

        const withoutTikTok = yield* reading(
          hosts,
          accountOf("tiktok", "-000synthetic-open-id-0001", ["user.info.basic"])
        );

        assert.deepStrictEqual(successOf(threads.found), {
          counters: counters(640),
          days: [],
        });
        assert.deepStrictEqual(successOf(tiktok.found), {
          counters: counters(88_000, 12, 96),
          days: [],
        });
        assert.deepStrictEqual(
          [failureOf(withoutThreads.found), failureOf(withoutTikTok.found)],
          [
            new ChannelUnreadable({ reason: "unsupported" }),
            new ChannelUnreadable({ reason: "unsupported" }),
          ]
        );
        assert.lengthOf(server.requests(), asked);
        assert.strictEqual(
          server.requests()[1]?.query.get("fields"),
          "follower_count,following_count,video_count"
        );
      }).pipe(Effect.scoped)
  );

  it.live(
    "Pinterest: the account, and the impressions of the days Pinterest has finished counting",
    () =>
      Effect.gen(function* pinterest() {
        const today = yield* DateTime.now;

        const dayBefore = (days: number) =>
          utcDayOf(DateTime.subtract(today, { days }));

        const server = yield* serving((request) => {
          if (bearer(request) !== "Bearer token-synthetic-1") {
            return json({ code: 2, message: "Authentication failed." }, 401);
          }

          if (request.path === "/v5/user_account") {
            return json({
              follower_count: 2100,
              following_count: 35,
              monthly_views: 480_000,
              pin_count: 640,
              username: "synthetic",
            });
          }

          return json({
            all: {
              daily_metrics: [
                {
                  data_status: "READY",
                  date: dayBefore(3),
                  metrics: { IMPRESSION: 1500 },
                },
                {
                  data_status: "READY",
                  date: dayBefore(2),
                  metrics: { IMPRESSION: 1720 },
                },
                {
                  data_status: "PROCESSING",
                  date: dayBefore(1),
                  metrics: { IMPRESSION: 12 },
                },
              ],
              summary_metrics: { IMPRESSION: 3232 },
            },
          });
        });

        const { found } = yield* reading(
          { pinterestApi: server.url },
          accountOf("pinterest", "synthetic-pinterest-1", [
            "user_accounts:read",
          ])
        );

        assert.deepStrictEqual(successOf(found), {
          counters: counters(2100, 35, 640),
          days: [
            {
              day: UtcDaySchema.make(dayBefore(3)),
              reach: Option.none(),
              views: Option.some(1500),
            },
            {
              day: UtcDaySchema.make(dayBefore(2)),
              reach: Option.none(),
              views: Option.some(1720),
            },
          ],
        });

        const [, analytics] = server.requests();

        assert.strictEqual(analytics?.path, "/v5/user_account/analytics");
        assert.strictEqual(analytics?.query.get("metric_types"), "IMPRESSION");
        assert.strictEqual(analytics?.query.get("start_date"), dayBefore(3));
        assert.strictEqual(analytics?.query.get("end_date"), dayBefore(1));
      }).pipe(Effect.scoped)
  );

  it.live(
    "LinkedIn pages: the followers, and each finished day's impressions; a profile has none",
    () =>
      Effect.gen(function* linkedin() {
        const dayStart = DateTime.toEpochMillis(
          DateTime.makeUnsafe("2026-11-08T00:00:00Z")
        );

        const server = yield* serving((request) => {
          if (bearer(request) !== "Bearer token-synthetic-1") {
            return empty(401);
          }

          if (request.path.startsWith("/rest/networkSizes/")) {
            return json({ firstDegreeSize: 219_145 });
          }

          return json({
            elements: [
              {
                timeRange: { end: dayStart + 86_400_000, start: dayStart },
                totalShareStatistics: {
                  impressionCount: 900,
                  uniqueImpressionsCount: 610,
                },
              },
            ],
          });
        });

        const page = yield* reading(
          { linkedinApi: server.url },
          accountOf(
            "linkedin",
            "urn:li:organization:5550001",
            ["rw_organization_admin", "w_organization_social"],
            Option.some("linkedinPage")
          )
        );

        const profile = yield* reading(
          { linkedinApi: server.url },
          accountOf(
            "linkedin",
            "urn:li:person:synthetic",
            ["w_member_social"],
            Option.some("linkedinProfile")
          )
        );

        assert.deepStrictEqual(successOf(page.found), {
          counters: counters(219_145),
          days: [
            {
              day: UtcDaySchema.make("2026-11-08"),
              reach: Option.some(610),
              views: Option.some(900),
            },
          ],
        });
        assert.deepStrictEqual(
          failureOf(profile.found),
          new ChannelUnreadable({ reason: "unsupported" })
        );

        const [size, statistics] = server.requests();

        assert.strictEqual(
          size?.path,
          "/rest/networkSizes/urn:li:organization:5550001"
        );
        assert.strictEqual(
          size?.query.get("edgeType"),
          "COMPANY_FOLLOWED_BY_MEMBER"
        );
        assert.strictEqual(
          size === undefined ? "" : headerOf(size, "linkedin-version"),
          "202610"
        );
        assert.match(
          statistics?.search ?? "",
          /^q=organizationalEntity&organizationalEntity=urn%3Ali%3Aorganization%3A5550001&timeIntervals=\(timeRange:\(start:\d+,end:\d+\),timeGranularityType:DAY\)$/u
        );
      }).pipe(Effect.scoped)
  );

  it.live(
    "X: only where the operator turned its reads on, counted against the workspace's allowance",
    () =>
      Effect.gen(function* x() {
        const server = yield* serving((request) =>
          bearer(request) === "Bearer token-synthetic-1"
            ? json({
                data: {
                  id: "1460000000000000001",
                  public_metrics: {
                    followers_count: 7100,
                    following_count: 220,
                    listed_count: 3,
                    post_count: 1880,
                  },
                },
              })
            : empty(401)
        );

        const owner = accountOf("x", "1460000000000000001", [
          "tweet.read",
          "users.read",
        ]);

        const on = yield* reading({ xApi: server.url, xReads: true }, owner);

        const off = yield* reading({ xApi: server.url, xReads: false }, owner);

        const spent = yield* reading(
          { paidReads: paidReadsOf(0), xApi: server.url, xReads: true },
          owner
        );

        assert.deepStrictEqual(successOf(on.found), {
          counters: counters(7100, 220, 1880),
          days: [],
        });
        assert.deepStrictEqual(
          failureOf(off.found),
          new ChannelUnreadable({ reason: "unsupported" })
        );
        // Nothing left today: asked again at the next run.
        assert.deepStrictEqual(
          failureOf(spent.found),
          new PlatformUnavailable()
        );
        assert.deepStrictEqual(
          server
            .requests()
            .map(({ path, query }) => [path, query.get("user.fields")]),
          [["/2/users/me", "public_metrics"]]
        );
      }).pipe(Effect.scoped)
  );

  it.live(
    "puts the read off when a platform is down or asks to slow down, and reads nothing on Google Business Profile",
    () =>
      Effect.gen(function* failures() {
        const answers = [empty(503), empty(429), rawJson("not json")];
        const server = yield* serving(() => answers.shift() ?? empty(500));

        const owner = accountOf("bluesky", "did:plc:synthetic0000000000000001");

        for (const _ of [1, 2, 3]) {
          const { found } = yield* reading({ appView: server.url }, owner);

          assert.deepStrictEqual(failureOf(found), new PlatformUnavailable());
        }

        const business = yield* reading(
          {},
          accountOf("googleBusiness", "locations/1")
        );

        assert.deepStrictEqual(
          failureOf(business.found),
          new ChannelUnreadable({ reason: "unsupported" })
        );
      }).pipe(Effect.scoped)
  );
});
