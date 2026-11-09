import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer, Option } from "effect";

import { ChannelUnreadable } from "#analytics/application/channel-unreadable.ts";
import { MetricsReader } from "#analytics/application/metrics-reader.ts";
import type {
  MetricsReadFailure,
  PostToRead,
} from "#analytics/application/metrics-reader.ts";
import { PostMetrics } from "#analytics/domain/post-metrics.ts";
import { isCounted } from "#analytics/domain/counted-platforms.ts";
import type { ChannelAccount } from "#channels/application/channel-access.ts";
import { ChannelUnusable } from "#channels/application/channel-unusable.ts";
import { ChannelIdSchema, PostTargetIdSchema } from "#shared/domain/ids.ts";
import { platforms } from "#shared/domain/platform.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import { TokenExpired } from "#shared/domain/token-expired.ts";
import { AccessLog, channelAccessOf } from "#test/analytics/access-log.ts";
import type { AccountFailure } from "#test/analytics/access-log.ts";
import { fakeAppView } from "#test/analytics/fakes/fake-app-view.ts";
import { fakeStatuses } from "#test/analytics/fakes/fake-statuses.ts";
import type { FakeStatusesOptions } from "#test/analytics/fakes/fake-statuses.ts";
import { countsOf, readersWith } from "#test/analytics/support.ts";
import { mastodonAccountId } from "#test/publishing/fakes/fake-mastodon-instance.ts";
import {
  dropped,
  empty,
  headerOf,
  json,
  platformServer,
} from "#test/publishing/fakes/platform-server.ts";

const channelId = ChannelIdSchema.make("01900000-0000-7000-8000-0000000000c1");

const toRead = (platformPostId: string, index: number): PostToRead => ({
  platformPostId: PlatformPostIdSchema.make(platformPostId),
  targetId: PostTargetIdSchema.make(
    `01900000-0000-7000-8000-${String(index + 1).padStart(12, "0")}`
  ),
});

const postsToRead = (...ids: readonly string[]) => ids.map(toRead);

// Reads `posts` through the readers, as `account` with `tokens`.
const reading = (
  posts: readonly PostToRead[],
  account: AccountFailure | ChannelAccount,
  options: {
    readonly appView?: string;
    readonly tokens?: readonly string[];
    readonly youtubeApi?: string;
  } = {}
) =>
  Effect.gen(function* read() {
    const batch = yield* MetricsReader.use((reader) =>
      reader.read({ channelId, posts })
    ).pipe(Effect.result);

    return { batch, handed: yield* AccessLog.use((log) => log.handed) };
  }).pipe(
    Effect.provide(
      readersWith({
        appView: options.appView,
        youtubeApi: options.youtubeApi,
      }).pipe(
        Layer.provideMerge(channelAccessOf(account, options.tokens ?? []))
      )
    )
  );

const failureOf = (
  outcome: Effect.Success<ReturnType<typeof reading>>["batch"]
): Option.Option<MetricsReadFailure> =>
  outcome._tag === "Failure" ? Option.some(outcome.failure) : Option.none();

// A Mastodon server and an account on it allowed to read statuses or not.
const onInstance = Effect.fn("test.onInstance")(function* onInstance(
  options: FakeStatusesOptions,
  scopes: readonly string[] = ["profile", "read:statuses", "write:statuses"]
) {
  const instance = yield* fakeStatuses(options);

  const account: ChannelAccount = {
    accountId: mastodonAccountId(instance.url),
    channelId,
    platform: "mastodon",
    scopes,
  };

  return { account, instance };
});

const statuses = {
  "110000000000000001": { favourites: 12, quotes: 2, reblogs: 3, replies: 4 },
  "110000000000000002": { favourites: 1, reblogs: 0, replies: 0 },
};

describe("reading counts on Mastodon", () => {
  it.live("reads with the token when the account may read statuses", () =>
    Effect.gen(function* withToken() {
      const { account, instance } = yield* onInstance({
        statuses,
        tokens: ["token-1"],
      });

      const posts = postsToRead(
        "110000000000000001",
        "110000000000000002",
        "110000000000000099"
      );

      const { batch, handed } = yield* reading(posts, account, {
        tokens: ["token-1"],
      });

      assert.deepStrictEqual(
        batch._tag === "Success" ? batch.success : undefined,
        {
          halted: false,
          readings: [
            {
              _tag: "counted",
              metrics: countsOf(12, 3, 4, 2),
              targetId: posts[0]?.targetId ?? PostTargetIdSchema.make(""),
            },
            {
              _tag: "counted",
              metrics: countsOf(1, 0, 0),
              targetId: posts[1]?.targetId ?? PostTargetIdSchema.make(""),
            },
            {
              _tag: "missing",
              targetId: posts[2]?.targetId ?? PostTargetIdSchema.make(""),
            },
          ],
        }
      );
      assert.deepStrictEqual(handed, ["token-1"]);
      assert.deepStrictEqual(
        instance
          .requests()
          .map((request) => [request.path, headerOf(request, "authorization")]),
        [
          ["/api/v1/statuses/110000000000000001", "Bearer token-1"],
          ["/api/v1/statuses/110000000000000002", "Bearer token-1"],
          ["/api/v1/statuses/110000000000000099", "Bearer token-1"],
        ]
      );
    }).pipe(Effect.scoped)
  );

  it.live("reads without a token when the account may only post", () =>
    Effect.gen(function* withoutToken() {
      const { account, instance } = yield* onInstance({ statuses }, [
        "profile",
        "write:statuses",
        "write:media",
      ]);

      const { batch, handed } = yield* reading(
        postsToRead("110000000000000001"),
        account,
        { tokens: ["token-1"] }
      );

      assert.strictEqual(batch._tag, "Success");
      assert.deepStrictEqual(handed, []);
      assert.deepStrictEqual(
        instance
          .requests()
          .map((request) => headerOf(request, "authorization")),
        [""]
      );
    }).pipe(Effect.scoped)
  );

  it.live("renews a refused token, and pauses when that fails too", () =>
    Effect.gen(function* refused() {
      const { account } = yield* onInstance({
        statuses,
        tokens: ["token-2"],
      });

      const posts = postsToRead("110000000000000001");

      const renewed = yield* reading(posts, account, {
        tokens: ["token-1", "token-2"],
      });

      assert.strictEqual(renewed.batch._tag, "Success");
      assert.deepStrictEqual(renewed.handed, ["token-1", "token-2"]);

      const reconnect = yield* reading(posts, account, {
        tokens: ["token-1"],
      });

      assert.deepStrictEqual(
        failureOf(reconnect.batch),
        Option.some(new ChannelUnreadable({ reason: "paused" }))
      );
    }).pipe(Effect.scoped)
  );

  // A reconnect stops the channel's publishing: a proxy in front of the
  // server, refusing with a page of its own, must not ask for one.
  it.live(
    "keeps the token when a 401 or 403 is not Mastodon's own, and fails the status",
    () =>
      Effect.gen(function* notMastodon() {
        for (const answer of [
          empty(403),
          json("Checking your browser before accessing", 403),
          empty(401),
        ]) {
          const { account, instance } = yield* onInstance({
            statuses,
            tokens: ["token-1"],
          });

          instance.script("110000000000000001", [answer]);

          const posts = postsToRead("110000000000000001");

          const { batch, handed } = yield* reading(posts, account, {
            tokens: ["token-1", "token-2"],
          });

          assert.deepStrictEqual(handed, ["token-1"]);
          assert.deepStrictEqual(
            batch._tag === "Success" ? batch.success : undefined,
            {
              halted: true,
              readings: [
                {
                  _tag: "failed",
                  targetId: posts[0]?.targetId ?? PostTargetIdSchema.make(""),
                },
              ],
            }
          );
        }
      }).pipe(Effect.scoped)
  );

  it.live("pauses on a server that reads nothing signed out", () =>
    Effect.gen(function* signedInOnly() {
      const { account } = yield* onInstance({ signedInOnly: true, statuses }, [
        "profile",
        "write:statuses",
      ]);

      const { batch } = yield* reading(
        postsToRead("110000000000000001"),
        account
      );

      assert.deepStrictEqual(
        failureOf(batch),
        Option.some(new ChannelUnreadable({ reason: "paused" }))
      );
    }).pipe(Effect.scoped)
  );

  it.live("halts when the server rate limits, leaving the status due", () =>
    Effect.gen(function* halts() {
      const { account, instance } = yield* onInstance({
        statuses,
        tokens: ["token-1"],
      });

      instance.script("110000000000000002", [
        json({ error: "Too many requests" }, 429),
      ]);

      const { batch } = yield* reading(
        postsToRead("110000000000000001", "110000000000000002"),
        account,
        { tokens: ["token-1"] }
      );

      assert.deepStrictEqual(
        batch._tag === "Success"
          ? [
              batch.success.halted,
              batch.success.readings.map(({ _tag }) => _tag),
            ]
          : undefined,
        [true, ["counted"]]
      );
    }).pipe(Effect.scoped)
  );

  // A status its server cannot show, every time it is asked, would
  // otherwise stay the channel's first due and halt every read.
  it.live(
    "marks a status failed and halts when the server fails, drops or answers what Acme cannot read",
    () =>
      Effect.gen(function* fails() {
        // More favourites than any post has, as no Mastodon server counts.
        const tooMany = json({
          favourites_count: 2_147_483_648,
          id: "110000000000000002",
          reblogs_count: 0,
          replies_count: 0,
        });

        for (const answer of [
          empty(503),
          dropped,
          json({ error: "Unprocessable" }, 422),
          tooMany,
        ]) {
          const { account, instance } = yield* onInstance({
            statuses,
            tokens: ["token-1"],
          });

          instance.script("110000000000000002", [answer]);

          const posts = postsToRead(
            "110000000000000001",
            "110000000000000002",
            "110000000000000001"
          );

          const { batch } = yield* reading(posts, account, {
            tokens: ["token-1"],
          });

          assert.deepStrictEqual(
            batch._tag === "Success"
              ? [batch.success.halted, batch.success.readings.slice(1)]
              : undefined,
            [
              true,
              [
                {
                  _tag: "failed",
                  targetId: posts[1]?.targetId ?? PostTargetIdSchema.make(""),
                },
              ],
            ]
          );
          assert.lengthOf(instance.requests(), 2);
        }
      }).pipe(Effect.scoped)
  );

  it.live("leaves the account requests to post with", () =>
    Effect.gen(function* budget() {
      // 61 left before the first read, 60 after it: the reserve.
      const { account, instance } = yield* onInstance({
        remaining: 61,
        statuses,
        tokens: ["token-1"],
      });

      const { batch } = yield* reading(
        postsToRead("110000000000000001", "110000000000000002"),
        account,
        { tokens: ["token-1"] }
      );

      assert.deepStrictEqual(
        batch._tag === "Success"
          ? [batch.success.halted, batch.success.readings.length]
          : undefined,
        [true, 1]
      );
      assert.lengthOf(instance.requests(), 1);
    }).pipe(Effect.scoped)
  );
});

describe("reading counts on Bluesky", () => {
  const did = "did:plc:4k3jtrsp4sxbikbhr5b5yoch";
  const uri = (rkey: number) => `at://${did}/app.bsky.feed.post/3l${rkey}`;

  const account: ChannelAccount = {
    accountId: did,
    channelId,
    platform: "bluesky",
    scopes: ["atproto", "repo:app.bsky.feed.post?action=create&action=delete"],
  };

  it.live("reads the public AppView, 25 posts to a call", () =>
    Effect.gen(function* appView() {
      const known = Object.fromEntries(
        Array.from({ length: 29 }, (_, index) => [
          uri(index),
          index === 0
            ? { likeCount: 7, quoteCount: 1, replyCount: 2, repostCount: 3 }
            : { likeCount: index },
        ])
      );

      const server = yield* fakeAppView(known);

      // 29 known posts, and one the AppView does not have.
      const posts = postsToRead(
        ...Array.from({ length: 30 }, (_, index) => uri(index))
      );

      const { batch, handed } = yield* reading(posts, account, {
        appView: server.url,
      });

      const success = batch._tag === "Success" ? batch.success : undefined;

      assert.strictEqual(success?.halted, false);
      assert.lengthOf(success?.readings ?? [], 30);
      assert.deepStrictEqual(success?.readings[0], {
        _tag: "counted",
        metrics: countsOf(7, 3, 2, 1),
        targetId: posts[0]?.targetId ?? PostTargetIdSchema.make(""),
      });
      assert.deepStrictEqual(success?.readings[1], {
        _tag: "counted",
        metrics: countsOf(1, 0, 0, 0),
        targetId: posts[1]?.targetId ?? PostTargetIdSchema.make(""),
      });
      assert.deepStrictEqual(success?.readings[29], {
        _tag: "missing",
        targetId: posts[29]?.targetId ?? PostTargetIdSchema.make(""),
      });
      assert.deepStrictEqual(
        server.requests().map((request) => request.query.getAll("uris").length),
        [25, 5]
      );
      // The AppView is public: no session goes with the calls.
      assert.deepStrictEqual(handed, []);
      assert.isTrue(
        server
          .requests()
          .every(
            (request) =>
              headerOf(request, "authorization") === "" &&
              headerOf(request, "dpop") === ""
          )
      );
    }).pipe(Effect.scoped)
  );

  it.live("halts when the AppView rate limits, and skips what it refuses", () =>
    Effect.gen(function* refusals() {
      const server = yield* fakeAppView({ [uri(1)]: { likeCount: 1 } });
      const posts = postsToRead(uri(1));

      server.script([json({ error: "RateLimitExceeded" }, 429)]);

      const limited = yield* reading(posts, account, { appView: server.url });

      assert.deepStrictEqual(
        limited.batch._tag === "Success" ? limited.batch.success : undefined,
        { halted: true, readings: [] }
      );

      server.script([json({ error: "InvalidRequest" }, 400)]);

      const refused = yield* reading(posts, account, { appView: server.url });

      assert.deepStrictEqual(
        refused.batch._tag === "Success" ? refused.batch.success : undefined,
        {
          halted: false,
          readings: [
            {
              _tag: "missing",
              targetId: posts[0]?.targetId ?? PostTargetIdSchema.make(""),
            },
          ],
        }
      );
    }).pipe(Effect.scoped)
  );

  it.live(
    "marks a call's posts failed and halts when the AppView fails, drops or answers what Acme cannot read",
    () =>
      Effect.gen(function* fails() {
        const known = Object.fromEntries(
          Array.from({ length: 30 }, (_, index) => [
            uri(index),
            { likeCount: index },
          ])
        );

        const posts = postsToRead(
          ...Array.from({ length: 30 }, (_, index) => uri(index))
        );

        for (const answer of [
          empty(502),
          dropped,
          json({ posts: [{ likeCount: -1, uri: uri(25) }] }),
        ]) {
          const server = yield* fakeAppView(known);

          // The first call reads; the second, the last five, fails.
          server.script([json({ posts: [] }), answer]);

          const { batch } = yield* reading(posts, account, {
            appView: server.url,
          });

          const success = batch._tag === "Success" ? batch.success : undefined;

          assert.strictEqual(success?.halted, true);
          assert.deepStrictEqual(
            success?.readings.slice(25),
            posts.slice(25).map(({ targetId }) => ({
              _tag: "failed" as const,
              targetId,
            }))
          );
        }
      }).pipe(Effect.scoped)
  );
});

// A video's statistics, as videos.list writes them: counts as strings.
const statistics = (id: string, index: number) => ({
  id,
  statistics:
    index === 0
      ? { commentCount: "4", likeCount: "12", viewCount: "1500" }
      : { viewCount: String(index) },
});

describe("reading counts on YouTube", () => {
  const account: ChannelAccount = {
    accountId: "UCsyntheticChannel000001",
    channelId,
    platform: "youtube",
    scopes: [
      "https://www.googleapis.com/auth/youtube.upload",
      "https://www.googleapis.com/auth/youtube.readonly",
    ],
  };

  it.live("reads videos.list with the channel's token, 50 ids to a call", () =>
    Effect.gen(function* videos() {
      const server = yield* platformServer((request) => {
        const ids = (request.query.get("id") ?? "").split(",");

        return headerOf(request, "authorization") === "Bearer token-1"
          ? json({
              items: ids
                .filter((id) => id !== "synthGone")
                .map((id) => statistics(id, Number(id.slice(9)))),
            })
          : json({ error: { code: 401 } }, 401);
      });

      const ids = Array.from(
        { length: 54 },
        (_, index) => `synthVid_${String(index).padStart(2, "0")}`
      );

      const posts = postsToRead(...ids, "synthGone");

      const { batch, handed } = yield* reading(posts, account, {
        tokens: ["token-1"],
        youtubeApi: server.url,
      });

      const success = batch._tag === "Success" ? batch.success : undefined;

      assert.strictEqual(success?.halted, false);
      assert.deepStrictEqual(success?.readings[0], {
        _tag: "counted",
        metrics: new PostMetrics({
          impressions: Option.some(1500),
          likes: 12,
          quotes: Option.none(),
          replies: 4,
          reposts: 0,
        }),
        targetId: posts[0]?.targetId ?? PostTargetIdSchema.make(""),
      });
      assert.deepStrictEqual(success?.readings.at(-1), {
        _tag: "missing",
        targetId: posts.at(-1)?.targetId ?? PostTargetIdSchema.make(""),
      });
      assert.deepStrictEqual(
        server
          .requests()
          .map((request) => (request.query.get("id") ?? "").split(",").length),
        [50, 5]
      );
      assert.strictEqual(server.requests()[0]?.query.get("part"), "statistics");
      // videos.list does not take maxResults with id.
      assert.isFalse(server.requests()[0]?.query.has("maxResults"));
      assert.deepStrictEqual(handed, ["token-1"]);
    })
  );

  it.live("halts on a quota refusal, and renews a token Google refused", () =>
    Effect.gen(function* refusals() {
      let calls = 0;

      const server = yield* platformServer((request) => {
        calls += 1;

        if (calls === 1) {
          return json(
            { error: { code: 403, errors: [{ reason: "quotaExceeded" }] } },
            403
          );
        }

        return headerOf(request, "authorization") === "Bearer token-2"
          ? json({ items: [statistics("synthVid_00", 0)] })
          : json({ error: { code: 401 } }, 401);
      });

      const posts = postsToRead("synthVid_00");

      const limited = yield* reading(posts, account, {
        tokens: ["token-1"],
        youtubeApi: server.url,
      });

      assert.deepStrictEqual(
        limited.batch._tag === "Success" ? limited.batch.success : undefined,
        { halted: true, readings: [] }
      );

      const renewed = yield* reading(posts, account, {
        tokens: ["token-1", "token-2"],
        youtubeApi: server.url,
      });

      assert.strictEqual(
        renewed.batch._tag === "Success"
          ? renewed.batch.success.readings[0]?._tag
          : undefined,
        "counted"
      );
      assert.deepStrictEqual(renewed.handed, ["token-1", "token-2"]);
    })
  );
});

describe("reading counts on a channel", () => {
  const posts = postsToRead("110000000000000001");

  it.live("knows a channel gone, off or to reconnect", () =>
    Effect.gen(function* channels() {
      const outcomes = yield* Effect.forEach(
        [
          new ChannelUnusable({ channelId, reason: "notFound" }),
          new ChannelUnusable({ channelId, reason: "disabled" }),
          new TokenExpired(),
        ],
        (failure) =>
          reading(posts, failure).pipe(
            Effect.map(({ batch }) => failureOf(batch))
          ),
        { concurrency: 1 }
      );

      assert.deepStrictEqual(outcomes, [
        Option.some(new ChannelUnreadable({ reason: "disconnected" })),
        Option.some(new ChannelUnreadable({ reason: "paused" })),
        Option.some(new ChannelUnreadable({ reason: "paused" })),
      ]);
    })
  );

  // The platforms Acme publishes to but reads no counts on yet, which the
  // web app tells members it has no counts for.
  it.live.each(platforms.filter((platform) => !isCounted(platform)))(
    "reads nothing on %s, which it has no reader for",
    (platform) =>
      Effect.gen(function* unsupported() {
        const { batch } = yield* reading(posts, {
          accountId: `synthetic-${platform}-account`,
          channelId,
          platform,
          scopes: [],
        });

        assert.deepStrictEqual(
          failureOf(batch),
          Option.some(new ChannelUnreadable({ reason: "unsupported" }))
        );
      })
  );
});
