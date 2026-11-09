import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer, Option } from "effect";

import { ChannelUnreadable } from "#analytics/application/channel-unreadable.ts";
import { MetricsReader } from "#analytics/application/metrics-reader.ts";
import type {
  MetricsReadFailure,
  PostToRead,
} from "#analytics/application/metrics-reader.ts";
import type { ChannelAccount } from "#channels/application/channel-access.ts";
import { ChannelUnusable } from "#channels/application/channel-unusable.ts";
import { ChannelIdSchema, PostTargetIdSchema } from "#shared/domain/ids.ts";
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
  } = {}
) =>
  Effect.gen(function* read() {
    const batch = yield* MetricsReader.use((reader) =>
      reader.read({ channelId, posts })
    ).pipe(Effect.result);

    return { batch, handed: yield* AccessLog.use((log) => log.handed) };
  }).pipe(
    Effect.provide(
      readersWith(options.appView).pipe(
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

  it.live("halts when the server rate limits, fails or drops", () =>
    Effect.gen(function* halts() {
      for (const answer of [
        json({ error: "Too many requests" }, 429),
        empty(503),
        dropped,
      ]) {
        const { account, instance } = yield* onInstance({
          statuses,
          tokens: ["token-1"],
        });

        instance.script("110000000000000002", [answer]);

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

  it.live("reads nothing on a platform it has no reader for", () =>
    Effect.gen(function* unsupported() {
      const { batch } = yield* reading(posts, {
        accountId: "urn:li:person:synthetic",
        channelId,
        platform: "linkedin",
        scopes: [],
      });

      assert.deepStrictEqual(
        failureOf(batch),
        Option.some(new ChannelUnreadable({ reason: "unsupported" }))
      );
    })
  );
});
