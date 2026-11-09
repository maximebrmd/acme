import { assert, describe, expect, it } from "@effect/vitest";
import { Context, Duration, Effect, Layer, Option, Schema } from "effect";

import type { OutgoingPost } from "#publishing/application/platform-client.ts";
import { TikTokOptions } from "#publishing/domain/tiktok-options.ts";
import {
  chunkPlanOf,
  TikTokProgressSchema,
} from "#publishing/infrastructure/platforms/tiktok/tiktok-client.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import { MediaRejected } from "#shared/domain/media-rejected.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import { RateLimited } from "#shared/domain/rate-limited.ts";
import {
  fakeTikTokApi,
  publicCreator,
  tiktokAccountId,
  tiktokPostId,
  tiktokToken,
} from "#test/publishing/fakes/fake-tiktok-api.ts";
import type { FakeTikTokOptions } from "#test/publishing/fakes/fake-tiktok-api.ts";
import {
  dropped,
  headerOf,
  json,
  textOf,
} from "#test/publishing/fakes/platform-server.ts";
import type { PlatformServer } from "#test/publishing/fakes/platform-server.ts";

import { ProgressLog, progressInMemory } from "./progress-log.ts";
import {
  attached,
  CredentialLog,
  credentialsOf,
  outgoing,
  testFile,
  tiktokClientWith,
} from "./support.ts";
import type { TestFile } from "./support.ts";

const key = "9f86d081884c7d659a2feaa0c55ad015";

// TikTok, and the client publishing to it as the synthetic creator, for a
// call the journal began.
const onTikTok = Effect.fn("test.onTikTok")(function* onTikTok(
  options: {
    readonly api?: FakeTikTokOptions;
    readonly files?: readonly TestFile[];
    readonly pullFrom?: string;
    readonly recorded?: typeof Schema.Json.Type;
    readonly tokens?: readonly string[];
  } = {}
) {
  const tiktok = yield* fakeTikTokApi(options.api);
  const progress = yield* Layer.build(progressInMemory);
  const log = Context.get(progress, ProgressLog);

  yield* log.begin(key, options.recorded);

  const credentials = yield* Layer.build(
    credentialsOf(
      { accountId: tiktokAccountId, platform: "tiktok" },
      options.tokens ?? [tiktokToken]
    )
  );

  const client = yield* tiktokClientWith({
    api: tiktok.url,
    credentials: Layer.succeedContext(credentials),
    files: options.files ?? [],
    progress,
    pullFrom: options.pullFrom,
  });

  return {
    client,
    credentials: Context.get(credentials, CredentialLog),
    journal: log,
    tiktok,
  };
});

const chosen = (fields: Partial<TikTokOptions> = {}) =>
  new TikTokOptions({ privacyLevel: "PUBLIC_TO_EVERYONE", ...fields });

const post = (fields: Partial<OutgoingPost>) =>
  outgoing({
    accountId: tiktokAccountId,
    idempotencyKey: key,
    options: Option.some(chosen()),
    text: "A synthetic #launch video",
    ...fields,
  });

const calls = (server: PlatformServer, method: string, path: string) =>
  server
    .requests()
    .filter((request) => request.method === method && request.path === path);

const InitBodySchema = Schema.fromJsonString(
  Schema.Record(Schema.String, Schema.Unknown)
);

const decodeBody = Schema.decodeUnknownSync(InitBodySchema);

// The JSON body of the first request to `path`.
const bodyOf = (server: PlatformServer, path: string) => {
  const [request] = calls(server, "POST", path);

  assert(request !== undefined);

  return decodeBody(textOf(request));
};

const video = (size = 4096) => testFile("video", size, "video/mp4");

const photo = () => testFile("image", 2048, "image/jpeg");

const decodeStep = Schema.decodeUnknownSync(
  Schema.toCodecJson(TikTokProgressSchema)
);

// What the client journaled under the key, in order.
const stepsOf = (journal: ProgressLog["Service"]) =>
  journal
    .recorded(key)
    .pipe(Effect.map((steps) => steps.map((step) => decodeStep(step))));

// The publish_id TikTok gave the post, which the fake made.
const publishIdOf = (server: {
  readonly posts: () => readonly { readonly publishId: string }[];
}) => {
  const [made] = server.posts();

  assert(made !== undefined);

  return made.publishId;
};

describe(chunkPlanOf, () => {
  it.each([
    { count: 1, label: "under 5 MB, whole", last: 4_194_304, size: 4_194_304 },
    { count: 1, label: "of one chunk", last: 10_000_000, size: 10_000_000 },
    { count: 1, label: "under two chunks", last: 19_999_999, size: 19_999_999 },
    { count: 5, label: "TikTok's example", last: 10_000_123, size: 50_000_123 },
    { count: 107, label: "of 1 GiB", last: 13_741_824, size: 1_073_741_824 },
  ])(
    "cuts a video $label within TikTok's chunk rules",
    ({ count, last, size }) => {
      const plan = chunkPlanOf(size);

      expect(plan.count).toBe(count);
      expect(plan.lastSize).toBe(last);
      expect(plan.chunkSize * (plan.count - 1) + plan.lastSize).toBe(size);
      expect(Math.floor(size / plan.chunkSize)).toBe(plan.count);
      expect(plan.lastSize).toBeLessThanOrEqual(128_000_000);
    }
  );
});

describe("publishing on TikTok", () => {
  it.live("uploads a video in one chunk, as the creator chose", () =>
    Effect.gen(function* uploads() {
      const file = video();
      const { client, journal, tiktok } = yield* onTikTok({ files: [file] });

      const result = yield* client.publish(
        yield* post({ media: [attached(file)] })
      );

      assert.deepStrictEqual(result, {
        _tag: "published",
        permalink: `https://www.tiktok.com/@acme_example/video/${tiktokPostId}`,
        platformPostId: PlatformPostIdSchema.make(tiktokPostId),
      });

      const body = bodyOf(tiktok, "/v2/post/publish/video/init/");

      assert.deepStrictEqual(body, {
        post_info: {
          brand_content_toggle: false,
          brand_organic_toggle: false,
          disable_comment: true,
          disable_duet: true,
          disable_stitch: true,
          is_aigc: false,
          privacy_level: "PUBLIC_TO_EVERYONE",
          title: "A synthetic #launch video",
        },
        source_info: {
          chunk_size: 4096,
          source: "FILE_UPLOAD",
          total_chunk_count: 1,
          video_size: 4096,
        },
      });

      const [put] = calls(tiktok, "PUT", "/upload/");

      assert(put !== undefined);
      assert.strictEqual(headerOf(put, "content-range"), "bytes 0-4095/4096");
      assert.strictEqual(headerOf(put, "content-type"), "video/mp4");
      // The upload URL carries its own credentials, never the creator's.
      assert.strictEqual(headerOf(put, "authorization"), "");

      // Creator info before the post, as TikTok asks.
      assert.deepStrictEqual(
        tiktok
          .requests()
          .map(({ method, path }) => `${method} ${path}`)
          .slice(0, 2),
        [
          "POST /v2/post/publish/creator_info/query/",
          "POST /v2/post/publish/video/init/",
        ]
      );

      const publishId = publishIdOf(tiktok);

      assert.deepStrictEqual(yield* stepsOf(journal), [
        { _tag: "uploading", publishId },
        { _tag: "finishing", publishId },
      ]);
    }).pipe(Effect.scoped)
  );

  it.live("uploads a larger video in 10 MB chunks, in order", () =>
    Effect.gen(function* chunks() {
      const file = video(25_000_123);
      const { client, tiktok } = yield* onTikTok({ files: [file] });

      const result = yield* client.publish(
        yield* post({ media: [attached(file)] })
      );

      assert.strictEqual(result._tag, "published");
      assert.deepStrictEqual(
        tiktok.posts()[0]?.chunks,
        [10_000_000, 15_000_123]
      );
      assert.deepStrictEqual(
        calls(tiktok, "PUT", "/upload/").map((put) =>
          headerOf(put, "content-range")
        ),
        ["bytes 0-9999999/25000123", "bytes 10000000-25000122/25000123"]
      );
    }).pipe(Effect.scoped)
  );

  it.live("sends the creator's interactions and disclosures", () =>
    Effect.gen(function* disclosures() {
      const file = video();

      const { client, tiktok } = yield* onTikTok({
        api: { creator: { ...publicCreator, stitch_disabled: true } },
        files: [file],
      });

      yield* client.publish(
        yield* post({
          media: [attached(file)],
          options: Option.some(
            chosen({
              aiGenerated: true,
              brandContent: true,
              commercialContent: true,
              disableComment: false,
              disableDuet: false,
              disableStitch: false,
              privacyLevel: "MUTUAL_FOLLOW_FRIENDS",
            })
          ),
          text: "",
        })
      );

      assert.deepStrictEqual(
        bodyOf(tiktok, "/v2/post/publish/video/init/")["post_info"],
        {
          brand_content_toggle: true,
          brand_organic_toggle: false,
          disable_comment: false,
          disable_duet: false,
          // The creator turned Stitches off.
          disable_stitch: true,
          is_aigc: true,
          privacy_level: "MUTUAL_FOLLOW_FRIENDS",
        }
      );
    }).pipe(Effect.scoped)
  );

  it.live(
    "lets TikTok pull a video the store serves under the verified prefix",
    () =>
      Effect.gen(function* pulls() {
        const file = video();

        const { client, journal, tiktok } = yield* onTikTok({
          files: [file],
          pullFrom: "https://media.test/",
        });

        const result = yield* client.publish(
          yield* post({ media: [attached(file)] })
        );

        assert.strictEqual(result._tag, "published");
        assert.deepStrictEqual(
          bodyOf(tiktok, "/v2/post/publish/video/init/")["source_info"],
          {
            source: "PULL_FROM_URL",
            video_url: `https://media.test/${file.media.mediaId}`,
          }
        );
        assert.lengthOf(calls(tiktok, "PUT", "/upload/"), 0);

        const publishId = publishIdOf(tiktok);

        assert.deepStrictEqual(yield* stepsOf(journal), [
          { _tag: "pulling", kind: "video" },
          { _tag: "pulled", kind: "video", publishId },
        ]);
      }).pipe(Effect.scoped)
  );

  it.live("uploads a video the store serves elsewhere", () =>
    Effect.gen(function* elsewhere() {
      const file = video();

      const { client, tiktok } = yield* onTikTok({
        files: [file],
        pullFrom: "https://verified.example/media/",
      });

      yield* client.publish(yield* post({ media: [attached(file)] }));

      assert.strictEqual(tiktok.posts()[0]?.source, "FILE_UPLOAD");
    }).pipe(Effect.scoped)
  );

  it.live("posts photos TikTok pulls, the text as their description", () =>
    Effect.gen(function* photos() {
      const first = photo();
      const second = photo();

      const { client, tiktok } = yield* onTikTok({
        files: [first, second],
        pullFrom: "https://media.test/",
      });

      const result = yield* client.publish(
        yield* post({
          media: [attached(first), attached(second)],
          options: Option.some(chosen({ aiGenerated: true })),
        })
      );

      assert.deepStrictEqual(result, {
        _tag: "published",
        permalink: `https://www.tiktok.com/@acme_example/photo/${tiktokPostId}`,
        platformPostId: PlatformPostIdSchema.make(tiktokPostId),
      });
      assert.deepStrictEqual(bodyOf(tiktok, "/v2/post/publish/content/init/"), {
        is_aigc: true,
        media_type: "PHOTO",
        post_info: {
          brand_content_toggle: false,
          brand_organic_toggle: false,
          description: "A synthetic #launch video",
          disable_comment: true,
          privacy_level: "PUBLIC_TO_EVERYONE",
        },
        post_mode: "DIRECT_POST",
        source_info: {
          photo_cover_index: 0,
          photo_images: [
            `https://media.test/${first.media.mediaId}`,
            `https://media.test/${second.media.mediaId}`,
          ],
          source: "PULL_FROM_URL",
        },
      });
    }).pipe(Effect.scoped)
  );

  it.live(
    "refuses photos it has no verified address for, sending nothing",
    () =>
      Effect.gen(function* unverified() {
        const file = photo();
        const { client, tiktok } = yield* onTikTok({ files: [file] });

        const refused = yield* client
          .publish(yield* post({ media: [attached(file)] }))
          .pipe(Effect.flip);

        assert.deepStrictEqual(
          refused,
          new BadRequest({ code: "url_ownership_unverified" })
        );
        assert.lengthOf(tiktok.posts(), 0);
      }).pipe(Effect.scoped)
  );

  it.live("publishes a post only its creator sees by its publish_id", () =>
    Effect.gen(function* onlyMe() {
      const file = video();

      const { client, tiktok } = yield* onTikTok({
        api: {
          creator: {
            ...publicCreator,
            privacy_level_options: ["FOLLOWER_OF_CREATOR", "SELF_ONLY"],
          },
        },
        files: [file],
      });

      const result = yield* client.publish(
        yield* post({
          media: [attached(file)],
          options: Option.some(chosen({ privacyLevel: "SELF_ONLY" })),
        })
      );

      assert.deepStrictEqual(result, {
        _tag: "published",
        platformPostId: PlatformPostIdSchema.make(
          tiktok.posts()[0]?.publishId ?? ""
        ),
      });
    }).pipe(Effect.scoped)
  );

  it.live("refuses what the creator's settings forbid, before any post", () =>
    Effect.gen(function* forbidden() {
      const file = video();

      const offered = yield* onTikTok({
        api: {
          creator: {
            ...publicCreator,
            privacy_level_options: ["FOLLOWER_OF_CREATOR", "SELF_ONLY"],
          },
        },
        files: [file],
      });

      assert.deepStrictEqual(
        yield* offered.client
          .publish(yield* post({ media: [attached(file)] }))
          .pipe(Effect.flip),
        new BadRequest({ code: "privacy_level_option_mismatch" })
      );

      const short = yield* onTikTok({
        api: {
          creator: { ...publicCreator, max_video_post_duration_sec: 3 },
        },
        files: [file],
      });

      assert.deepStrictEqual(
        yield* short.client
          .publish(yield* post({ media: [attached(file)] }))
          .pipe(Effect.flip),
        new MediaRejected({ code: "duration_check_failed" })
      );

      const capped = yield* onTikTok({
        api: { creatorError: "spam_risk_too_many_posts" },
        files: [file],
      });

      assert.deepStrictEqual(
        yield* capped.client
          .publish(yield* post({ media: [attached(file)] }))
          .pipe(Effect.flip),
        new RateLimited({ retryAfter: Duration.hours(1) })
      );

      for (const { tiktok } of [offered, short, capped]) {
        assert.lengthOf(tiktok.posts(), 0);
      }
    }).pipe(Effect.scoped)
  );

  it.live(
    "compares a video's length with the creator's in whole milliseconds, as scheduling did",
    () =>
      Effect.gen(function* wholeMilliseconds() {
        const probed = video();

        // A fraction of a millisecond past 4 seconds, which scheduling
        // reads as 4,000 ms: within the creator's 4 seconds.
        const file: TestFile = {
          ...probed,
          media: {
            ...probed.media,
            duration: Option.some(Duration.millis(4000.4)),
          },
        };

        const { client, tiktok } = yield* onTikTok({
          api: {
            creator: { ...publicCreator, max_video_post_duration_sec: 4 },
          },
          files: [file],
        });

        const result = yield* client.publish(
          yield* post({ media: [attached(file)] })
        );

        assert.strictEqual(result._tag, "published");
        assert.lengthOf(tiktok.posts(), 1);
      }).pipe(Effect.scoped)
  );

  it.live("fails with appNotAudited when TikTok takes only private posts", () =>
    Effect.gen(function* unaudited() {
      const file = video();
      const { client, tiktok } = yield* onTikTok({ files: [file] });

      tiktok.failNext("POST /v2/post/publish/video/init/", [
        json(
          {
            error: {
              code: "unaudited_client_can_only_post_to_private_accounts",
              log_id: "synthetic",
              message: "Synthetic.",
            },
          },
          403
        ),
      ]);

      assert.deepStrictEqual(
        yield* client
          .publish(yield* post({ media: [attached(file)] }))
          .pipe(Effect.flip),
        new BadRequest({ code: "appNotAudited" })
      );
    }).pipe(Effect.scoped)
  );

  it.live("fails as TikTok's processing does, with its reason", () =>
    Effect.gen(function* processingFails() {
      const file = video();

      const { client } = yield* onTikTok({
        api: { outcome: { failReason: "frame_rate_check_failed" } },
        files: [file],
      });

      assert.deepStrictEqual(
        yield* client
          .publish(yield* post({ media: [attached(file)] }))
          .pipe(Effect.flip),
        new MediaRejected({ code: "frame_rate_check_failed" })
      );
    }).pipe(Effect.scoped)
  );

  it.live.each([
    { label: "fewer", served: 20_000_000 - 1 },
    { label: "more", served: 20_000_000 + 10_000_000 },
  ])(
    "sends no last chunk when the store serves $label bytes than the file has",
    ({ served }) =>
      Effect.gen(function* mismatched() {
        const stored = testFile("video", served, "video/mp4");

        // The file's size as the media library recorded it.
        const file: TestFile = {
          ...stored,
          media: { ...stored.media, byteSize: 20_000_000 },
        };

        const { client, journal, tiktok } = yield* onTikTok({ files: [file] });

        const failure = yield* client
          .publish(yield* post({ media: [attached(file)] }))
          .pipe(Effect.flip);

        assert.strictEqual(failure._tag, "PlatformUnavailable");

        // Nothing that can make the post live was sent, nor journaled.
        const steps = yield* stepsOf(journal);

        assert.isFalse(steps.some(({ _tag }) => _tag === "finishing"));
        assert.isBelow(
          tiktok.posts().reduce((sum, made) => sum + made.bytes, 0),
          20_000_000
        );
      }).pipe(Effect.scoped)
  );

  it.live("renews a token TikTok refused, then posts once", () =>
    Effect.gen(function* renews() {
      const file = video();

      const { client, credentials, tiktok } = yield* onTikTok({
        files: [file],
        tokens: ["act.tiktok-expired", tiktokToken],
      });

      const result = yield* client.publish(
        yield* post({ media: [attached(file)] })
      );

      assert.strictEqual(result._tag, "published");
      assert.strictEqual(yield* credentials.renewals, 1);
      assert.lengthOf(tiktok.posts(), 1);
    }).pipe(Effect.scoped)
  );

  it.live("sends the last chunk again when TikTok did not answer it", () =>
    Effect.gen(function* lastAgain() {
      const file = video();
      const { client, tiktok } = yield* onTikTok({ files: [file] });

      tiktok.failNext("PUT /upload/", [dropped]);

      const result = yield* client.publish(
        yield* post({ media: [attached(file)] })
      );

      assert.strictEqual(result._tag, "published");
      assert.lengthOf(calls(tiktok, "PUT", "/upload/"), 2);
      assert.lengthOf(tiktok.posts(), 1);
    }).pipe(Effect.scoped)
  );

  it.live("is unconfirmed when TikTok does not answer a post it pulls", () =>
    Effect.gen(function* lostInit() {
      const file = video();

      const { client, journal, tiktok } = yield* onTikTok({
        files: [file],
        pullFrom: "https://media.test/",
      });

      tiktok.failNext("POST /v2/post/publish/video/init/", [dropped]);

      const result = yield* client.publish(
        yield* post({ media: [attached(file)] })
      );

      assert.deepStrictEqual(result, {
        _tag: "unconfirmed",
        reason: "noResponse",
      });
      assert.lengthOf(calls(tiktok, "POST", "/v2/post/publish/video/init/"), 1);
      assert.deepStrictEqual(yield* stepsOf(journal), [
        { _tag: "pulling", kind: "video" },
      ]);
    }).pipe(Effect.scoped)
  );

  it.live("is unconfirmed when TikTok keeps processing past the limit", () =>
    Effect.gen(function* slow() {
      const file = video();

      const { client } = yield* onTikTok({
        api: { processing: 1000 },
        files: [file],
      });

      assert.deepStrictEqual(
        yield* client.publish(yield* post({ media: [attached(file)] })),
        { _tag: "unconfirmed", reason: "noResponse" }
      );
    }).pipe(Effect.scoped)
  );
});

describe("resuming a TikTok post", () => {
  it.live(
    "keeps to the journaled publish_id, even one TikTok cannot find",
    () =>
      Effect.gen(function* resumesPolling() {
        const file = video();

        // The earlier run may have sent its last chunk.
        const { client, tiktok } = yield* onTikTok({
          files: [file],
          recorded: { _tag: "finishing", publishId: "v_pub_video~v2.earlier" },
        });

        const resumed = yield* client.resume(
          yield* post({ media: [attached(file)] })
        );

        assert.strictEqual(resumed._tag, "unconfirmed");
        assert.lengthOf(tiktok.posts(), 0);
        assert.lengthOf(
          calls(tiktok, "POST", "/v2/post/publish/video/init/"),
          0
        );
        assert.isAbove(
          calls(tiktok, "POST", "/v2/post/publish/status/fetch/").length,
          0
        );
      }).pipe(Effect.scoped)
  );

  it.live("finds the post the earlier run's last chunk made", () =>
    Effect.gen(function* found() {
      const file = video();
      const { client, journal, tiktok } = yield* onTikTok({ files: [file] });

      yield* client.publish(yield* post({ media: [attached(file)] }));

      const [made] = tiktok.posts();

      assert(made !== undefined);
      yield* journal.begin("another-key", {
        _tag: "finishing",
        publishId: made.publishId,
      });

      const resumed = yield* client.resume(
        yield* post({ idempotencyKey: "another-key", media: [attached(file)] })
      );

      assert.deepStrictEqual(resumed, {
        _tag: "published",
        permalink: `https://www.tiktok.com/@acme_example/video/${tiktokPostId}`,
        platformPostId: PlatformPostIdSchema.make(tiktokPostId),
      });
      assert.lengthOf(tiktok.posts(), 1);
    }).pipe(Effect.scoped)
  );

  it.live("starts over when the earlier run never sent its last chunk", () =>
    Effect.gen(function* startsOver() {
      const file = video();

      const { client, tiktok } = yield* onTikTok({
        files: [file],
        recorded: { _tag: "uploading", publishId: "v_pub_video~v2.earlier" },
      });

      const resumed = yield* client.resume(
        yield* post({ media: [attached(file)] })
      );

      assert.strictEqual(resumed._tag, "published");
      assert.lengthOf(tiktok.posts(), 1);
    }).pipe(Effect.scoped)
  );

  it.live("publishes when the earlier run recorded nothing", () =>
    Effect.gen(function* nothing() {
      const file = video();
      const { client, tiktok } = yield* onTikTok({ files: [file] });

      const resumed = yield* client.resume(
        yield* post({ media: [attached(file)] })
      );

      assert.strictEqual(resumed._tag, "published");
      assert.lengthOf(tiktok.posts(), 1);
    }).pipe(Effect.scoped)
  );

  it.live("never sends again a pull whose answer was lost", () =>
    Effect.gen(function* lostPull() {
      const file = video();

      const { client, tiktok } = yield* onTikTok({
        files: [file],
        pullFrom: "https://media.test/",
        recorded: { _tag: "pulling", kind: "video" },
      });

      assert.deepStrictEqual(
        yield* client.resume(yield* post({ media: [attached(file)] })),
        { _tag: "unconfirmed", reason: "interrupted" }
      );
      assert.lengthOf(tiktok.requests(), 0);
    }).pipe(Effect.scoped)
  );

  it.live("cannot tell a call begun under another key", () =>
    Effect.gen(function* unknownKey() {
      const file = video();
      const { client, tiktok } = yield* onTikTok({ files: [file] });

      assert.deepStrictEqual(
        yield* client.resume(
          yield* post({ idempotencyKey: "not-begun", media: [attached(file)] })
        ),
        { _tag: "unconfirmed", reason: "interrupted" }
      );
      assert.lengthOf(tiktok.requests(), 0);
    }).pipe(Effect.scoped)
  );
});
