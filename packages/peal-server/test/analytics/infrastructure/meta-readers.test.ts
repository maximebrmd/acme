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
import type {
  PlatformAnswer,
  PlatformRequest,
} from "#test/publishing/fakes/platform-server.ts";

// The readers of Facebook Pages and Threads, against a fake of Meta's
// Graph hosts.

const channelId = ChannelIdSchema.make("01900000-0000-7000-8000-0000000000c8");

const metaAppSecret = "synthetic-meta-secret-for-pages";

const page: ChannelAccount = {
  accountId: "104000000000001",
  channelId,
  connection: Option.none(),
  platform: "facebook",
  scopes: ["pages_show_list", "pages_read_engagement", "pages_manage_posts"],
};

const threads: ChannelAccount = {
  accountId: "27000000000000001",
  channelId,
  connection: Option.none(),
  platform: "threads",
  scopes: [
    "threads_basic",
    "threads_content_publish",
    "threads_manage_insights",
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

const graph = (
  answer: (request: PlatformRequest) => PlatformAnswer,
  scripted: PlatformAnswer[] = []
) => platformServer((request) => scripted.shift() ?? answer(request));

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

const targetOf = (post: PostToRead | undefined) =>
  post?.targetId ?? PostTargetIdSchema.make("");

const proofOf = (token: string) =>
  createHmac("sha256", metaAppSecret).update(token).digest("hex");

// A Page's posts: the post itself gives its shares, its reactions edge
// their total, its comments edge theirs, replies included, and, to a
// token with read_insights, its insights the views and clicks.
const fakePage = (
  posts: ReadonlySet<string>,
  scripted: PlatformAnswer[] = []
) =>
  graph((request) => {
    const token = request.query.get("access_token") ?? "";

    if (
      token !== "page-token-synthetic" ||
      request.query.get("appsecret_proof") !== proofOf(token)
    ) {
      return graphError(190, 401);
    }

    const [id = "", edge] = request.path.split("/").slice(2);

    if (!posts.has(id)) {
      return graphError(100);
    }

    if (edge === "reactions") {
      return json({ data: [], summary: { total_count: 12 } });
    }

    if (edge === "comments") {
      return request.query.get("filter") === "stream"
        ? json({ data: [], summary: { total_count: 5 } })
        : json({ data: [], summary: { total_count: 3 } });
    }

    if (edge === "insights") {
      return json({
        data: [
          {
            name: "post_media_view",
            period: "lifetime",
            values: [{ value: 640 }],
          },
          { name: "post_clicks", period: "lifetime", values: [{ value: 21 }] },
        ],
      });
    }

    return json({ id, shares: { count: 2 } });
  }, scripted);

// Threads' media insights, by post.
const fakeThreads = (
  posts: ReadonlySet<string>,
  scripted: PlatformAnswer[] = []
) =>
  graph((request) => {
    if (request.query.get("access_token") !== "threads-token-synthetic") {
      return graphError(190, 401);
    }

    const id = request.path.split("/")[2] ?? "";

    if (!posts.has(id)) {
      return graphError(100);
    }

    return json({
      data: [
        { name: "views", period: "lifetime", values: [{ value: 800 }] },
        { name: "likes", period: "lifetime", values: [{ value: 30 }] },
        { name: "replies", period: "lifetime", values: [{ value: 4 }] },
        { name: "reposts", period: "lifetime", values: [{ value: 6 }] },
        { name: "quotes", period: "lifetime", values: [{ value: 1 }] },
      ],
    });
  }, scripted);

describe("reading counts on Facebook Pages", () => {
  it.live(
    "reads reactions, comments with their replies, and shares, with the Page's token and the app's proof",
    () =>
      Effect.gen(function* reads() {
        const server = yield* fakePage(new Set(["104000000000001_900"]));

        const posts = [
          toRead("104000000000001_900", 0),
          toRead("104000000000001_901", 1),
        ];

        const { batch } = yield* reading(server.url, posts, page, [
          "page-token-synthetic",
        ]);

        assert.deepStrictEqual(
          batch._tag === "Success" ? batch.success : undefined,
          {
            halted: false,
            readings: [
              {
                _tag: "counted",
                // Without read_insights, a Page tells no views: none.
                metrics: new PostMetrics({
                  impressions: Option.none(),
                  likes: 12,
                  quotes: Option.none(),
                  replies: 5,
                  reposts: 2,
                }),
                targetId: targetOf(posts[0]),
              },
              { _tag: "missing", targetId: targetOf(posts[1]) },
            ],
          }
        );
        assert.isFalse(
          server.requests().some(({ path }) => path.endsWith("/insights"))
        );
      }).pipe(Effect.scoped)
  );

  it.live(
    "reads views and clicks too once the Page granted read_insights",
    () =>
      Effect.gen(function* insights() {
        const server = yield* fakePage(new Set(["104000000000001_900"]));
        const posts = [toRead("104000000000001_900", 0)];

        const { batch } = yield* reading(
          server.url,
          posts,
          { ...page, scopes: [...page.scopes, "read_insights"] },
          ["page-token-synthetic"]
        );

        assert.deepStrictEqual(
          batch._tag === "Success" ? batch.success.readings : undefined,
          [
            {
              _tag: "counted",
              metrics: new PostMetrics({
                clicks: Option.some(21),
                impressions: Option.some(640),
                likes: 12,
                quotes: Option.none(),
                replies: 5,
                reposts: 2,
              }),
              targetId: targetOf(posts[0]),
            },
          ]
        );
      }).pipe(Effect.scoped)
  );

  it.live(
    "halts on a rate limit, and fails a post Meta refuses without marking the channel",
    () =>
      Effect.gen(function* refusals() {
        const server = yield* fakePage(new Set(["104000000000001_900"]), [
          graphError(80_001),
          graphError(190, 401),
        ]);

        const posts = [toRead("104000000000001_900", 0)];

        const limited = yield* reading(server.url, posts, page, [
          "page-token-synthetic",
        ]);

        const refused = yield* reading(server.url, posts, page, [
          "page-token-synthetic",
        ]);

        assert.deepStrictEqual(
          limited.batch._tag === "Success" ? limited.batch.success : undefined,
          { halted: true, readings: [] }
        );
        assert.deepStrictEqual(
          refused.batch._tag === "Success" ? refused.batch.success : undefined,
          {
            halted: true,
            readings: [{ _tag: "failed", targetId: targetOf(posts[0]) }],
          }
        );
        // The token was handed once: analytics asks for no renewal.
        assert.deepStrictEqual(refused.handed, ["page-token-synthetic"]);
      }).pipe(Effect.scoped)
  );
});

describe("reading counts on Threads", () => {
  it.live("reads a post's insights, one post a call", () =>
    Effect.gen(function* reads() {
      const server = yield* fakeThreads(new Set(["18000000000000001"]));

      const posts = [
        toRead("18000000000000001", 0),
        toRead("18000000000000002", 1),
      ];

      const { batch } = yield* reading(server.url, posts, threads, [
        "threads-token-synthetic",
      ]);

      assert.deepStrictEqual(
        batch._tag === "Success" ? batch.success : undefined,
        {
          halted: false,
          readings: [
            {
              _tag: "counted",
              metrics: new PostMetrics({
                impressions: Option.some(800),
                likes: 30,
                quotes: Option.some(1),
                replies: 4,
                reposts: 6,
              }),
              targetId: targetOf(posts[0]),
            },
            { _tag: "missing", targetId: targetOf(posts[1]) },
          ],
        }
      );
      assert.deepStrictEqual(
        server.requests().map(({ path, query }) => [path, query.get("metric")]),
        [
          [
            "/v1.0/18000000000000001/insights",
            "views,likes,replies,reposts,quotes",
          ],
          [
            "/v1.0/18000000000000002/insights",
            "views,likes,replies,reposts,quotes",
          ],
        ]
      );
    }).pipe(Effect.scoped)
  );

  it.live("reads nothing on an account that did not grant its insights", () =>
    Effect.gen(function* withoutScope() {
      const server = yield* fakeThreads(new Set());

      const { batch } = yield* reading(
        server.url,
        [toRead("18000000000000001", 0)],
        { ...threads, scopes: ["threads_basic", "threads_content_publish"] },
        ["threads-token-synthetic"]
      );

      assert.deepStrictEqual(
        batch._tag === "Failure" ? batch.failure : undefined,
        new ChannelUnreadable({ reason: "paused" })
      );
      assert.lengthOf(server.requests(), 0);
    }).pipe(Effect.scoped)
  );
});
