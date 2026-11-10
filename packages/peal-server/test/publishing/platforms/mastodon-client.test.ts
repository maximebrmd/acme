import { assert, describe, it } from "@effect/vitest";
import { Context, DateTime, Duration, Effect, Layer, Option } from "effect";

import { BadRequest } from "#shared/domain/bad-request.ts";
import { MediaRejected } from "#shared/domain/media-rejected.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import { RateLimited } from "#shared/domain/rate-limited.ts";
import { TokenExpired } from "#shared/domain/token-expired.ts";
import {
  fakeMastodonInstance,
  mastodonAccountId,
} from "#test/publishing/fakes/fake-mastodon-instance.ts";
import type { FakeMastodonOptions } from "#test/publishing/fakes/fake-mastodon-instance.ts";
import {
  empty,
  formPartsOf,
  headerOf,
  json,
} from "#test/publishing/fakes/platform-server.ts";
import type { PlatformServer } from "#test/publishing/fakes/platform-server.ts";

import {
  attached,
  CredentialLog,
  credentialsOf,
  mastodonClientWith,
  outgoing,
  testFile,
} from "./support.ts";
import type { TestFile } from "./support.ts";

// The instance, and the client publishing to it as the synthetic account.
const onInstance = Effect.fn("test.onInstance")(function* onInstance(
  options: {
    readonly files?: readonly TestFile[];
    readonly instance?: FakeMastodonOptions;
    readonly tokens?: readonly string[];
  } = {}
) {
  const instance = yield* fakeMastodonInstance(options.instance);
  const accountId = mastodonAccountId(instance.url);

  const credentials = yield* Layer.build(
    credentialsOf(
      { accountId, platform: "mastodon" },
      options.tokens ?? ["token-1"]
    )
  );

  const client = yield* mastodonClientWith({
    credentials: Layer.succeedContext(credentials),
    files: options.files ?? [],
  });

  const log = Context.get(credentials, CredentialLog);

  return { accountId, client, instance, log };
});

const statusCalls = (instance: PlatformServer) =>
  instance
    .requests()
    .filter(
      (request) =>
        request.method === "POST" && request.path === "/api/v1/statuses"
    );

describe("publishing on Mastodon", () => {
  it.live("posts text with the attempt's idempotency key", () =>
    Effect.gen(function* postsText() {
      const { accountId, client, instance } = yield* onInstance();
      const post = yield* outgoing({ accountId, text: "Plain words" });

      const result = yield* client.publish(post);
      const [status] = instance.statuses();
      const [call] = statusCalls(instance);

      assert.strictEqual(status?.text, "Plain words");
      assert.deepStrictEqual(result, {
        _tag: "published",
        permalink: `${instance.url}/@alice/${status?.id ?? ""}`,
        platformPostId: PlatformPostIdSchema.make(status?.id ?? "missing"),
      });
      assert(call !== undefined);
      assert.strictEqual(
        headerOf(call, "idempotency-key"),
        post.idempotencyKey
      );
      assert.strictEqual(headerOf(call, "authorization"), "Bearer token-1");
    }).pipe(Effect.scoped)
  );

  it.live("sends a later part as a reply to the part before it", () =>
    Effect.gen(function* repliesInThread() {
      const { accountId, client, instance } = yield* onInstance();

      const first = yield* client.publish(
        yield* outgoing({ accountId, text: "A first part" })
      );

      assert(first._tag === "published");

      const second = yield* client.publish(
        yield* outgoing({
          accountId,
          idempotencyKey: "0b5e4f2a9c7d4e1f8a3b6c5d2e1f0a9b",
          part: 1,
          replyTo: Option.some({
            parent: first.platformPostId,
            root: first.platformPostId,
          }),
          text: "A second part",
        })
      );

      assert.strictEqual(second._tag, "published");
      assert.deepStrictEqual(
        instance.statuses().map(({ inReplyToId, text }) => [text, inReplyToId]),
        [
          ["A first part", null],
          ["A second part", first.platformPostId],
        ]
      );
    }).pipe(Effect.scoped)
  );

  it.live("uploads images with their descriptions, in order", () =>
    Effect.gen(function* uploadsImages() {
      const first = testFile("image", 2048);
      const second = testFile("image", 1024, "image/jpeg");

      const { accountId, client, instance } = yield* onInstance({
        files: [first, second],
        instance: {
          mediaLimits: {
            image_size_limit: 16_777_216,
            supported_mime_types: ["image/png", "image/jpeg", "video/mp4"],
          },
        },
      });

      const result = yield* client.publish(
        yield* outgoing({
          accountId,
          media: [attached(first, "A red square"), attached(second, "")],
        })
      );

      const media = instance.media();

      assert.strictEqual(result._tag, "published");
      assert.deepStrictEqual(
        media.map(({ description, size, type }) => ({
          description,
          size,
          type,
        })),
        [
          { description: "A red square", size: 2048, type: "image/png" },
          { description: null, size: 1024, type: "image/jpeg" },
        ]
      );
      assert.deepStrictEqual(
        instance.statuses()[0]?.mediaIds,
        media.map(({ id }) => id)
      );
    }).pipe(Effect.scoped)
  );

  it.live("waits for a video to be processed before posting it", () =>
    Effect.gen(function* waitsForVideo() {
      const video = testFile("video", 4096);

      const { accountId, client, instance } = yield* onInstance({
        files: [video],
        instance: { videoPolls: 2 },
      });

      const result = yield* client.publish(
        yield* outgoing({ accountId, media: [attached(video)] })
      );

      const looks = instance
        .requests()
        .filter((request) => request.path.startsWith("/api/v1/media/"));

      // The file was streamed, with the form's length rather than chunked:
      // what arrived is the video, whole.
      const upload = instance
        .requests()
        .find((request) => request.path === "/api/v2/media");

      assert(upload !== undefined);
      assert.strictEqual(
        headerOf(upload, "content-length"),
        String(upload.body.length)
      );
      assert.strictEqual(headerOf(upload, "transfer-encoding"), "");
      assert.deepStrictEqual(
        formPartsOf(upload).map(({ contentType, data, fileName, name }) => ({
          contentType,
          fileName,
          name,
          size: data.length,
        })),
        [
          {
            contentType: "",
            fileName: undefined,
            name: "description",
            size: "A synthetic picture".length,
          },
          {
            contentType: "video/mp4",
            fileName: video.media.fileName,
            name: "file",
            size: video.bytes.length,
          },
        ]
      );
      assert.strictEqual(result._tag, "published");
      assert.lengthOf(looks, 3);
      assert.deepStrictEqual(
        instance.statuses()[0]?.mediaIds,
        instance.media().map(({ id }) => id)
      );
    }).pipe(Effect.scoped)
  );

  it.live(
    "refuses a file the instance says it would refuse, before uploading it",
    () =>
      Effect.gen(function* refusesLargeFile() {
        const video = testFile("video", 4096);

        const { accountId, client, instance } = yield* onInstance({
          files: [video],
          instance: { mediaLimits: { video_size_limit: 1000 } },
        });

        const failure = yield* client
          .publish(yield* outgoing({ accountId, media: [attached(video)] }))
          .pipe(Effect.flip);

        assert.deepStrictEqual(
          failure,
          new MediaRejected({ code: "tooLarge" })
        );
        assert.lengthOf(instance.media(), 0);
        assert.lengthOf(statusCalls(instance), 0);
      }).pipe(Effect.scoped)
  );

  it.live("waits as long as the rate limit says", () =>
    Effect.gen(function* rateLimited() {
      const { accountId, client, instance } = yield* onInstance();

      const reset = DateTime.addDuration(
        yield* DateTime.now,
        Duration.minutes(5)
      );

      instance.script("POST /api/v1/statuses", [
        json({ error: "Too many requests" }, 429, {
          "x-ratelimit-reset": DateTime.formatIso(reset),
        }),
      ]);

      const failure = yield* client
        .publish(yield* outgoing({ accountId }))
        .pipe(Effect.flip);

      assert(failure._tag === "RateLimited");
      assert(failure.retryAfter !== undefined);
      assert.isTrue(
        Duration.isGreaterThan(failure.retryAfter, Duration.minutes(4)) &&
          Duration.isLessThanOrEqualTo(failure.retryAfter, Duration.minutes(5))
      );
      assert.lengthOf(instance.statuses(), 0);
    }).pipe(Effect.scoped)
  );

  it.live("asks for a reconnect when the token was revoked", () =>
    Effect.gen(function* revoked() {
      const { accountId, client, instance, log } = yield* onInstance({
        tokens: ["token-1", "token-2"],
      });

      instance.revokeTokens();

      const failure = yield* client
        .publish(yield* outgoing({ accountId }))
        .pipe(Effect.flip);

      assert.deepStrictEqual(failure, new TokenExpired());
      assert.strictEqual(yield* log.renewals, 1);
      assert.deepStrictEqual(yield* log.handed, ["token-1", "token-2"]);
      assert.lengthOf(instance.statuses(), 0);
    }).pipe(Effect.scoped)
  );

  // A reconnect stops the channel's publishing: a proxy in front of the
  // instance, refusing with a page of its own, must not ask for one.
  it.live(
    "keeps the token when a 401 or 403 is not Mastodon's own, and tries again later",
    () =>
      Effect.gen(function* notMastodon() {
        const image = testFile("image", 512);

        for (const [route, answer] of [
          ["POST /api/v1/statuses", empty(403)],
          [
            "POST /api/v1/statuses",
            json("Checking your browser before accessing", 403),
          ],
          ["POST /api/v1/statuses", empty(401)],
          ["POST /api/v2/media", empty(403)],
        ] as const) {
          const { accountId, client, instance, log } = yield* onInstance({
            files: [image],
            tokens: ["token-1", "token-2"],
          });

          instance.script(route, [answer]);

          const failure = yield* client
            .publish(
              yield* outgoing({
                accountId,
                media: route === "POST /api/v2/media" ? [attached(image)] : [],
              })
            )
            .pipe(Effect.flip);

          assert.deepStrictEqual(failure, new PlatformUnavailable());
          assert.strictEqual(yield* log.renewals, 0);
          assert.deepStrictEqual(yield* log.handed, ["token-1"]);
          assert.lengthOf(instance.statuses(), 0);
        }
      }).pipe(Effect.scoped)
  );

  it.live("posts with the renewed token once the first is refused", () =>
    Effect.gen(function* renewed() {
      const { accountId, client, instance, log } = yield* onInstance({
        tokens: ["token-old", "token-1"],
      });

      const result = yield* client.publish(yield* outgoing({ accountId }));

      assert.strictEqual(result._tag, "published");
      assert.strictEqual(yield* log.renewals, 1);
      assert.lengthOf(instance.statuses(), 1);
    }).pipe(Effect.scoped)
  );

  it.live("tells a refused file, a refused post and an outage apart", () =>
    Effect.gen(function* failures() {
      const image = testFile("image", 512);

      const { accountId, client, instance } = yield* onInstance({
        files: [image],
      });

      instance.script("POST /api/v2/media", [
        json({ error: "Validation failed: File content type is invalid" }, 422),
        json({ error: "Service unavailable" }, 503),
        // A proxy that gave up waiting for the file's bytes: the file is
        // not at fault, and nothing was done.
        empty(408),
      ]);

      instance.script("POST /api/v1/statuses", [
        json(
          { error: "Validation failed: Text character limit exceeded" },
          422
        ),
      ]);

      const withImage = yield* outgoing({
        accountId,
        media: [attached(image)],
      });

      const mediaRefused = yield* client.publish(withImage).pipe(Effect.flip);
      const unavailable = yield* client.publish(withImage).pipe(Effect.flip);
      const timedOut = yield* client.publish(withImage).pipe(Effect.flip);

      const postRefused = yield* client
        .publish(yield* outgoing({ accountId }))
        .pipe(Effect.flip);

      assert.deepStrictEqual(
        mediaRefused,
        new MediaRejected({ code: "unprocessable" })
      );
      assert.deepStrictEqual(unavailable, new PlatformUnavailable());
      assert.deepStrictEqual(timedOut, new PlatformUnavailable());
      assert.deepStrictEqual(
        postRefused,
        new BadRequest({ code: "unprocessable" })
      );
      assert.lengthOf(instance.statuses(), 0);
    }).pipe(Effect.scoped)
  );

  it.live(
    "confirms a post whose answer was lost by sending it again with its key",
    () =>
      Effect.gen(function* lostAnswer() {
        const { accountId, client, instance } = yield* onInstance();

        instance.script("POST /api/v1/statuses", [{ _tag: "publishThenDrop" }]);

        const result = yield* client.publish(yield* outgoing({ accountId }));
        const [status] = instance.statuses();

        assert.lengthOf(statusCalls(instance), 2);
        assert.lengthOf(instance.statuses(), 1);
        assert.deepStrictEqual(result, {
          _tag: "published",
          permalink: `${instance.url}/@alice/${status?.id ?? ""}`,
          platformPostId: PlatformPostIdSchema.make(status?.id ?? "missing"),
        });
      }).pipe(Effect.scoped)
  );

  it.live("posts once when the instance failed before taking the post", () =>
    Effect.gen(function* serverError() {
      const { accountId, client, instance } = yield* onInstance();

      instance.script("POST /api/v1/statuses", [
        json({ error: "Internal server error" }, 500),
      ]);

      const result = yield* client.publish(yield* outgoing({ accountId }));

      assert.strictEqual(result._tag, "published");
      assert.lengthOf(statusCalls(instance), 2);
      assert.lengthOf(instance.statuses(), 1);
    }).pipe(Effect.scoped)
  );

  it.live("answers unconfirmed when no confirmation gets an answer", () =>
    Effect.gen(function* neverAnswered() {
      const { accountId, client, instance } = yield* onInstance();

      instance.script("POST /api/v1/statuses", [
        { _tag: "publishThenDrop" },
        { _tag: "drop" },
        { _tag: "drop" },
        { _tag: "drop" },
      ]);

      const result = yield* client.publish(yield* outgoing({ accountId }));

      assert.deepStrictEqual(result, {
        _tag: "unconfirmed",
        reason: "noResponse",
      });
      assert.lengthOf(statusCalls(instance), 4);
      assert.lengthOf(instance.statuses(), 1);
    }).pipe(Effect.scoped)
  );

  it.live("finds the post an interrupted run made, within the key's hour", () =>
    Effect.gen(function* resumed() {
      const { accountId, client, instance } = yield* onInstance();
      const post = yield* outgoing({ accountId });

      // The earlier run's post went out; the run stopped before it wrote
      // down the answer.
      yield* client.publish(post);

      const result = yield* client.resume(post);
      const [status] = instance.statuses();

      assert.lengthOf(instance.statuses(), 1);
      assert.strictEqual(result._tag, "published");
      assert(result._tag === "published");
      assert.strictEqual(result.platformPostId, status?.id);
    }).pipe(Effect.scoped)
  );

  it.live("sends nothing when resuming after the key's hour", () =>
    Effect.gen(function* tooLate() {
      const { accountId, client, instance } = yield* onInstance();

      const startedAt = DateTime.subtractDuration(
        yield* DateTime.now,
        Duration.hours(2)
      );

      const result = yield* client.resume(
        yield* outgoing({ accountId, startedAt })
      );

      assert.deepStrictEqual(result, {
        _tag: "unconfirmed",
        reason: "interrupted",
      });
      assert.lengthOf(instance.requests(), 0);
    }).pipe(Effect.scoped)
  );

  it.live("never refuses a resumed post for an outage", () =>
    Effect.gen(function* resumedOutage() {
      const image = testFile("image", 256);

      const { accountId, client, instance } = yield* onInstance({
        files: [image],
      });

      instance.script("POST /api/v2/media", [empty(503)]);

      const result = yield* client.resume(
        yield* outgoing({ accountId, media: [attached(image)] })
      );

      assert.deepStrictEqual(result, {
        _tag: "unconfirmed",
        reason: "interrupted",
      });
      assert.lengthOf(statusCalls(instance), 0);
    }).pipe(Effect.scoped)
  );

  it.live("rate limits without a reset time fall back to the policy", () =>
    Effect.gen(function* rateLimitedNoReset() {
      const { accountId, client, instance } = yield* onInstance();

      instance.script("POST /api/v1/statuses", [empty(429)]);

      const failure = yield* client
        .publish(yield* outgoing({ accountId }))
        .pipe(Effect.flip);

      assert.deepStrictEqual(failure, new RateLimited({}));
    }).pipe(Effect.scoped)
  );
});
