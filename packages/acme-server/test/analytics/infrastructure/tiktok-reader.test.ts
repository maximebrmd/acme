import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer, Option, Schema } from "effect";

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
import type {
  PlatformAnswer,
  PlatformRequest,
} from "#test/publishing/fakes/platform-server.ts";

const channelId = ChannelIdSchema.make("01900000-0000-7000-8000-0000000000c1");

const account: ChannelAccount = {
  accountId: "-000synthetic-open-id-0001",
  channelId,
  platform: "tiktok",
  scopes: ["user.info.basic", "video.publish", "video.list"],
};

const toRead = (platformPostId: string, index: number): PostToRead => ({
  platformPostId: PlatformPostIdSchema.make(platformPostId),
  targetId: PostTargetIdSchema.make(
    `01900000-0000-7000-8000-${String(index + 1).padStart(12, "0")}`
  ),
});

const ok = { code: "ok", log_id: "synthetic", message: "" };

const QuerySchema = Schema.fromJsonString(
  Schema.Struct({
    filters: Schema.Struct({ video_ids: Schema.Array(Schema.String) }),
  })
);

const idsOf = (request: PlatformRequest) =>
  Schema.decodeUnknownSync(QuerySchema)(new TextDecoder().decode(request.body))
    .filters.video_ids;

// The Display API's video query over the creator's videos, with the token
// it takes; `next` answers first when set.
const fakeVideos = (
  videos: ReadonlyMap<string, number>,
  token = "act.tiktok-access-1"
) => {
  const scripted: PlatformAnswer[] = [];

  return platformServer((request) => {
    const answer = scripted.shift();

    if (answer !== undefined) {
      return answer;
    }

    if (headerOf(request, "authorization") !== `Bearer ${token}`) {
      return json({ error: { ...ok, code: "access_token_invalid" } }, 401);
    }

    return json({
      data: {
        videos: idsOf(request).flatMap((id) => {
          const likes = videos.get(id);

          return likes === undefined
            ? []
            : [
                {
                  comment_count: 2,
                  id,
                  like_count: likes,
                  share_count: 1,
                  view_count: 100,
                },
              ];
        }),
      },
      error: ok,
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
  owner: ChannelAccount = account,
  tokens: readonly string[] = ["act.tiktok-access-1"]
) =>
  Effect.gen(function* read() {
    const batch = yield* MetricsReader.use((reader) =>
      reader.read({ channelId, posts })
    ).pipe(Effect.result);

    return { batch, handed: yield* AccessLog.use((log) => log.handed) };
  }).pipe(
    Effect.provide(
      readersWith(undefined, url).pipe(
        Layer.provideMerge(channelAccessOf(owner, tokens))
      )
    )
  );

const counted = (likes: number) =>
  new PostMetrics({
    impressions: Option.some(100),
    likes,
    quotes: Option.none(),
    replies: 2,
    reposts: 1,
  });

describe("reading counts on TikTok", () => {
  it.live("reads public videos 20 to a call, and skips private posts", () =>
    Effect.gen(function* reads() {
      const ids = Array.from(
        { length: 22 },
        (_, index) => `73111111111111111${String(index).padStart(2, "0")}`
      );

      const server = yield* fakeVideos(
        new Map(ids.slice(0, 21).map((id, index) => [id, index]))
      );

      const posts = [...ids, "v_pub_file~v2-1.private"].map(toRead);
      const { batch, handed } = yield* reading(server.url, posts);
      const success = batch._tag === "Success" ? batch.success : undefined;

      assert.strictEqual(success?.halted, false);
      assert.lengthOf(success?.readings ?? [], 23);
      assert.deepStrictEqual(
        success?.readings.find(
          ({ targetId }) => targetId === posts[1]?.targetId
        ),
        {
          _tag: "counted",
          metrics: counted(1),
          targetId: posts[1]?.targetId ?? PostTargetIdSchema.make(""),
        }
      );

      const missing = (success?.readings ?? []).flatMap(({ _tag, targetId }) =>
        _tag === "missing" ? [targetId] : []
      );

      // The last public one is gone; the private one is never asked for.
      assert.sameMembers(missing, [
        posts[21]?.targetId ?? "",
        posts[22]?.targetId ?? "",
      ]);
      assert.deepStrictEqual(
        server.requests().map((request) => idsOf(request).length),
        [20, 2]
      );
      assert.deepStrictEqual(handed, ["act.tiktok-access-1"]);
    }).pipe(Effect.scoped)
  );

  it.live("renews a token TikTok refused", () =>
    Effect.gen(function* renews() {
      const server = yield* fakeVideos(new Map([["7311111111111111111", 5]]));

      const { batch, handed } = yield* reading(
        server.url,
        [toRead("7311111111111111111", 0)],
        account,
        ["act.tiktok-expired", "act.tiktok-access-1"]
      );

      assert.strictEqual(batch._tag, "Success");
      assert.deepStrictEqual(handed, [
        "act.tiktok-expired",
        "act.tiktok-access-1",
      ]);
    }).pipe(Effect.scoped)
  );

  it.live("halts on a rate limit, and marks posts failed on an error", () =>
    Effect.gen(function* refusals() {
      const server = yield* fakeVideos(new Map([["7311111111111111111", 5]]));
      const posts = [toRead("7311111111111111111", 0)];

      server.script([
        json({ error: { ...ok, code: "rate_limit_exceeded" } }, 429),
        json({ error: { ...ok, code: "internal_error" } }, 500),
      ]);

      const limited = yield* reading(server.url, posts);
      const failed = yield* reading(server.url, posts);

      assert.deepStrictEqual(
        limited.batch._tag === "Success" ? limited.batch.success : undefined,
        { halted: true, readings: [] }
      );
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

  it.live("reads nothing on a channel that did not allow video.list", () =>
    Effect.gen(function* withoutScope() {
      const server = yield* fakeVideos(new Map());

      const { batch } = yield* reading(
        server.url,
        [toRead("7311111111111111111", 0)],
        { ...account, scopes: ["user.info.basic", "video.publish"] }
      );

      assert.deepStrictEqual(
        batch._tag === "Failure" ? batch.failure : undefined,
        new ChannelUnreadable({ reason: "paused" })
      );
      assert.lengthOf(server.requests(), 0);
    }).pipe(Effect.scoped)
  );
});
