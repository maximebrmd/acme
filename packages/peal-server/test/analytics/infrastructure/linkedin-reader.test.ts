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
  headerOf,
  json,
  platformServer,
} from "#test/publishing/fakes/platform-server.ts";
import type { PlatformAnswer } from "#test/publishing/fakes/platform-server.ts";

const channelId = ChannelIdSchema.make("01900000-0000-7000-8000-0000000000c1");
const pageUrn = "urn:li:organization:9000000001";

const page: ChannelAccount = {
  accountId: pageUrn,
  channelId,
  connection: Option.some("linkedinPage"),
  platform: "linkedin",
  scopes: [
    "r_organization_social",
    "rw_organization_admin",
    "w_organization_social",
  ],
};

const profile: ChannelAccount = {
  accountId: "aB3dE5fG7h",
  channelId,
  connection: Option.some("linkedinProfile"),
  platform: "linkedin",
  scopes: ["openid", "profile", "w_member_social"],
};

const toRead = (platformPostId: string, index: number): PostToRead => ({
  platformPostId: PlatformPostIdSchema.make(platformPostId),
  targetId: PostTargetIdSchema.make(
    `01900000-0000-7000-8000-${String(index + 1).padStart(12, "0")}`
  ),
});

const statistics = {
  clickCount: 78,
  commentCount: 24,
  engagement: 0.022886324947985624,
  impressionCount: 5287,
  likeCount: 14,
  shareCount: 5,
  uniqueImpressionsCount: 4100,
};

// The share statistics finder, for the page's administrator: the posts
// that have statistics, each under `share` or `ugcPost` as it was asked.
const fakeStatistics = (counted: ReadonlySet<string>) => {
  const scripted: PlatformAnswer[] = [];

  return platformServer((request) => {
    const next = scripted.shift();

    if (next !== undefined) {
      return next;
    }

    if (headerOf(request, "authorization") !== "Bearer linkedin-token-1") {
      return json({ message: "Invalid access token", status: 401 }, 401);
    }

    if (
      request.path !== "/rest/organizationalEntityShareStatistics" ||
      request.query.get("q") !== "organizationalEntity" ||
      request.query.get("organizationalEntity") !== pageUrn ||
      headerOf(request, "linkedin-version") !== "202610" ||
      headerOf(request, "x-restli-protocol-version") !== "2.0.0"
    ) {
      return json({ message: "Bad request", status: 400 }, 400);
    }

    const listed = (name: string) =>
      (
        /^List\((?<urns>.*)\)$/u.exec(request.query.get(name) ?? "")?.groups?.[
          "urns"
        ] ?? ""
      )
        .split(",")
        .filter((urn) => urn !== "");

    const element = (key: "share" | "ugcPost") => (urn: string) =>
      counted.has(urn)
        ? [
            {
              [key]: urn,
              organizationalEntity: pageUrn,
              totalShareStatistics: statistics,
            },
          ]
        : [];

    return json({
      elements: [
        ...listed("shares").flatMap(element("share")),
        ...listed("ugcPosts").flatMap(element("ugcPost")),
      ],
      paging: { count: 10, links: [], start: 0 },
    });
  }).pipe(
    Effect.map((server) => ({
      ...server,
      next: (answer: PlatformAnswer) => {
        scripted.push(answer);
      },
    }))
  );
};

const reading = (
  posts: readonly PostToRead[],
  account: ChannelAccount,
  linkedinApi: string,
  tokens: readonly string[] = ["linkedin-token-1"]
) =>
  Effect.gen(function* read() {
    const batch = yield* MetricsReader.use((reader) =>
      reader.read({ channelId, posts })
    ).pipe(Effect.result);

    return { batch, handed: yield* AccessLog.use((log) => log.handed) };
  }).pipe(
    Effect.provide(
      readersWith({ linkedinApi }).pipe(
        Layer.provideMerge(channelAccessOf(account, tokens))
      )
    )
  );

const share = "urn:li:share:7200000000000000001";
const video = "urn:li:ugcPost:7200000000000000002";
const quiet = "urn:li:share:7200000000000000003";

describe("reading counts on a LinkedIn page", () => {
  it.live(
    "reads the page's share statistics, shares and ugcPosts in one call",
    () =>
      Effect.gen(function* counts() {
        const server = yield* fakeStatistics(new Set([share, video]));
        const posts = [share, video, quiet].map(toRead);
        const [first, second, third] = posts.map(({ targetId }) => targetId);
        const { batch, handed } = yield* reading(posts, page, server.url);

        assert(
          first !== undefined && second !== undefined && third !== undefined
        );

        const counted = new PostMetrics({
          clicks: Option.some(78),
          impressions: Option.some(5287),
          likes: 14,
          quotes: Option.none(),
          reach: Option.some(4100),
          replies: 24,
          reposts: 5,
        });

        assert.deepStrictEqual(
          batch._tag === "Success" ? batch.success : undefined,
          {
            halted: false,
            readings: [
              { _tag: "counted", metrics: counted, targetId: first },
              { _tag: "counted", metrics: counted, targetId: second },
              // LinkedIn leaves out a post nobody saw: its counts are 0.
              {
                _tag: "counted",
                metrics: new PostMetrics({
                  clicks: Option.some(0),
                  impressions: Option.some(0),
                  likes: 0,
                  quotes: Option.none(),
                  reach: Option.some(0),
                  replies: 0,
                  reposts: 0,
                }),
                targetId: third,
              },
            ],
          }
        );
        assert.deepStrictEqual(handed, ["linkedin-token-1"]);

        // Rest.li 2.0: a list's parentheses and commas as they are, each
        // URN's colons percent-encoded.
        assert.strictEqual(server.requests().length, 1);
        assert.strictEqual(
          server.requests()[0]?.search,
          "q=organizationalEntity&organizationalEntity=urn%3Ali%3Aorganization%3A9000000001&shares=List(urn%3Ali%3Ashare%3A7200000000000000001,urn%3Ali%3Ashare%3A7200000000000000003)&ugcPosts=List(urn%3Ali%3AugcPost%3A7200000000000000002)"
        );
      })
  );

  it.live(
    "keeps a count LinkedIn left out as none, never as zero, and counts nothing past what Peal stores",
    () =>
      Effect.gen(function* partial() {
        const server = yield* fakeStatistics(new Set());
        const posts = [share, video].map(toRead);
        const [first, second] = posts.map(({ targetId }) => targetId);

        assert(first !== undefined && second !== undefined);

        server.next(
          json({
            elements: [
              {
                organizationalEntity: pageUrn,
                share,
                // No reach, no clicks: LinkedIn gave none for this post.
                totalShareStatistics: {
                  commentCount: 2,
                  impressionCount: 40,
                  likeCount: 3,
                  shareCount: 1,
                },
              },
              {
                organizationalEntity: pageUrn,
                totalShareStatistics: { ...statistics, likeCount: 2 ** 40 },
                ugcPost: video,
              },
            ],
          })
        );

        const { batch } = yield* reading(posts, page, server.url);

        assert.deepStrictEqual(
          batch._tag === "Success" ? batch.success.readings : undefined,
          [
            {
              _tag: "counted",
              metrics: new PostMetrics({
                clicks: Option.none(),
                impressions: Option.some(40),
                likes: 3,
                quotes: Option.none(),
                reach: Option.none(),
                replies: 2,
                reposts: 1,
              }),
              targetId: first,
            },
            { _tag: "failed", targetId: second },
          ]
        );
      })
  );

  it.live("reads nothing on a member's profile, without asking LinkedIn", () =>
    Effect.gen(function* member() {
      const server = yield* fakeStatistics(new Set());
      const { batch } = yield* reading([toRead(share, 0)], profile, server.url);

      assert.deepStrictEqual(
        batch._tag === "Failure" ? batch.failure : undefined,
        new ChannelUnreadable({ reason: "unsupported" })
      );
      assert.strictEqual(server.requests().length, 0);
    })
  );

  it.live(
    "ends the posts of a page whose member may not read its statistics",
    () =>
      Effect.gen(function* forbidden() {
        const server = yield* fakeStatistics(new Set());

        // A content administrator posts, and reads no statistics.
        server.next(
          json(
            { code: "ACCESS_DENIED", message: "Not enough", status: 403 },
            403
          )
        );

        const { batch, handed } = yield* reading(
          [toRead(share, 0)],
          page,
          server.url,
          ["linkedin-token-1", "linkedin-token-2"]
        );

        assert.deepStrictEqual(
          batch._tag === "Failure" ? batch.failure : undefined,
          new ChannelUnreadable({ reason: "unsupported" })
        );
        // Never taken for a token to renew.
        assert.deepStrictEqual(handed, ["linkedin-token-1"]);
      })
  );

  it.live("halts at a rate limit, and on a version LinkedIn retired", () =>
    Effect.gen(function* halts() {
      const server = yield* fakeStatistics(new Set([share]));

      for (const answer of [
        json({ message: "Too many requests", status: 429 }, 429),
        json({ code: "NONEXISTENT_VERSION", status: 426 }, 426),
        json({ message: "Service unavailable", status: 503 }, 503),
      ]) {
        server.next(answer);

        const { batch } = yield* reading([toRead(share, 0)], page, server.url);

        assert.strictEqual(
          batch._tag === "Success" ? batch.success.halted : undefined,
          true
        );
      }
    })
  );

  it.live("renews a token LinkedIn no longer knows, once", () =>
    Effect.gen(function* renews() {
      const server = yield* fakeStatistics(new Set([share]));

      const { batch, handed } = yield* reading(
        [toRead(share, 0)],
        page,
        server.url,
        ["linkedin-token-0", "linkedin-token-1"]
      );

      assert.strictEqual(
        batch._tag === "Success" ? batch.success.readings[0]?._tag : undefined,
        "counted"
      );
      assert.deepStrictEqual(handed, ["linkedin-token-0", "linkedin-token-1"]);
    })
  );

  it.live("leaves a post whose id is no LinkedIn URN missing", () =>
    Effect.gen(function* odd() {
      const server = yield* fakeStatistics(new Set());
      const posts = [toRead("not-a-urn", 0)];
      const { batch } = yield* reading(posts, page, server.url);

      assert.deepStrictEqual(
        batch._tag === "Success" ? batch.success : undefined,
        {
          halted: false,
          readings: posts.map(({ targetId }) => ({
            _tag: "missing" as const,
            targetId,
          })),
        }
      );
      assert.strictEqual(server.requests().length, 0);
    })
  );
});
