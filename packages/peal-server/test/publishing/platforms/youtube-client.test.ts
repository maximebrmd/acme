import { assert, describe, it } from "@effect/vitest";
import { Context, DateTime, Effect, Layer, Option, Schema } from "effect";

import type { OutgoingPost } from "#publishing/application/platform-client.ts";
import { YouTubeOptions } from "#publishing/domain/youtube-options.ts";
import {
  quotaDayOf,
  untilQuotaReset,
} from "#publishing/infrastructure/platforms/youtube/quota-day.ts";
import { uploadsBucket } from "#publishing/infrastructure/platforms/youtube/youtube-client.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import { MediaRejected } from "#shared/domain/media-rejected.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import { RateLimited } from "#shared/domain/rate-limited.ts";
import { fakeYouTubeApi } from "#test/publishing/fakes/fake-youtube-api.ts";
import type { Processing } from "#test/publishing/fakes/fake-youtube-api.ts";
import {
  headerOf,
  json,
  jsonBodyOf,
} from "#test/publishing/fakes/platform-server.ts";
import type { PlatformRequest } from "#test/publishing/fakes/platform-server.ts";

import {
  attached,
  CredentialLog,
  credentialsOf,
  emptyLedger,
  outgoing,
  testFile,
  youtubeClientWith,
} from "./support.ts";
import type { UploadLedger } from "./support.ts";

const channelAccount = "UCsyntheticChannel000001";

const kib = 1024;

// Three parts of 256 KiB, the last one shorter.
const video = testFile("video", 600 * kib);

const finished = new YouTubeOptions({
  categoryId: "22",
  madeForKids: false,
  tags: ["field notes", "launch"],
  title: "A synthetic launch video",
});

// YouTube, and the client publishing to it as the synthetic channel.
const onYouTube = Effect.fn("test.onYouTube")(function* onYouTube(
  options: {
    readonly dailyUploads?: number;
    readonly ledger?: UploadLedger;
    readonly privacy?: "private" | "public";
    readonly processing?: Processing;
    readonly tokens?: readonly string[];
  } = {}
) {
  const youtube = yield* fakeYouTubeApi({
    privacy: options.privacy ?? "public",
    processing: options.processing ?? { _tag: "processed", after: 1 },
    tokens: ["token-2", "token-1"],
  });

  const ledger = options.ledger ?? emptyLedger();

  const credentials = yield* Layer.build(
    credentialsOf(
      { accountId: channelAccount, platform: "youtube" },
      options.tokens ?? ["token-1"]
    )
  );

  const client = yield* youtubeClientWith({
    api: youtube.url,
    credentials: Layer.succeedContext(credentials),
    dailyUploads: options.dailyUploads ?? 100,
    files: [video],
    ledger,
  });

  return {
    client,
    ledger,
    log: Context.get(credentials, CredentialLog),
    youtube,
  };
});

const post = (
  fields: Partial<OutgoingPost> = {},
  chosen: YouTubeOptions = finished
) =>
  outgoing({
    media: [attached(video, "A synthetic video")],
    options: Option.some(chosen),
    text: "What we found in the field, in three minutes.",
    ...fields,
    accountId: channelAccount,
  });

const sessionsOpened = (requests: readonly PlatformRequest[]) =>
  requests.filter(
    ({ method, path }) =>
      method === "POST" && path === "/upload/youtube/v3/videos"
  );

const parts = (requests: readonly PlatformRequest[]) =>
  requests.flatMap((request) =>
    request.method === "PUT" && request.path === "/upload/youtube/v3/videos"
      ? [headerOf(request, "content-range")]
      : []
  );

const MetadataSchema = Schema.Struct({
  snippet: Schema.Struct({
    categoryId: Schema.optionalKey(Schema.String),
    description: Schema.String,
    tags: Schema.optionalKey(Schema.Array(Schema.String)),
    title: Schema.String,
  }),
  status: Schema.Struct({
    containsSyntheticMedia: Schema.Boolean,
    privacyStatus: Schema.String,
    selfDeclaredMadeForKids: Schema.Boolean,
  }),
});

const published = (id: string) => ({
  _tag: "published" as const,
  permalink: `https://www.youtube.com/watch?v=${id}`,
  platformPostId: PlatformPostIdSchema.make(id),
});

describe("publishing on YouTube", () => {
  it.live(
    "uploads the video in parts, with its options, and waits for its processing",
    () =>
      Effect.gen(function* uploads() {
        const { client, ledger, youtube } = yield* onYouTube();
        const sent = yield* post();

        const result = yield* client.publish(sent);

        assert.deepStrictEqual(result, published("synthVideo01"));

        const [opened] = sessionsOpened(youtube.requests());

        assert(opened !== undefined);
        assert.strictEqual(opened.query.get("uploadType"), "resumable");
        assert.strictEqual(opened.query.get("part"), "snippet,status");
        assert.strictEqual(opened.query.get("notifySubscribers"), "true");
        assert.strictEqual(
          headerOf(opened, "x-upload-content-length"),
          "614400"
        );
        assert.strictEqual(
          headerOf(opened, "x-upload-content-type"),
          "video/mp4"
        );
        assert.deepStrictEqual(jsonBodyOf(MetadataSchema)(opened), {
          snippet: {
            categoryId: "22",
            description: sent.text,
            tags: ["field notes", "launch"],
            title: "A synthetic launch video",
          },
          status: {
            containsSyntheticMedia: false,
            privacyStatus: "public",
            selfDeclaredMadeForKids: false,
          },
        });

        assert.deepStrictEqual(parts(youtube.requests()), [
          "bytes 0-262143/614400",
          "bytes 262144-524287/614400",
          "bytes 524288-614399/614400",
        ]);

        const [made] = youtube.videos();

        assert.deepStrictEqual(made?.bytes, video.bytes);

        // Polled until processed, with the channel's token.
        assert.isAbove(
          youtube.requests().filter(({ path }) => path === "/youtube/v3/videos")
            .length,
          0
        );

        // The session was journaled, and the video recorded in it.
        const journaled = ledger.sessions.get(sent.idempotencyKey);

        assert.deepStrictEqual(journaled?.videoId, Option.some("synthVideo01"));
        assert.isTrue(journaled?.finalPartSent);
        assert.deepStrictEqual(journaled?.sessionUrl, Option.none());
        assert.strictEqual(
          ledger.spent.get(
            `${uploadsBucket}:${quotaDayOf(sent.startedAt).year}-${quotaDayOf(sent.startedAt).month}-${quotaDayOf(sent.startedAt).day}`
          ),
          1
        );
      })
  );

  it.live("resumes a part YouTube failed on, where the session stands", () =>
    Effect.gen(function* resumes() {
      const { client, youtube } = yield* onYouTube();

      youtube.script.push("PUT /upload/youtube/v3/videos", [
        json({ error: { code: 503 } }, 503),
      ]);

      const result = yield* client.publish(yield* post());

      assert.deepStrictEqual(result, published("synthVideo01"));
      assert.strictEqual(youtube.videos().length, 1);
      assert.strictEqual(sessionsOpened(youtube.requests()).length, 1);
      assert.deepStrictEqual(parts(youtube.requests()).slice(0, 3), [
        "bytes 0-262143/614400",
        "bytes */614400",
        "bytes 0-262143/614400",
      ]);
    })
  );

  it.live("asks the session after a last part without an answer", () =>
    Effect.gen(function* lastPart() {
      const { client, youtube } = yield* onYouTube();

      // YouTube takes the third part, the last, and the line drops.
      youtube.acceptThenDrop(3);

      const result = yield* client.publish(yield* post());

      assert.deepStrictEqual(result, published("synthVideo01"));
      assert.strictEqual(youtube.videos().length, 1);
      assert.include(parts(youtube.requests()), "bytes */614400");
    })
  );

  it.live("resumes a run found in flight from its journaled session", () =>
    Effect.gen(function* inFlight() {
      const { client, ledger, youtube } = yield* onYouTube();
      const sent = yield* post();

      // An earlier run opened the session, sent a part, and stopped.
      const location = yield* Effect.promise(async () => {
        const opened = await fetch(
          `${youtube.url}/upload/youtube/v3/videos?uploadType=resumable`,
          {
            body: "{}",
            headers: {
              authorization: "Bearer token-1",
              "content-type": "application/json",
              "x-upload-content-length": "614400",
            },
            method: "POST",
          }
        );

        const url = opened.headers.get("location") ?? "";

        await fetch(url, {
          body: video.bytes.slice(0, 256 * kib),
          headers: {
            authorization: "Bearer token-1",
            "content-range": "bytes 0-262143/614400",
          },
          method: "PUT",
        });

        return url;
      });

      ledger.sessions.set(sent.idempotencyKey, {
        byteSize: video.media.byteSize,
        finalPartSent: false,
        sessionUrl: Option.some(location),
        videoId: Option.none(),
      });

      const result = yield* client.resume(sent);

      assert.deepStrictEqual(result, published("synthVideo01"));
      assert.strictEqual(sessionsOpened(youtube.requests()).length, 1);
      assert.deepStrictEqual(youtube.videos()[0]?.bytes, video.bytes);
      assert.include(parts(youtube.requests()), "bytes 262144-524287/614400");
    })
  );

  it.live("takes the video a resumed session already made", () =>
    Effect.gen(function* madeAlready() {
      const { client, youtube } = yield* onYouTube();
      const sent = yield* post();

      yield* client.publish(sent);

      const again = yield* client.resume(sent);

      assert.deepStrictEqual(again, published("synthVideo01"));
      assert.strictEqual(youtube.videos().length, 1);
      assert.strictEqual(sessionsOpened(youtube.requests()).length, 1);
    })
  );

  // An earlier run sent the last part, YouTube made the video, and the run
  // stopped before recording it.
  const madeUnrecorded = Effect.fn("test.madeUnrecorded")(
    function* madeUnrecorded() {
      const youtube = yield* onYouTube();
      const sent = yield* post();

      yield* youtube.client.publish(sent);

      const [session] = youtube.youtube.sessions();

      assert(session !== undefined);
      youtube.ledger.sessions.set(sent.idempotencyKey, {
        byteSize: video.media.byteSize,
        finalPartSent: true,
        sessionUrl: Option.some(
          `${youtube.youtube.url}/upload/youtube/v3/videos?uploadType=resumable&upload_id=${session.id}`
        ),
        videoId: Option.none(),
      });

      return { ...youtube, sent };
    }
  );

  it.live("never uploads again when the journal cannot be read", () =>
    Effect.gen(function* journalDown() {
      const { client, ledger, sent, youtube } = yield* madeUnrecorded();

      ledger.unreadable = true;

      assert.deepStrictEqual(yield* client.resume(sent), {
        _tag: "unconfirmed",
        reason: "interrupted",
      });
      assert.strictEqual(youtube.videos().length, 1);
      assert.strictEqual(sessionsOpened(youtube.requests()).length, 1);
    })
  );

  it.live(
    "never uploads again when YouTube rate limits the session's status",
    () =>
      Effect.gen(function* statusLimited() {
        const { client, sent, youtube } = yield* madeUnrecorded();

        youtube.script.push(
          "PUT /upload/youtube/v3/videos",
          Array.from({ length: 8 }, () =>
            youtube.googleError(429, "rateLimitExceeded")
          )
        );

        assert.deepStrictEqual(yield* client.resume(sent), {
          _tag: "unconfirmed",
          reason: "interrupted",
        });
        assert.strictEqual(youtube.videos().length, 1);
        assert.strictEqual(sessionsOpened(youtube.requests()).length, 1);
      })
  );

  it.live(
    "restarts an expired session whose last part never left, and leaves one that did unconfirmed",
    () =>
      Effect.gen(function* expired() {
        const { client, ledger, youtube } = yield* onYouTube();
        const sent = yield* post();

        ledger.sessions.set(sent.idempotencyKey, {
          byteSize: video.media.byteSize,
          finalPartSent: false,
          sessionUrl: Option.some(
            `${youtube.url}/upload/youtube/v3/videos?upload_id=99`
          ),
          videoId: Option.none(),
        });

        const restarted = yield* client.resume(sent);

        assert.deepStrictEqual(restarted, published("synthVideo01"));
        assert.strictEqual(sessionsOpened(youtube.requests()).length, 1);

        const other = yield* post({
          idempotencyKey: "2f1c0c7d0e9a4b3c8d7e6f5a4b3c2d1e",
        });

        ledger.sessions.set(other.idempotencyKey, {
          byteSize: video.media.byteSize,
          finalPartSent: true,
          sessionUrl: Option.some(
            `${youtube.url}/upload/youtube/v3/videos?upload_id=98`
          ),
          videoId: Option.none(),
        });

        const unknown = yield* client.resume(other);

        assert.deepStrictEqual(unknown, {
          _tag: "unconfirmed",
          reason: "interrupted",
        });
        assert.strictEqual(youtube.videos().length, 1);
      })
  );

  it.live(
    "waits for the next Pacific midnight once the day's uploads are spent",
    () =>
      Effect.gen(function* spent() {
        const { client, youtube } = yield* onYouTube({ dailyUploads: 0 });
        const sent = yield* post();

        const refused = yield* client.publish(sent).pipe(Effect.flip);

        assert.deepStrictEqual(
          refused,
          new RateLimited({
            code: "quotaExceeded",
            retryAfter: untilQuotaReset(yield* DateTime.now),
          })
        );
        assert.strictEqual(youtube.requests().length, 0);
      })
  );

  it.live("counts the day spent when YouTube says its quota is", () =>
    Effect.gen(function* quotaAnswer() {
      const { client, ledger, youtube } = yield* onYouTube();

      youtube.script.push("POST /upload/youtube/v3/videos", [
        youtube.googleError(403, "quotaExceeded"),
      ]);

      const refused = yield* client.publish(yield* post()).pipe(Effect.flip);

      assert(refused._tag === "RateLimited");
      assert.strictEqual(refused.code, "quotaExceeded");
      assert.deepStrictEqual([...ledger.spent.values()], [100]);

      // The next upload of the day asks YouTube nothing.
      const requests = youtube.requests().length;

      const again = yield* client
        .publish(
          yield* post({ idempotencyKey: "3f1c0c7d0e9a4b3c8d7e6f5a4b3c2d1e" })
        )
        .pipe(Effect.flip);

      assert.strictEqual(again._tag, "RateLimited");
      assert.strictEqual(youtube.requests().length, requests);
    })
  );

  it.live("waits when the channel uploaded all it may today", () =>
    Effect.gen(function* uploadLimit() {
      const { client, youtube } = yield* onYouTube();

      youtube.script.push("POST /upload/youtube/v3/videos", [
        youtube.googleError(400, "uploadLimitExceeded"),
      ]);

      const refused = yield* client.publish(yield* post()).pipe(Effect.flip);

      assert(refused._tag === "RateLimited");
      assert.strictEqual(refused.code, "uploadLimitExceeded");
    })
  );

  it.live("refuses metadata YouTube refuses, with its reason", () =>
    Effect.gen(function* invalid() {
      const { client, youtube } = yield* onYouTube();

      youtube.script.push("POST /upload/youtube/v3/videos", [
        youtube.googleError(400, "invalidTitle"),
      ]);

      const refused = yield* client.publish(yield* post()).pipe(Effect.flip);

      assert.deepStrictEqual(refused, new BadRequest({ code: "invalidTitle" }));
    })
  );

  it.live("renews a token YouTube refused, then uploads with the new one", () =>
    Effect.gen(function* renews() {
      const { client, log, youtube } = yield* onYouTube({
        tokens: ["token-expired", "token-2"],
      });

      const result = yield* client.publish(yield* post());

      assert.deepStrictEqual(result, published("synthVideo01"));
      assert.strictEqual(yield* log.renewals, 1);
      assert.strictEqual(youtube.videos().length, 1);
    })
  );

  it.live(
    "ends with YouTube's reason when processing fails or rejects the video",
    () =>
      Effect.gen(function* processing() {
        const failed = yield* onYouTube({
          processing: { _tag: "failed", reason: "codec" },
        });

        assert.deepStrictEqual(
          yield* failed.client.publish(yield* post()).pipe(Effect.flip),
          new MediaRejected({ code: "codec" })
        );

        const rejected = yield* onYouTube({
          processing: { _tag: "rejected", reason: "duplicate" },
        });

        assert.deepStrictEqual(
          yield* rejected.client.publish(yield* post()).pipe(Effect.flip),
          new BadRequest({ code: "duplicate" })
        );
      })
  );

  it.live("tells a video YouTube kept private although asked to show it", () =>
    Effect.gen(function* keptPrivate() {
      const { client } = yield* onYouTube({ privacy: "private" });

      assert.deepStrictEqual(yield* client.publish(yield* post()), {
        ...published("synthVideo01"),
        keptPrivate: true,
      });

      const asked = yield* onYouTube({ privacy: "private" });

      assert.deepStrictEqual(
        yield* asked.client.publish(
          yield* post(
            {},
            new YouTubeOptions({
              madeForKids: false,
              privacy: "private",
              title: "A synthetic private video",
            })
          )
        ),
        published("synthVideo01")
      );
    })
  );

  it.live("refuses a target without its options, or without one video", () =>
    Effect.gen(function* refuses() {
      const { client, youtube } = yield* onYouTube();

      assert.deepStrictEqual(
        yield* client
          .publish(yield* post({ options: Option.none() }))
          .pipe(Effect.flip),
        new BadRequest({ code: "optionsMissing" })
      );
      assert.deepStrictEqual(
        yield* client.publish(yield* post({ media: [] })).pipe(Effect.flip),
        new MediaRejected({ code: "oneVideoRequired" })
      );
      assert.strictEqual(youtube.requests().length, 0);
    })
  );
});
