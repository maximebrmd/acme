import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer, Option, Ref, Result } from "effect";

import { ChannelUnreadable } from "#analytics/application/channel-unreadable.ts";
import { MetricsReader } from "#analytics/application/metrics-reader.ts";
import type { PostToRead } from "#analytics/application/metrics-reader.ts";
import { PostMetrics } from "#analytics/domain/post-metrics.ts";
import type { ChannelAccount } from "#channels/application/channel-access.ts";
import {
  ChannelIdSchema,
  PostTargetIdSchema,
  WorkspaceIdSchema,
} from "#shared/domain/ids.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import { AccessLog, channelAccessOf } from "#test/analytics/access-log.ts";
import { paidReadsOf } from "#test/analytics/fakes/memory-paid-reads.ts";
import { readersWith } from "#test/analytics/support.ts";
import {
  headerOf,
  json,
  rawJson,
  platformServer,
} from "#test/publishing/fakes/platform-server.ts";
import type { PlatformAnswer } from "#test/publishing/fakes/platform-server.ts";

const channelId = ChannelIdSchema.make("01900000-0000-7000-8000-0000000000c7");

const workspaceId = WorkspaceIdSchema.make(
  "5b0f7f8e-2c1d-4a53-9e0a-7f1f6f3f0a01"
);

const account: ChannelAccount = {
  accountId: "1460000000000000001",
  channelId,
  connection: Option.none(),
  platform: "x",
  scopes: [
    "tweet.read",
    "tweet.write",
    "users.read",
    "media.write",
    "offline.access",
  ],
};

const toRead = (platformPostId: string, index: number): PostToRead => ({
  platformPostId: PlatformPostIdSchema.make(platformPostId),
  targetId: PostTargetIdSchema.make(
    `01900000-0000-7000-8000-${String(index + 1).padStart(12, "0")}`
  ),
});

const idOf = (index: number) => `18${String(index).padStart(17, "0")}`;

// The post lookup over the account's posts, with the token it takes: each
// post known comes back with its public metrics, and one unknown as a
// partial error beside the others. `script` answers first.
const fakePosts = (
  posts: ReadonlyMap<string, number>,
  token = "x-access-synthetic-1"
) => {
  const scripted: PlatformAnswer[] = [];

  return platformServer((request) => {
    const answer = scripted.shift();

    if (answer !== undefined) {
      return answer;
    }

    if (headerOf(request, "authorization") !== `Bearer ${token}`) {
      return json(
        {
          detail: "Unauthorized",
          status: 401,
          title: "Unauthorized",
          type: "about:blank",
        },
        401
      );
    }

    const ids = (request.query.get("ids") ?? "").split(",");

    return json({
      data: ids.flatMap((id) => {
        const likes = posts.get(id);

        return likes === undefined
          ? []
          : [
              {
                id,
                public_metrics: {
                  bookmark_count: 4,
                  impression_count: 300,
                  like_count: likes,
                  quote_count: 1,
                  reply_count: 2,
                  repost_count: 3,
                },
              },
            ];
      }),
      errors: ids
        .filter((id) => !posts.has(id))
        .map((id) => ({
          resource_id: id,
          resource_type: "tweet",
          title: "Not Found Error",
          type: "https://api.x.com/2/problems/resource-not-found",
        })),
    });
  }).pipe(
    Effect.map((server) => ({
      ...server,
      script: (answers: readonly PlatformAnswer[]) => {
        scripted.push(...answers);
      },
    }))
  );
};

const reading = (
  url: string,
  posts: readonly PostToRead[],
  {
    allowance = 1000,
    enabled = true,
    owner = account,
    reads = true,
    released,
    tokens = ["x-access-synthetic-1"],
  }: {
    readonly allowance?: number;
    readonly enabled?: boolean;
    readonly owner?: ChannelAccount;
    readonly reads?: boolean;
    readonly released?: Ref.Ref<readonly string[]>;
    readonly tokens?: readonly string[];
  } = {}
) =>
  Effect.gen(function* read() {
    const batch = yield* MetricsReader.use((reader) =>
      reader.read({ channelId, posts, workspaceId })
    ).pipe(Effect.result);

    return { batch, handed: yield* AccessLog.use((log) => log.handed) };
  }).pipe(
    Effect.provide(
      readersWith({
        paidReads:
          released === undefined
            ? paidReadsOf(allowance, { reads })
            : paidReadsOf(allowance, { reads, released }),
        xApi: url,
        xReads: enabled,
      }).pipe(Layer.provideMerge(channelAccessOf(owner, tokens)))
    )
  );

const counted = (likes: number) =>
  new PostMetrics({
    impressions: Option.some(300),
    likes,
    quotes: Option.some(1),
    replies: 2,
    reposts: 3,
    saves: Option.some(4),
  });

describe("reading counts on X", () => {
  it.live("reads nothing unless the operator turned X reads on", () =>
    Effect.gen(function* off() {
      const server = yield* fakePosts(new Map([[idOf(0), 5]]));

      const { batch } = yield* reading(server.url, [toRead(idOf(0), 0)], {
        enabled: false,
      });

      assert.deepStrictEqual(
        batch._tag === "Failure" ? batch.failure : undefined,
        new ChannelUnreadable({ reason: "unsupported" })
      );
      assert.lengthOf(server.requests(), 0);
    }).pipe(Effect.scoped)
  );

  it.live("reads posts 100 to a call, and bookmarks as saves", () =>
    Effect.gen(function* reads() {
      const ids = Array.from({ length: 102 }, (_, index) => idOf(index));

      const server = yield* fakePosts(
        new Map(ids.slice(0, 101).map((id, index) => [id, index]))
      );

      // What Peal knows by another id than X's digits is never asked for.
      const posts = [...ids, "not-a-post-id"].map(toRead);
      const { batch, handed } = yield* reading(server.url, posts);
      const success = batch._tag === "Success" ? batch.success : undefined;

      assert.strictEqual(success?.halted, false);
      assert.lengthOf(success?.readings ?? [], 103);
      assert.deepStrictEqual(
        success?.readings.find(
          ({ targetId }) => targetId === posts[7]?.targetId
        ),
        {
          _tag: "counted",
          metrics: counted(7),
          targetId: posts[7]?.targetId ?? PostTargetIdSchema.make(""),
        }
      );
      assert.sameMembers(
        (success?.readings ?? []).flatMap(({ _tag, targetId }) =>
          _tag === "missing" ? [targetId] : []
        ),
        [posts[101]?.targetId ?? "", posts[102]?.targetId ?? ""]
      );
      assert.deepStrictEqual(
        server
          .requests()
          .map((request) => (request.query.get("ids") ?? "").split(",").length),
        [100, 2]
      );
      assert.deepStrictEqual(
        server
          .requests()
          .map((request) => [request.path, request.query.get("tweet.fields")]),
        [
          ["/2/tweets", "public_metrics"],
          ["/2/tweets", "public_metrics"],
        ]
      );
      assert.deepStrictEqual(handed, ["x-access-synthetic-1"]);
    }).pipe(Effect.scoped)
  );

  it.live(
    "reads only what the workspace's allowance for the day covers, and puts the rest off without stopping the channel",
    () =>
      Effect.gen(function* metered() {
        const ids = [idOf(0), idOf(1), idOf(2)];

        const server = yield* fakePosts(new Map(ids.map((id) => [id, 1])));
        const posts = ids.map(toRead);

        const { batch } = yield* reading(server.url, posts, { allowance: 2 });
        const success = batch._tag === "Success" ? batch.success : undefined;

        // Not halted: the channel's other posts, paid for, are still read.
        assert.strictEqual(success?.halted, false);
        assert.deepStrictEqual(
          success?.readings.map(({ _tag, targetId }) => ({ _tag, targetId })),
          [
            { _tag: "counted", targetId: posts[0]?.targetId },
            { _tag: "counted", targetId: posts[1]?.targetId },
            { _tag: "unpaid", targetId: posts[2]?.targetId },
          ]
        );
        assert.deepStrictEqual(
          server.requests().map((request) => request.query.get("ids")),
          [`${idOf(0)},${idOf(1)}`]
        );
      }).pipe(Effect.scoped)
  );

  it.live(
    "goes on reading the posts already paid for today once the allowance is spent",
    () =>
      Effect.gen(function* paidAlready() {
        const ids = [idOf(0), idOf(1), idOf(2)];
        const server = yield* fakePosts(new Map(ids.map((id) => [id, 1])));
        const [first, second, third] = ids.map(toRead);

        assert(
          first !== undefined && second !== undefined && third !== undefined
        );

        const readings = yield* Effect.gen(function* twice() {
          const reader = yield* MetricsReader;

          // The day's two reads go to the first two posts.
          yield* reader.read({
            channelId,
            posts: [first, second],
            workspaceId,
          });

          // Later that day a new post is due first: it has no read left,
          // and the two paid for are read again all the same.
          return yield* reader.read({
            channelId,
            posts: [third, first, second],
            workspaceId,
          });
        }).pipe(
          Effect.provide(
            readersWith({ paidReads: paidReadsOf(2), xApi: server.url }).pipe(
              Layer.provideMerge(
                channelAccessOf(account, ["x-access-synthetic-1"])
              )
            )
          )
        );

        assert.isFalse(readings.halted);
        assert.deepStrictEqual(
          readings.readings
            .map(({ _tag, targetId }) => `${_tag}:${targetId}`)
            .toSorted(),
          [
            `counted:${first.targetId}`,
            `counted:${second.targetId}`,
            `unpaid:${third.targetId}`,
          ].toSorted()
        );
        assert.lengthOf(server.requests(), 2);
      }).pipe(Effect.scoped)
  );

  it.live("asks X nothing once the day's allowance is spent", () =>
    Effect.gen(function* spent() {
      const server = yield* fakePosts(new Map([[idOf(0), 1]]));

      const { batch } = yield* reading(server.url, [toRead(idOf(0), 0)], {
        allowance: 0,
      });

      assert.deepStrictEqual(
        batch._tag === "Success" ? batch.success : undefined,
        {
          halted: false,
          readings: [{ _tag: "unpaid", targetId: toRead(idOf(0), 0).targetId }],
        }
      );
      assert.lengthOf(server.requests(), 0);
    }).pipe(Effect.scoped)
  );

  it.live("renews a token X refused", () =>
    Effect.gen(function* renews() {
      const server = yield* fakePosts(new Map([[idOf(0), 5]]));

      const { batch, handed } = yield* reading(
        server.url,
        [toRead(idOf(0), 0)],
        { tokens: ["x-access-expired", "x-access-synthetic-1"] }
      );

      assert.strictEqual(batch._tag, "Success");
      assert.deepStrictEqual(handed, [
        "x-access-expired",
        "x-access-synthetic-1",
      ]);
    }).pipe(Effect.scoped)
  );

  it.live(
    "halts on a rate limit or a spent balance, and fails posts on an error",
    () =>
      Effect.gen(function* refusals() {
        const server = yield* fakePosts(new Map([[idOf(0), 5]]));
        const posts = [toRead(idOf(0), 0)];

        const halted = { halted: true, readings: [] };

        server.script([
          json({ title: "Too Many Requests", type: "about:blank" }, 429),
          json(
            {
              title: "UsageCapExceeded",
              type: "https://api.x.com/2/problems/usage-capped",
            },
            429
          ),
          json({ title: "Payment Required", type: "about:blank" }, 402),
          json({ title: "Internal Server Error", type: "about:blank" }, 500),
        ]);

        for (const _ of [1, 2, 3]) {
          const limited = yield* reading(server.url, posts);

          assert.deepStrictEqual(
            limited.batch._tag === "Success"
              ? limited.batch.success
              : undefined,
            halted
          );
        }

        const failed = yield* reading(server.url, posts);

        assert.deepStrictEqual(
          failed.batch._tag === "Success" ? failed.batch.success : undefined,
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
      }).pipe(Effect.scoped)
  );

  it.live("counts nothing X gave no like, reply or repost count for", () =>
    Effect.gen(function* partial() {
      const server = yield* fakePosts(new Map());
      const post = toRead(idOf(0), 0);

      server.script([
        json({
          data: [{ id: idOf(0), public_metrics: { impression_count: 10 } }],
        }),
      ]);

      const { batch } = yield* reading(server.url, [post]);

      assert.deepStrictEqual(
        batch._tag === "Success" ? batch.success.readings : undefined,
        [{ _tag: "failed", targetId: post.targetId }]
      );
    }).pipe(Effect.scoped)
  );

  it.live(
    "halts rather than refuse the token on a 401 that is not X's own",
    () =>
      Effect.gen(function* proxied() {
        const server = yield* fakePosts(new Map([[idOf(0), 5]]));

        server.script([rawJson("<html>Unauthorized</html>", 401)]);

        const { batch, handed } = yield* reading(server.url, [
          toRead(idOf(0), 0),
        ]);

        assert.deepStrictEqual(
          batch._tag === "Success" ? batch.success : undefined,
          { halted: true, readings: [] }
        );
        // The token was not renewed: nothing took it for refused.
        assert.deepStrictEqual(handed, ["x-access-synthetic-1"]);
      }).pipe(Effect.scoped)
  );

  it.live("reads nothing on a channel that did not allow tweet.read", () =>
    Effect.gen(function* withoutScope() {
      const server = yield* fakePosts(new Map());

      const { batch } = yield* reading(server.url, [toRead(idOf(0), 0)], {
        owner: { ...account, scopes: ["tweet.write", "users.read"] },
      });

      assert.deepStrictEqual(
        batch._tag === "Failure" ? batch.failure : undefined,
        new ChannelUnreadable({ reason: "paused" })
      );
      assert.lengthOf(server.requests(), 0);
    }).pipe(Effect.scoped)
  );

  it.live(
    "gives back the posts X did not return: refused, failed or gone, never one it counted",
    () =>
      Effect.gen(function* releases() {
        const server = yield* fakePosts(new Map([[idOf(0), 5]]));
        const released = yield* Ref.make<readonly string[]>([]);

        server.script([
          json({ title: "Payment Required", type: "about:blank" }, 402),
        ]);

        yield* reading(server.url, [toRead(idOf(0), 0)], {
          allowance: 1000,
          released,
        });

        assert.deepStrictEqual(yield* Ref.get(released), [idOf(0)]);

        // Answered: the post counted is kept, the one X left out goes back.
        yield* Ref.set(released, []);

        yield* reading(server.url, [toRead(idOf(0), 0), toRead(idOf(1), 1)], {
          released,
        });

        assert.deepStrictEqual(yield* Ref.get(released), [idOf(1)]);
      }).pipe(Effect.scoped)
  );

  it.live("skips, as paused, a workspace that does not read X", () =>
    Effect.gen(function* off() {
      const server = yield* fakePosts(new Map([[idOf(0), 5]]));

      const { batch, handed } = yield* reading(
        server.url,
        [toRead(idOf(0), 0)],
        { reads: false }
      );

      assert.deepInclude(Option.getOrUndefined(Result.getFailure(batch)), {
        _tag: "ChannelUnreadable",
        reason: "paused",
      });
      assert.deepStrictEqual(handed, []);
    }).pipe(Effect.scoped)
  );
});
