import { assert, describe, it } from "@effect/vitest";
import { Context, DateTime, Duration, Effect, Layer, Option } from "effect";

import type { OutgoingPost } from "#publishing/application/platform-client.ts";
import { PinterestOptions } from "#publishing/domain/pinterest-options.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import { MediaRejected } from "#shared/domain/media-rejected.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import {
  fakePinterestApi,
  pinterestAccountId,
} from "#test/publishing/fakes/fake-pinterest-api.ts";
import type { FakePinterestOptions } from "#test/publishing/fakes/fake-pinterest-api.ts";
import {
  dropped,
  empty,
  headerOf,
  json,
} from "#test/publishing/fakes/platform-server.ts";
import type { PlatformServer } from "#test/publishing/fakes/platform-server.ts";

import {
  attached,
  CredentialLog,
  credentialsOf,
  outgoing,
  pinterestClientWith,
  testFile,
} from "./support.ts";
import type { TestFile } from "./support.ts";

const boardId = "549755885001";

const sectionId = "5000000000001";

// Pinterest, and the client publishing to it as the synthetic account.
const onPinterest = Effect.fn("test.onPinterest")(function* onPinterest(
  options: {
    readonly api?: FakePinterestOptions;
    readonly files?: readonly TestFile[];
    readonly tokens?: readonly string[];
  } = {}
) {
  const pinterest = yield* fakePinterestApi(options.api);

  const credentials = yield* Layer.build(
    credentialsOf(
      { accountId: pinterestAccountId, platform: "pinterest" },
      options.tokens ?? ["token-1"]
    )
  );

  const client = yield* pinterestClientWith({
    api: pinterest.url,
    credentials: Layer.succeedContext(credentials),
    files: options.files ?? [],
  });

  return { client, log: Context.get(credentials, CredentialLog), pinterest };
});

const onBoard = (fields: Partial<PinterestOptions> = {}) =>
  Option.some(
    new PinterestOptions({ boardId, platform: "pinterest", ...fields })
  );

const post = (fields: Partial<OutgoingPost>) =>
  outgoing({ options: onBoard(), ...fields, accountId: pinterestAccountId });

const calls = (server: PlatformServer, method: string, path: string) =>
  server
    .requests()
    .filter((request) => request.method === method && request.path === path);

const mebibyte = 1024 * 1024;

describe("publishing on Pinterest", () => {
  it.live("makes a Pin of an image, with what the options say", () =>
    Effect.gen(function* imagePin() {
      const image = testFile("image", 2048, "image/jpeg");
      const { client, pinterest } = yield* onPinterest({ files: [image] });

      const result = yield* client.publish(
        yield* post({
          media: [attached(image, "A bowl of tomatoes")],
          options: onBoard({
            boardSectionId: sectionId,
            dominantColor: "#6E7874",
            link: "https://peal.example/recipes/tomato-salad",
            title: "Tomato salad",
          }),
          text: "Ripe tomatoes, olive oil, salt.",
        })
      );

      const [pin] = pinterest.pins();
      const [call] = calls(pinterest, "POST", "/v5/pins");

      assert(pin !== undefined && call !== undefined);
      assert.deepStrictEqual(result, {
        _tag: "published",
        permalink: `https://www.pinterest.com/pin/${pin.id}/`,
        platformPostId: PlatformPostIdSchema.make(pin.id),
      });
      assert.deepStrictEqual(
        { ...pin, createdAt: "", id: "" },
        {
          altText: "A bowl of tomatoes",
          boardId,
          boardSectionId: sectionId,
          createdAt: "",
          description: "Ripe tomatoes, olive oil, salt.",
          dominantColor: "#6E7874",
          id: "",
          link: "https://peal.example/recipes/tomato-salad",
          source: {
            source_type: "image_url",
            url: `https://media.test/${image.media.mediaId}`,
          },
          title: "Tomato salad",
        }
      );
      assert.strictEqual(headerOf(call, "authorization"), "Bearer token-1");
      // An image needs no upload: Pinterest fetches it.
      assert.lengthOf(calls(pinterest, "POST", "/v5/media"), 0);
    }).pipe(Effect.scoped)
  );

  it.live("leaves out what the post does not say", () =>
    Effect.gen(function* bare() {
      const image = testFile("image", 512);
      const { client, pinterest } = yield* onPinterest({ files: [image] });

      yield* client.publish(
        yield* post({ media: [attached(image, "")], text: "" })
      );

      const [call] = calls(pinterest, "POST", "/v5/pins");

      assert(call !== undefined);
      assert.deepStrictEqual(JSON.parse(new TextDecoder().decode(call.body)), {
        board_id: boardId,
        media_source: {
          source_type: "image_url",
          url: `https://media.test/${image.media.mediaId}`,
        },
      });
    }).pipe(Effect.scoped)
  );

  it.live("makes a carousel of several images, in order", () =>
    Effect.gen(function* carousel() {
      const files = [
        testFile("image", 512, "image/png"),
        testFile("image", 512, "image/jpeg"),
        testFile("image", 512, "image/png"),
      ];

      const { client, pinterest } = yield* onPinterest({ files });

      const result = yield* client.publish(
        yield* post({
          media: files.map((file, index) => attached(file, `Step ${index}`)),
        })
      );

      const [pin] = pinterest.pins();

      assert.strictEqual(result._tag, "published");
      assert.deepStrictEqual(pin?.source, {
        items: files.map((file) => ({
          url: `https://media.test/${file.media.mediaId}`,
        })),
        source_type: "multiple_image_urls",
      });
      // A Pin has one alt text: the first image's.
      assert.strictEqual(pin?.altText, "Step 0");
    }).pipe(Effect.scoped)
  );

  it.live("uploads a video as one form, waits for it, then makes the Pin", () =>
    Effect.gen(function* videoPin() {
      const video = testFile("video", 3 * mebibyte + 17);

      const { client, pinterest } = yield* onPinterest({
        api: { videoPolls: 2 },
        files: [video],
      });

      const result = yield* client.publish(
        yield* post({
          media: [attached(video, "Chopping tomatoes")],
          options: onBoard({ coverSecond: 3 }),
        })
      );

      const [registered] = pinterest.media();
      const [pin] = pinterest.pins();

      const upload = pinterest
        .requests()
        .find(({ path }) => path.startsWith("/upload/"));

      assert(registered !== undefined && upload !== undefined);
      assert.strictEqual(result._tag, "published");
      assert.deepStrictEqual(registered.bytes, video.bytes);
      assert.strictEqual(registered.contentType, "video/mp4");
      // The store is told the form's length, and never the token.
      assert.strictEqual(
        headerOf(upload, "content-length"),
        String(upload.body.byteLength)
      );
      assert.strictEqual(headerOf(upload, "authorization"), "");
      assert.lengthOf(
        pinterest
          .requests()
          .filter(({ path }) => path === `/v5/media/${registered.id}`),
        3
      );
      assert.deepStrictEqual(pin?.source, {
        cover_image_key_frame_time: 3,
        media_id: registered.id,
        source_type: "video_id",
      });
      assert.strictEqual(pin?.altText, "Chopping tomatoes");
    }).pipe(Effect.scoped)
  );

  it.live("takes a video's first frame as its cover when none is chosen", () =>
    Effect.gen(function* firstFrame() {
      const video = testFile("video", 4096);
      const { client, pinterest } = yield* onPinterest({ files: [video] });

      yield* client.publish(yield* post({ media: [attached(video)] }));

      assert.deepStrictEqual(pinterest.pins()[0]?.source, {
        cover_image_key_frame_time: 0,
        media_id: pinterest.media()[0]?.id ?? "",
        source_type: "video_id",
      });
    }).pipe(Effect.scoped)
  );

  it.live("refuses, unsent, a post Pinterest cannot show", () =>
    Effect.gen(function* unsendable() {
      const image = testFile("image", 512);
      const gif = testFile("image", 512, "image/gif");
      const video = testFile("video", 512);

      const { client, pinterest } = yield* onPinterest({
        files: [image, gif, video],
      });

      const failures = yield* Effect.forEach(
        [
          { media: [] },
          { media: [attached(gif)] },
          { media: [attached(video), attached(image)] },
          { media: [attached(image)], options: Option.none() },
        ],
        (fields) =>
          post(fields).pipe(Effect.flatMap(client.publish), Effect.flip),
        { concurrency: 1 }
      );

      assert.deepStrictEqual(failures, [
        new MediaRejected({ code: "mediaRequired" }),
        new MediaRejected({ code: "unsupportedType" }),
        new MediaRejected({ code: "mixedMedia" }),
        new BadRequest({ code: "boardMissing" }),
      ]);
      assert.lengthOf(pinterest.requests(), 0);
    }).pipe(Effect.scoped)
  );

  it.live("renews a token Pinterest refuses, once, and pins once", () =>
    Effect.gen(function* renewed() {
      const image = testFile("image", 512);

      const { client, log, pinterest } = yield* onPinterest({
        files: [image],
        tokens: ["token-0", "token-1"],
      });

      const result = yield* client.publish(
        yield* post({ media: [attached(image)] })
      );

      assert.strictEqual(result._tag, "published");
      assert.strictEqual(yield* log.renewals, 1);
      assert.lengthOf(pinterest.pins(), 1);
    }).pipe(Effect.scoped)
  );

  it.live("asks to reconnect when the renewed token is refused too", () =>
    Effect.gen(function* expired() {
      const image = testFile("image", 512);

      const { client, pinterest } = yield* onPinterest({
        files: [image],
        tokens: ["token-8", "token-9"],
      });

      const failure = yield* client
        .publish(yield* post({ media: [attached(image)] }))
        .pipe(Effect.flip);

      assert.strictEqual(failure._tag, "TokenExpired");
      assert.lengthOf(pinterest.pins(), 0);
    }).pipe(Effect.scoped)
  );

  it.live("waits as long as Pinterest says when it limits the rate", () =>
    Effect.gen(function* limited() {
      const image = testFile("image", 512);
      const { client, pinterest } = yield* onPinterest({ files: [image] });

      pinterest.script.push("POST /v5/pins", [
        json({ code: 8, message: "Rate limit exceeded." }, 429, {
          "x-ratelimit-reset": "42",
        }),
        json({ code: 8, message: "Rate limit exceeded." }, 429),
      ]);

      const first = yield* client
        .publish(yield* post({ media: [attached(image)] }))
        .pipe(Effect.flip);

      const second = yield* client
        .publish(yield* post({ media: [attached(image)] }))
        .pipe(Effect.flip);

      assert.strictEqual(first._tag, "RateLimited");
      assert.deepStrictEqual(
        first._tag === "RateLimited" ? first.retryAfter : undefined,
        Duration.seconds(42)
      );
      assert.strictEqual(second._tag, "RateLimited");
      assert.lengthOf(pinterest.pins(), 0);
    }).pipe(Effect.scoped)
  );

  it.live("tells Pinterest's refusals of a Pin from servers on the way", () =>
    Effect.gen(function* refusals() {
      const image = testFile("image", 512);
      const { client, pinterest } = yield* onPinterest({ files: [image] });

      pinterest.script.push("POST /v5/pins", [
        pinterest.refusal(503, 0, "Service unavailable."),
        // A proxy's page, not Pinterest's word on the token.
        json({ error: "Forbidden" }, 403),
        pinterest.refusal(403, 29, "You are not permitted to do that."),
        pinterest.refusal(400, 1, "Invalid request: link."),
      ]);

      const failures = yield* Effect.forEach(
        [1, 2, 3, 4, 5],
        (attempt) =>
          post({
            media: [attached(image)],
            // The last one names a board that is not the account's.
            options:
              attempt === 5 ? onBoard({ boardId: "549755885999" }) : onBoard(),
          }).pipe(Effect.flatMap(client.publish), Effect.flip),
        { concurrency: 1 }
      );

      assert.deepStrictEqual(failures, [
        new PlatformUnavailable(),
        new PlatformUnavailable(),
        new BadRequest({ code: "pinterest29" }),
        new BadRequest({ code: "pinterest1" }),
        new BadRequest({ code: "pinterest40" }),
      ]);
      assert.lengthOf(pinterest.pins(), 0);
    }).pipe(Effect.scoped)
  );

  it.live("refuses a video Pinterest could not process", () =>
    Effect.gen(function* processingFailed() {
      const video = testFile("video", 4096);

      const { client, pinterest } = yield* onPinterest({
        api: { videoFails: true },
        files: [video],
      });

      const failure = yield* client
        .publish(yield* post({ media: [attached(video)] }))
        .pipe(Effect.flip);

      assert.deepStrictEqual(
        failure,
        new MediaRejected({ code: "processingFailed" })
      );
      assert.lengthOf(pinterest.pins(), 0);
    }).pipe(Effect.scoped)
  );

  it.live("refuses a video Pinterest or its store will not take", () =>
    Effect.gen(function* rejected() {
      const video = testFile("video", 4096);
      const { client, pinterest } = yield* onPinterest({ files: [video] });

      pinterest.script.push("POST /v5/media", [
        pinterest.refusal(400, 1, "Invalid media type."),
      ]);

      const unregistered = yield* client
        .publish(yield* post({ media: [attached(video)] }))
        .pipe(Effect.flip);

      pinterest.script.push("POST /upload/7000000000001", [empty(403)]);

      const refusedByStore = yield* client
        .publish(yield* post({ media: [attached(video)] }))
        .pipe(Effect.flip);

      pinterest.script.push("POST /upload/7000000000002", [dropped]);

      const lost = yield* client
        .publish(yield* post({ media: [attached(video)] }))
        .pipe(Effect.flip);

      assert.deepStrictEqual(
        [unregistered, refusedByStore, lost],
        [
          new MediaRejected({ code: "pinterest1" }),
          new MediaRejected({ code: "upload403" }),
          // Nothing shows of an upload: it is made again later.
          new PlatformUnavailable(),
        ]
      );
      assert.lengthOf(pinterest.pins(), 0);
    }).pipe(Effect.scoped)
  );

  it.live("gives up on a video Pinterest never finishes processing", () =>
    Effect.gen(function* stuck() {
      const video = testFile("video", 4096);

      const { client } = yield* onPinterest({
        api: { videoPolls: 1000 },
        files: [video],
      });

      const failure = yield* client
        .publish(yield* post({ media: [attached(video)] }))
        .pipe(Effect.flip);

      assert.deepStrictEqual(failure, new PlatformUnavailable());
    }).pipe(Effect.scoped)
  );
});

describe("a Pin whose answer was lost", () => {
  it.live("is found on its board, and never made twice", () =>
    Effect.gen(function* found() {
      const image = testFile("image", 512);
      const { client, pinterest } = yield* onPinterest({ files: [image] });

      pinterest.script.push("POST /v5/pins", [{ _tag: "createThenDrop" }]);

      const result = yield* client.publish(
        yield* post({
          media: [attached(image)],
          options: onBoard({ title: "Tomato  salad " }),
          text: "Ripe tomatoes.",
        })
      );

      const [pin] = pinterest.pins();

      assert(pin !== undefined);
      assert.deepStrictEqual(result, {
        _tag: "published",
        permalink: `https://www.pinterest.com/pin/${pin.id}/`,
        platformPostId: PlatformPostIdSchema.make(pin.id),
      });
      assert.lengthOf(pinterest.pins(), 1);
      assert.lengthOf(calls(pinterest, "POST", "/v5/pins"), 1);
    }).pipe(Effect.scoped)
  );

  it.live("is looked for in its section, when it has one", () =>
    Effect.gen(function* inSection() {
      const image = testFile("image", 512);
      const { client, pinterest } = yield* onPinterest({ files: [image] });

      pinterest.script.push("POST /v5/pins", [{ _tag: "createThenDrop" }]);

      const result = yield* client.publish(
        yield* post({
          media: [attached(image)],
          options: onBoard({ boardSectionId: sectionId }),
        })
      );

      assert.strictEqual(result._tag, "published");
      assert.isAbove(
        calls(
          pinterest,
          "GET",
          `/v5/boards/${boardId}/sections/${sectionId}/pins`
        ).length,
        0
      );
    }).pipe(Effect.scoped)
  );

  it.live("is unconfirmed, and never sent again, when no Pin matches", () =>
    Effect.gen(function* unconfirmed() {
      const image = testFile("image", 512);
      const { client, pinterest } = yield* onPinterest({ files: [image] });

      // An older Pin with the same words, from before the attempt.
      yield* client.publish(
        yield* post({ media: [attached(image)], text: "Ripe tomatoes." })
      );

      pinterest.script.push("POST /v5/pins", [dropped]);

      const result = yield* client.publish(
        yield* post({
          media: [attached(image)],
          startedAt: DateTime.addDuration(
            yield* DateTime.now,
            Duration.minutes(10)
          ),
          text: "Ripe tomatoes.",
        })
      );

      assert.deepStrictEqual(result, {
        _tag: "unconfirmed",
        reason: "noResponse",
      });
      assert.lengthOf(pinterest.pins(), 1);
      assert.lengthOf(calls(pinterest, "POST", "/v5/pins"), 2);
    }).pipe(Effect.scoped)
  );

  it.live("is not mistaken for a Pin with other words or media", () =>
    Effect.gen(function* others() {
      const image = testFile("image", 512);
      const video = testFile("video", 512);

      const { client, pinterest } = yield* onPinterest({
        files: [image, video],
      });

      const startedAt = yield* DateTime.now;

      yield* client.publish(
        yield* post({
          media: [attached(image)],
          options: onBoard({ title: "Another title" }),
          startedAt,
          text: "Ripe tomatoes.",
        })
      );
      yield* client.publish(
        yield* post({
          media: [attached(video)],
          startedAt,
          text: "Ripe tomatoes.",
        })
      );

      pinterest.script.push("POST /v5/pins", [dropped]);

      const result = yield* client.publish(
        yield* post({
          media: [attached(image)],
          startedAt,
          text: "Ripe tomatoes.",
        })
      );

      assert.strictEqual(result._tag, "unconfirmed");
      assert.lengthOf(pinterest.pins(), 2);
    }).pipe(Effect.scoped)
  );

  it.live("is unconfirmed when the answer cannot be read", () =>
    Effect.gen(function* unreadable() {
      const image = testFile("image", 512);
      const { client, pinterest } = yield* onPinterest({ files: [image] });

      pinterest.script.push("POST /v5/pins", [json({ pin: "made" }, 201)]);

      const result = yield* client.publish(
        yield* post({ media: [attached(image)] })
      );

      assert.deepStrictEqual(result, {
        _tag: "unconfirmed",
        reason: "unreadableResponse",
      });
    }).pipe(Effect.scoped)
  );
});

describe("resuming a Pin an earlier run may have made", () => {
  it.live("answers the Pin it finds, without making another", () =>
    Effect.gen(function* resumedFound() {
      const image = testFile("image", 512);
      const { client, pinterest } = yield* onPinterest({ files: [image] });
      const sent = yield* post({ media: [attached(image)], text: "Once." });

      yield* client.publish(sent);

      const result = yield* client.resume(sent);

      assert.strictEqual(result._tag, "published");
      assert.lengthOf(pinterest.pins(), 1);
    }).pipe(Effect.scoped)
  );

  it.live("is unconfirmed when it finds none, and makes none", () =>
    Effect.gen(function* resumedUnknown() {
      const image = testFile("image", 512);
      const { client, pinterest } = yield* onPinterest({ files: [image] });

      const result = yield* client.resume(
        yield* post({ media: [attached(image)], text: "Once." })
      );

      assert.deepStrictEqual(result, {
        _tag: "unconfirmed",
        reason: "interrupted",
      });
      assert.lengthOf(pinterest.pins(), 0);
    }).pipe(Effect.scoped)
  );
});
