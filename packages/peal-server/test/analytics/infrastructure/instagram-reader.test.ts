import { createHmac } from "node:crypto";

import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer, Option } from "effect";

import { ChannelUnreadable } from "#analytics/application/channel-unreadable.ts";
import { MetricsReader } from "#analytics/application/metrics-reader.ts";
import type { PostToRead } from "#analytics/application/metrics-reader.ts";
import { PostMetrics } from "#analytics/domain/post-metrics.ts";
import type { ChannelAccount } from "#channels/application/channel-access.ts";
import { ChannelIdSchema, PostTargetIdSchema } from "#shared/domain/ids.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import { AccessLog, channelAccessOf } from "#test/analytics/access-log.ts";
import { readersWith } from "#test/analytics/support.ts";
import {
  json,
  platformServer,
} from "#test/publishing/fakes/platform-server.ts";
import type { PlatformAnswer } from "#test/publishing/fakes/platform-server.ts";

const channelId = ChannelIdSchema.make("01900000-0000-7000-8000-0000000000c2");

const metaAppSecret = "synthetic-meta-secret-for-insights";

const direct: ChannelAccount = {
  accountId: "17841400000000077",
  channelId,
  connection: Option.some("instagramLogin"),
  platform: "instagram",
  scopes: [
    "instagram_business_basic",
    "instagram_business_content_publish",
    "instagram_business_manage_insights",
  ],
};

const viaPage: ChannelAccount = {
  ...direct,
  connection: Option.some("facebookLogin"),
  scopes: [
    "instagram_basic",
    "instagram_content_publish",
    "instagram_manage_insights",
    "pages_show_list",
    "pages_read_engagement",
  ],
};

const toRead = (platformPostId: string, index: number): PostToRead => ({
  platformPostId: PlatformPostIdSchema.make(platformPostId),
  targetId: PostTargetIdSchema.make(
    `01900000-0000-7000-8000-${String(index + 1).padStart(12, "0")}`
  ),
});

const graphError = (code: number, status = 400): PlatformAnswer =>
  json(
    { error: { code, message: "synthetic", type: "OAuthException" } },
    status
  );

const insightsPath = /^\/v27\.0\/(?<id>\d+)\/insights$/u;

// The media insights endpoint over the posts given, by id: their counts in
// `values` or `total_value`, as Meta writes either. It takes `token`, with
// the main app's proof when `proved`, and answers `scripted` first.
const fakeInsights = (options: {
  readonly posts: ReadonlyMap<string, number>;
  readonly proved: boolean;
  readonly scripted?: PlatformAnswer[];
  readonly token: string;
}) =>
  platformServer((request) => {
    const answer = options.scripted?.shift();

    if (answer !== undefined) {
      return answer;
    }

    const token = request.query.get("access_token") ?? "";

    const proof = options.proved
      ? createHmac("sha256", metaAppSecret).update(token).digest("hex")
      : null;

    if (
      token !== options.token ||
      request.query.get("appsecret_proof") !== proof
    ) {
      return graphError(190, 401);
    }

    const id = insightsPath.exec(request.path)?.groups?.["id"] ?? "";
    const likes = options.posts.get(id);

    if (likes === undefined) {
      return graphError(100);
    }

    return json({
      data: [
        { name: "views", period: "lifetime", values: [{ value: 420 }] },
        { name: "likes", period: "lifetime", values: [{ value: likes }] },
        { name: "comments", period: "lifetime", total_value: { value: 3 } },
        { name: "shares", period: "lifetime", values: [{ value: 2 }] },
      ],
    });
  });

const reading = (
  url: string,
  posts: readonly PostToRead[],
  owner: ChannelAccount,
  tokens: readonly string[]
) =>
  Effect.gen(function* read() {
    const batch = yield* MetricsReader.use((reader) =>
      reader.read({ channelId, posts })
    ).pipe(Effect.result);

    return { batch, handed: yield* AccessLog.use((log) => log.handed) };
  }).pipe(
    Effect.provide(
      readersWith({ metaAppSecret, metaGraph: url }).pipe(
        Layer.provideMerge(channelAccessOf(owner, tokens))
      )
    )
  );

const counted = (likes: number) =>
  new PostMetrics({
    impressions: Option.some(420),
    likes,
    quotes: Option.none(),
    replies: 3,
    reposts: 2,
  });

describe("reading counts on Instagram", () => {
  it.live(
    "reads an Instagram Login account's posts with its own token, unproved",
    () =>
      Effect.gen(function* reads() {
        const server = yield* fakeInsights({
          posts: new Map([
            ["18000000000000001", 7],
            ["18000000000000002", 9],
          ]),
          proved: false,
          token: "ig-long-1",
        });

        const posts = ["18000000000000001", "18000000000000002"].map(toRead);

        const { batch, handed } = yield* reading(server.url, posts, direct, [
          "ig-long-1",
        ]);

        assert.deepStrictEqual(batch._tag === "Success" && batch.success, {
          halted: false,
          readings: [
            {
              _tag: "counted",
              metrics: counted(7),
              targetId: posts[0]?.targetId ?? PostTargetIdSchema.make(""),
            },
            {
              _tag: "counted",
              metrics: counted(9),
              targetId: posts[1]?.targetId ?? PostTargetIdSchema.make(""),
            },
          ],
        });
        assert.deepStrictEqual(handed, ["ig-long-1"]);
        assert.deepStrictEqual(
          server.requests().map(({ query }) => query.get("metric")),
          ["views,likes,comments,shares", "views,likes,comments,shares"]
        );
      }).pipe(Effect.scoped)
  );

  it.live("reads a Page's account with the Page's token and its proof", () =>
    Effect.gen(function* page() {
      const server = yield* fakeInsights({
        posts: new Map([["18000000000000003", 4]]),
        proved: true,
        token: "page-token-1",
      });

      const posts = [toRead("18000000000000003", 0)];

      const { batch } = yield* reading(server.url, posts, viaPage, [
        "page-token-1",
      ]);

      assert.strictEqual(batch._tag, "Success");
      assert.strictEqual(
        batch._tag === "Success" ? batch.success.readings[0]?._tag : "",
        "counted"
      );
    }).pipe(Effect.scoped)
  );

  it.live("says a post Meta does not know is missing, and reads on", () =>
    Effect.gen(function* missing() {
      const server = yield* fakeInsights({
        posts: new Map([["18000000000000005", 1]]),
        proved: false,
        token: "ig-long-1",
      });

      const posts = ["18000000000000004", "18000000000000005"].map(toRead);

      const { batch } = yield* reading(server.url, posts, direct, [
        "ig-long-1",
      ]);

      const success = batch._tag === "Success" ? batch.success : undefined;

      assert.strictEqual(success?.halted, false);
      assert.deepStrictEqual(
        success?.readings.map(({ _tag }) => _tag),
        ["missing", "counted"]
      );
    }).pipe(Effect.scoped)
  );

  it.live("halts at a rate limit, and leaves the rest for the next run", () =>
    Effect.gen(function* limited() {
      const server = yield* fakeInsights({
        posts: new Map([
          ["18000000000000006", 1],
          ["18000000000000007", 2],
        ]),
        proved: false,
        scripted: [json({}, 200), graphError(4)],
        token: "ig-long-1",
      });

      const posts = ["18000000000000006", "18000000000000007"].map(toRead);

      const { batch } = yield* reading(server.url, posts, direct, [
        "ig-long-1",
      ]);

      // The first answer is unreadable: failed, and the read halts there.
      assert.deepStrictEqual(batch._tag === "Success" && batch.success, {
        halted: true,
        readings: [
          {
            _tag: "failed",
            targetId: posts[0]?.targetId ?? PostTargetIdSchema.make(""),
          },
        ],
      });
      assert.lengthOf(server.requests(), 1);
    }).pipe(Effect.scoped)
  );

  it.live(
    "never marks the channel to reconnect when insights refuse the token",
    () =>
      Effect.gen(function* refused() {
        const server = yield* fakeInsights({
          posts: new Map(),
          proved: false,
          scripted: [graphError(10, 403)],
          token: "ig-long-1",
        });

        const posts = [toRead("18000000000000008", 0)];

        const { batch, handed } = yield* reading(server.url, posts, direct, [
          "ig-long-1",
        ]);

        assert.deepStrictEqual(batch._tag === "Success" && batch.success, {
          halted: true,
          readings: [
            {
              _tag: "failed",
              targetId: posts[0]?.targetId ?? PostTargetIdSchema.make(""),
            },
          ],
        });
        // Handed once: the token was not renewed for it.
        assert.deepStrictEqual(handed, ["ig-long-1"]);
      }).pipe(Effect.scoped)
  );

  it.live("reads nothing from an account that declined insights", () =>
    Effect.gen(function* declined() {
      const server = yield* fakeInsights({
        posts: new Map([["18000000000000009", 1]]),
        proved: false,
        token: "ig-long-1",
      });

      const { batch } = yield* reading(
        server.url,
        [toRead("18000000000000009", 0)],
        {
          ...direct,
          scopes: [
            "instagram_business_basic",
            "instagram_business_content_publish",
          ],
        },
        ["ig-long-1"]
      );

      assert.deepStrictEqual(
        batch._tag === "Failure" ? Option.some(batch.failure) : Option.none(),
        Option.some(new ChannelUnreadable({ reason: "paused" }))
      );
      assert.lengthOf(server.requests(), 0);
    }).pipe(Effect.scoped)
  );
});
