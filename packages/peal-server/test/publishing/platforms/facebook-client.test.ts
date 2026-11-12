import { createHmac } from "node:crypto";

import { assert, describe, it } from "@effect/vitest";
import { Duration, Effect, Option } from "effect";

import { defaultStepTiming } from "#publishing/application/publication-steps.ts";
import { FacebookOptions } from "#publishing/domain/facebook-options.ts";
import {
  videoPublishingWait,
  videoStepTiming,
} from "#publishing/infrastructure/platforms/meta/facebook-formats.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import {
  businessUsage,
  facebookPageId,
  fakeMetaGraph,
  graphAppSecret,
  metaError,
} from "#test/publishing/fakes/fake-meta-graph.ts";
import type { FakeMetaGraphOptions } from "#test/publishing/fakes/fake-meta-graph.ts";
import {
  dropped,
  empty,
  headerOf,
} from "#test/publishing/fakes/platform-server.ts";
import type { PlatformServer } from "#test/publishing/fakes/platform-server.ts";

import {
  attached,
  credentialsOf,
  metaClientWith,
  outgoing,
  testFile,
} from "./support.ts";
import type { TestFile } from "./support.ts";

const pageToken = "page-token-1";

// The fake Graph API, and the client publishing to it as the Page.
const onPage = Effect.fn("test.onPage")(function* onPage(
  options: {
    readonly files?: readonly TestFile[];
    readonly graph?: FakeMetaGraphOptions;
  } = {}
) {
  const graph = yield* fakeMetaGraph([pageToken], options.graph);

  const client = yield* metaClientWith({
    appSecret: graphAppSecret,
    credentials: credentialsOf(
      { accountId: facebookPageId, platform: "facebook" },
      [pageToken]
    ),
    files: options.files ?? [],
    platform: "facebook",
    url: graph.url,
  });

  return { client, graph };
});

const callsTo = (graph: PlatformServer, path: string) =>
  graph
    .requests()
    .filter(
      (request) =>
        request.method === "POST" &&
        request.path === `/v27.0/${facebookPageId}${path}`
    );

describe("publishing on a Facebook Page", () => {
  it.live("posts text to the Page's feed", () =>
    Effect.gen(function* text() {
      const { client, graph } = yield* onPage();

      const result = yield* client.publish(
        yield* outgoing({ accountId: facebookPageId, text: "Plain words" })
      );

      const [post] = graph.posts();

      assert.deepStrictEqual(post?.params, { message: "Plain words" });
      assert.deepStrictEqual(result, {
        _tag: "published",
        permalink: `https://www.facebook.com/${post?.id ?? ""}`,
        platformPostId: PlatformPostIdSchema.make(post?.id ?? "missing"),
      });
    }).pipe(Effect.scoped)
  );

  it.live(
    "posts a photo from its public URL, with its caption and alt text",
    () =>
      Effect.gen(function* photo() {
        const image = testFile("image", 2048, "image/png");
        const { client, graph } = yield* onPage({ files: [image] });

        const result = yield* client.publish(
          yield* outgoing({
            accountId: facebookPageId,
            media: [attached(image, "A red square")],
            text: "With a picture",
          })
        );

        const [post] = graph.posts();

        assert.deepStrictEqual(post?.params, {
          alt_text_custom: "A red square",
          caption: "With a picture",
          url: `https://media.test/${image.media.mediaId}`,
        });
        assert.strictEqual(
          result._tag === "published" ? result.platformPostId : "",
          post?.id
        );
      }).pipe(Effect.scoped)
  );

  it.live("attaches several photos, uploaded unpublished, to one post", () =>
    Effect.gen(function* photos() {
      const first = testFile("image", 1024, "image/jpeg");
      const second = testFile("image", 2048, "image/png");
      const { client, graph } = yield* onPage({ files: [first, second] });

      const result = yield* client.publish(
        yield* outgoing({
          accountId: facebookPageId,
          media: [attached(first), attached(second, "")],
          text: "Two pictures",
        })
      );

      const uploads = callsTo(graph, "/photos");
      const [post] = graph.posts();

      assert.strictEqual(result._tag, "published");
      assert.lengthOf(uploads, 2);
      assert.lengthOf(graph.posts(), 1);
      assert.strictEqual(post?.text, "Two pictures");
      assert.match(
        post?.params["attached_media[0]"] ?? "",
        /"media_fbid":"\d+"/u
      );
      assert.match(
        post?.params["attached_media[1]"] ?? "",
        /"media_fbid":"\d+"/u
      );
      assert.deepStrictEqual(graph.unpublishedPhotos(), []);
    }).pipe(Effect.scoped)
  );

  it.live("posts a video Facebook fetches from its public URL", () =>
    Effect.gen(function* video() {
      const clip = testFile("video", 4096);
      const { client, graph } = yield* onPage({ files: [clip] });

      const result = yield* client.publish(
        yield* outgoing({
          accountId: facebookPageId,
          media: [attached(clip)],
          text: "A clip",
        })
      );

      assert.strictEqual(result._tag, "published");
      assert.deepStrictEqual(graph.posts()[0]?.params, {
        description: "A clip",
        file_url: `https://media.test/${clip.media.mediaId}`,
      });
    }).pipe(Effect.scoped)
  );

  it.live("gives a video the title its options choose", () =>
    Effect.gen(function* titled() {
      const clip = testFile("video", 4096);
      const { client, graph } = yield* onPage({ files: [clip] });

      yield* client.publish(
        yield* outgoing({
          accountId: facebookPageId,
          media: [attached(clip)],
          options: Option.some(
            new FacebookOptions({ videoTitle: "A synthetic title" })
          ),
          text: "A clip",
        })
      );

      assert.deepStrictEqual(graph.posts()[0]?.params, {
        description: "A clip",
        file_url: `https://media.test/${clip.media.mediaId}`,
        title: "A synthetic title",
      });
    }).pipe(Effect.scoped)
  );

  it.live("refuses a post Facebook takes for a duplicate", () =>
    Effect.gen(function* duplicate() {
      const { client, graph } = yield* onPage();

      graph.script.push(`POST /v27.0/${facebookPageId}/feed`, [metaError(506)]);

      const failure = yield* Effect.flip(
        client.publish(yield* outgoing({ accountId: facebookPageId }))
      );

      assert.deepStrictEqual(failure, new BadRequest({ code: "duplicate" }));
    }).pipe(Effect.scoped)
  );

  it.live("waits as long as Meta says when the Page is rate limited", () =>
    Effect.gen(function* limited() {
      const { client, graph } = yield* onPage();

      graph.script.push(`POST /v27.0/${facebookPageId}/feed`, [
        metaError(32, 400, businessUsage(42)),
      ]);

      const failure = yield* Effect.flip(
        client.publish(yield* outgoing({ accountId: facebookPageId }))
      );

      assert(failure._tag === "RateLimited");
      assert.deepStrictEqual(failure.retryAfter, Duration.minutes(42));
      assert.lengthOf(graph.posts(), 0);
    }).pipe(Effect.scoped)
  );

  it.live("asks to reconnect when Meta refuses the Page's token", () =>
    Effect.gen(function* revoked() {
      const { client, graph } = yield* onPage();

      graph.script.push(`POST /v27.0/${facebookPageId}/feed`, [
        {
          _tag: "answer",
          body: { error: { code: 190, error_subcode: 460 } },
          status: 400,
        },
      ]);

      const failure = yield* Effect.flip(
        client.publish(yield* outgoing({ accountId: facebookPageId }))
      );

      assert.strictEqual(failure._tag, "TokenExpired");
      assert.lengthOf(graph.posts(), 0);
    }).pipe(Effect.scoped)
  );

  it.live("leaves a post whose answer never came unconfirmed, sent once", () =>
    Effect.gen(function* unanswered() {
      const { client, graph } = yield* onPage();

      for (const answer of [dropped, empty(503)]) {
        graph.script.push(`POST /v27.0/${facebookPageId}/feed`, [answer]);

        const result = yield* client.publish(
          yield* outgoing({ accountId: facebookPageId, text: "Lost" })
        );

        assert.strictEqual(result._tag, "unconfirmed");
      }

      // Facebook keeps no key: the post was never sent again.
      assert.lengthOf(callsTo(graph, "/feed"), 2);
      assert.lengthOf(graph.posts(), 0);
    }).pipe(Effect.scoped)
  );

  it.live("finds a post whose answer was lost among the Page's posts", () =>
    Effect.gen(function* found() {
      const { client, graph } = yield* onPage();

      graph.loseAnswer(`POST /v27.0/${facebookPageId}/feed`);

      const result = yield* client.publish(
        yield* outgoing({ accountId: facebookPageId, text: "Found later" })
      );

      const [post] = graph.posts();

      assert.strictEqual(result._tag, "published");
      assert.strictEqual(
        result._tag === "published" ? result.platformPostId : "",
        post?.id
      );
      assert.lengthOf(callsTo(graph, "/feed"), 1);
    }).pipe(Effect.scoped)
  );
});

const reel = Option.some(new FacebookOptions({ format: "reel" }));

const story = Option.some(new FacebookOptions({ format: "story" }));

// The calls the fake received, as `METHOD path phase`, in order.
const steps = (graph: PlatformServer) =>
  graph.requests().map((request) => {
    const phase =
      request.method === "POST"
        ? new URLSearchParams(new TextDecoder().decode(request.body)).get(
            "upload_phase"
          )
        : null;

    return [request.method, request.path, phase ?? ""].join(" ").trim();
  });

describe("a Facebook reel", () => {
  it.live(
    "is started, uploaded by its URL with the Page's token, then finished with its text and title",
    () =>
      Effect.gen(function* published() {
        const clip = testFile("video", 4096);
        const { client, graph } = yield* onPage({ files: [clip] });

        const result = yield* client.publish(
          yield* outgoing({
            accountId: facebookPageId,
            media: [attached(clip)],
            options: Option.some(
              new FacebookOptions({
                format: "reel",
                videoTitle: "A synthetic reel",
              })
            ),
            text: "A reel #launch",
          })
        );

        const [video] = graph.videos();

        assert.deepStrictEqual(steps(graph), [
          `POST /v27.0/${facebookPageId}/video_reels start`,
          `POST /video-upload/v27.0/${video?.id ?? ""}`,
          `GET /v27.0/${video?.id ?? ""}`,
          `POST /v27.0/${facebookPageId}/video_reels finish`,
          // Read again for a processing error.
          `GET /v27.0/${video?.id ?? ""}`,
        ]);

        const [, upload] = graph.requests();

        assert.isDefined(upload);
        assert.strictEqual(
          headerOf(upload, "authorization"),
          `OAuth ${pageToken}`
        );
        assert.strictEqual(
          video?.fileUrl,
          `https://media.test/${clip.media.mediaId}`
        );
        assert.deepStrictEqual(graph.posts()[0]?.params, {
          description: "A reel #launch",
          title: "A synthetic reel",
          upload_phase: "finish",
          video_id: video?.id ?? "",
          video_state: "PUBLISHED",
        });
        // Stored under its video id, with no address Meta did not give.
        assert.deepStrictEqual(result, {
          _tag: "published",
          platformPostId: PlatformPostIdSchema.make(video?.id ?? "missing"),
        });
      }).pipe(Effect.scoped)
  );

  it.live("sends nothing that was not chosen: no title, no text", () =>
    Effect.gen(function* bare() {
      const clip = testFile("video", 4096);
      const { client, graph } = yield* onPage({ files: [clip] });

      yield* client.publish(
        yield* outgoing({
          accountId: facebookPageId,
          media: [attached(clip)],
          options: reel,
          text: "",
        })
      );

      assert.deepStrictEqual(graph.posts()[0]?.params, {
        upload_phase: "finish",
        video_id: graph.videos()[0]?.id ?? "",
        video_state: "PUBLISHED",
      });
    }).pipe(Effect.scoped)
  );

  it.live(
    "is confirmed by its video's status when the finish's answer is lost",
    () =>
      Effect.gen(function* lost() {
        const clip = testFile("video", 4096);
        const { client, graph } = yield* onPage({ files: [clip] });

        graph.loseAnswer(`POST /v27.0/${facebookPageId}/video_reels#finish`);

        const result = yield* client.publish(
          yield* outgoing({
            accountId: facebookPageId,
            media: [attached(clip)],
            options: reel,
            text: "Lost answer",
          })
        );

        assert.strictEqual(result._tag, "published");
        assert.lengthOf(graph.posts(), 1);
      }).pipe(Effect.scoped)
  );

  it.live("starts again, as nothing shows, when a start's answer is lost", () =>
    Effect.gen(function* lostStart() {
      const clip = testFile("video", 4096);
      const { client, graph } = yield* onPage({ files: [clip] });

      graph.loseAnswer(`POST /v27.0/${facebookPageId}/video_reels#start`);

      const failure = yield* Effect.flip(
        client.publish(
          yield* outgoing({
            accountId: facebookPageId,
            media: [attached(clip)],
            options: reel,
          })
        )
      );

      // The attempt fails as Meta unreachable, which a later one tries
      // again: an unfinished video shows nowhere.
      assert.strictEqual(failure._tag, "PlatformUnavailable");
      assert.lengthOf(graph.posts(), 0);
    }).pipe(Effect.scoped)
  );

  it.live("is left unconfirmed on a resume, never sent again", () =>
    Effect.gen(function* resumed() {
      const clip = testFile("video", 4096);
      const { client, graph } = yield* onPage({ files: [clip] });

      const post = yield* outgoing({
        accountId: facebookPageId,
        media: [attached(clip)],
        options: reel,
      });

      yield* client.publish(post);

      const before = graph.requests().length;

      assert.deepStrictEqual(yield* client.resume(post), {
        _tag: "unconfirmed",
        reason: "interrupted",
      });
      assert.lengthOf(graph.requests(), before);
      assert.lengthOf(graph.posts(), 1);
    }).pipe(Effect.scoped)
  );

  it.live("keeps Meta's code when it refuses the video", () =>
    Effect.gen(function* refused() {
      const clip = testFile("video", 4096);
      const { client, graph } = yield* onPage({ files: [clip] });

      graph.script.push(`POST /v27.0/${facebookPageId}/video_reels`, [
        metaError(1_363_040),
      ]);

      const failure = yield* Effect.flip(
        client.publish(
          yield* outgoing({
            accountId: facebookPageId,
            media: [attached(clip)],
            options: reel,
          })
        )
      );

      assert.deepStrictEqual(failure._tag, "MediaRejected");
      assert.strictEqual(
        "code" in failure ? failure.code : undefined,
        "graph1363040"
      );
    }).pipe(Effect.scoped)
  );

  it.live(
    "is left unconfirmed, never finished again, when its finish's answer is lost and publishing has not begun",
    () =>
      Effect.gen(function* lostNotStarted() {
        const clip = testFile("video", 4096);

        const { client, graph } = yield* onPage({
          files: [clip],
          graph: { videoPublishLag: 10 },
        });

        graph.loseAnswer(`POST /v27.0/${facebookPageId}/video_reels#finish`);

        const result = yield* client.publish(
          yield* outgoing({
            accountId: facebookPageId,
            media: [attached(clip)],
            options: reel,
          })
        );

        assert.deepStrictEqual(result, {
          _tag: "unconfirmed",
          reason: "noResponse",
        });
        assert.lengthOf(
          steps(graph).filter((step) => step.endsWith("video_reels finish")),
          1
        );
        assert.lengthOf(graph.posts(), 1);
      }).pipe(Effect.scoped)
  );

  it.live(
    "waits for the upload itself, not the video's status, before the finish",
    () =>
      Effect.gen(function* interrupted() {
        const clip = testFile("video", 4096);

        const { client, graph } = yield* onPage({
          files: [clip],
          graph: { videoUploadReads: 2 },
        });

        const result = yield* client.publish(
          yield* outgoing({
            accountId: facebookPageId,
            media: [attached(clip)],
            options: reel,
          })
        );

        const [video] = graph.videos();

        assert.strictEqual(result._tag, "published");
        assert.deepStrictEqual(steps(graph).slice(2), [
          `GET /v27.0/${video?.id ?? ""}`,
          `GET /v27.0/${video?.id ?? ""}`,
          `GET /v27.0/${video?.id ?? ""}`,
          `POST /v27.0/${facebookPageId}/video_reels finish`,
          `GET /v27.0/${video?.id ?? ""}`,
        ]);
      }).pipe(Effect.scoped)
  );

  it.live("fails with Meta's processing error, and is never finished", () =>
    Effect.gen(function* processingError() {
      const clip = testFile("video", 4096);

      const { client, graph } = yield* onPage({
        files: [clip],
        graph: { videoProcessingError: true },
      });

      const failure = yield* Effect.flip(
        client.publish(
          yield* outgoing({
            accountId: facebookPageId,
            media: [attached(clip)],
            options: reel,
          })
        )
      );

      assert.strictEqual(failure._tag, "MediaRejected");
      assert.strictEqual(
        "code" in failure ? failure.code : undefined,
        "processingFailed"
      );
      assert.isFalse(
        steps(graph).some((step) => step.endsWith("video_reels finish"))
      );
    }).pipe(Effect.scoped)
  );
});

describe("a Facebook reel Meta is still processing", () => {
  it("reads Meta's status on for the whole publishing wait, in production", () => {
    const { confirmDelays } = videoStepTiming(defaultStepTiming);

    assert.strictEqual(
      confirmDelays.reduce(
        (total, delay) => total + Duration.toMillis(delay),
        0
      ),
      Duration.toMillis(videoPublishingWait)
    );
  });

  it.live(
    "is Published only once Meta says its publishing is done, checking again after the finish",
    () =>
      Effect.gen(function* checkedAgain() {
        const clip = testFile("video", 4096);

        const { client, graph } = yield* onPage({
          files: [clip],
          graph: { videoPublishLag: 2 },
        });

        const result = yield* client.publish(
          yield* outgoing({
            accountId: facebookPageId,
            media: [attached(clip)],
            options: reel,
          })
        );

        assert.strictEqual(result._tag, "published");
        assert.lengthOf(
          steps(graph).filter((step) => step.endsWith("video_reels finish")),
          1
        );
      }).pipe(Effect.scoped)
  );

  it.live(
    "is left unconfirmed, never Published nor finished again, while Meta never says it is done",
    () =>
      Effect.gen(function* neverDone() {
        const clip = testFile("video", 4096);

        const { client, graph } = yield* onPage({
          files: [clip],
          graph: { videoPublishLag: 50 },
        });

        const result = yield* client.publish(
          yield* outgoing({
            accountId: facebookPageId,
            media: [attached(clip)],
            options: reel,
          })
        );

        assert.deepStrictEqual(result, {
          _tag: "unconfirmed",
          reason: "stillProcessing",
        });
        assert.lengthOf(
          steps(graph).filter((step) => step.endsWith("video_reels finish")),
          1
        );
      }).pipe(Effect.scoped)
  );

  it.live("fails with Meta's processing error shown after the finish", () =>
    Effect.gen(function* lateError() {
      const clip = testFile("video", 4096);

      const { client } = yield* onPage({
        files: [clip],
        graph: { videoProcessingErrorAfterFinish: true },
      });

      const failure = yield* Effect.flip(
        client.publish(
          yield* outgoing({
            accountId: facebookPageId,
            media: [attached(clip)],
            options: reel,
          })
        )
      );

      assert.strictEqual(failure._tag, "MediaRejected");
      assert.strictEqual(
        "code" in failure ? failure.code : undefined,
        "processingFailed"
      );
    }).pipe(Effect.scoped)
  );

  it.live(
    "fails with Meta's processing error read while confirming a lost finish",
    () =>
      Effect.gen(function* lostThenRefused() {
        const clip = testFile("video", 4096);

        const { client, graph } = yield* onPage({
          files: [clip],
          graph: { videoProcessingErrorAfterFinish: true },
        });

        graph.loseAnswer(`POST /v27.0/${facebookPageId}/video_reels#finish`);

        const failure = yield* Effect.flip(
          client.publish(
            yield* outgoing({
              accountId: facebookPageId,
              media: [attached(clip)],
              options: reel,
            })
          )
        );

        assert.strictEqual(failure._tag, "MediaRejected");
        assert.lengthOf(
          steps(graph).filter((step) => step.endsWith("video_reels finish")),
          1
        );
      }).pipe(Effect.scoped)
  );

  it.live("takes a null error for no error", () =>
    Effect.gen(function* nullError() {
      const clip = testFile("video", 4096);

      const { client } = yield* onPage({
        files: [clip],
        graph: { videoNullError: true },
      });

      const result = yield* client.publish(
        yield* outgoing({
          accountId: facebookPageId,
          media: [attached(clip)],
          options: reel,
        })
      );

      assert.strictEqual(result._tag, "published");
    }).pipe(Effect.scoped)
  );
});

describe("a Facebook story", () => {
  it.live("of a video is started, uploaded and finished, without text", () =>
    Effect.gen(function* videoStory() {
      const clip = testFile("video", 4096);
      const { client, graph } = yield* onPage({ files: [clip] });

      const result = yield* client.publish(
        yield* outgoing({
          accountId: facebookPageId,
          media: [attached(clip)],
          options: story,
          text: "Words a story never shows",
        })
      );

      const [video] = graph.videos();
      const [shown] = graph.stories();

      assert.deepStrictEqual(steps(graph), [
        `POST /v27.0/${facebookPageId}/video_stories start`,
        `POST /video-upload/v27.0/${video?.id ?? ""}`,
        `GET /v27.0/${video?.id ?? ""}`,
        `POST /v27.0/${facebookPageId}/video_stories finish`,
        // Read again for a processing error.
        `GET /v27.0/${video?.id ?? ""}`,
      ]);
      assert.deepStrictEqual(graph.posts()[0]?.params, {
        upload_phase: "finish",
        video_id: video?.id ?? "",
      });
      // A story has no lasting page: no address.
      assert.deepStrictEqual(result, {
        _tag: "published",
        platformPostId: PlatformPostIdSchema.make(shown?.postId ?? "missing"),
      });
    }).pipe(Effect.scoped)
  );

  it.live("of a photo uploads it unpublished, then makes the story of it", () =>
    Effect.gen(function* photo() {
      const image = testFile("image", 2048, "image/jpeg");
      const { client, graph } = yield* onPage({ files: [image] });

      const result = yield* client.publish(
        yield* outgoing({
          accountId: facebookPageId,
          media: [attached(image, "Alt text a story keeps nowhere")],
          options: story,
          text: "Words a story never shows",
        })
      );

      const [upload] = callsTo(graph, "/photos");
      const [shown] = graph.stories();

      assert.deepStrictEqual(
        Object.fromEntries(
          new URLSearchParams(new TextDecoder().decode(upload?.body))
        ),
        {
          access_token: pageToken,
          appsecret_proof: createHmac("sha256", graphAppSecret)
            .update(pageToken)
            .digest("hex"),
          published: "false",
          url: `https://media.test/${image.media.mediaId}`,
        }
      );
      assert.deepStrictEqual(graph.posts()[0]?.params, {
        photo_id: shown?.mediaId ?? "",
      });
      assert.deepStrictEqual(result, {
        _tag: "published",
        platformPostId: PlatformPostIdSchema.make(shown?.postId ?? "missing"),
      });
    }).pipe(Effect.scoped)
  );

  it.live("is uploaded again on a repost, never reusing a photo", () =>
    Effect.gen(function* repost() {
      const image = testFile("image", 2048, "image/jpeg");
      const { client, graph } = yield* onPage({ files: [image] });

      const post = yield* outgoing({
        accountId: facebookPageId,
        media: [attached(image)],
        options: story,
      });

      yield* client.publish(post);
      yield* client.publish(post);

      const [first, second] = graph.stories();

      assert.lengthOf(callsTo(graph, "/photos"), 2);
      assert.notStrictEqual(first?.mediaId, second?.mediaId);
    }).pipe(Effect.scoped)
  );

  it.live("is found among the Page's stories when its answer is lost", () =>
    Effect.gen(function* lost() {
      const image = testFile("image", 2048, "image/jpeg");
      const { client, graph } = yield* onPage({ files: [image] });

      graph.loseAnswer(`POST /v27.0/${facebookPageId}/photo_stories`);

      const result = yield* client.publish(
        yield* outgoing({
          accountId: facebookPageId,
          media: [attached(image)],
          options: story,
        })
      );

      assert.deepStrictEqual(result, {
        _tag: "published",
        platformPostId: PlatformPostIdSchema.make(
          graph.stories()[0]?.postId ?? "missing"
        ),
      });
      assert.lengthOf(callsTo(graph, "/photo_stories"), 1);
    }).pipe(Effect.scoped)
  );

  it.live("is left unconfirmed when it cannot be found, never sent again", () =>
    Effect.gen(function* unknown() {
      const image = testFile("image", 2048, "image/jpeg");
      const { client, graph } = yield* onPage({ files: [image] });

      graph.script.push(`POST /v27.0/${facebookPageId}/photo_stories`, [
        dropped,
      ]);

      const result = yield* client.publish(
        yield* outgoing({
          accountId: facebookPageId,
          media: [attached(image)],
          options: story,
        })
      );

      assert.deepStrictEqual(result, {
        _tag: "unconfirmed",
        reason: "noResponse",
      });
      assert.lengthOf(callsTo(graph, "/photo_stories"), 1);
    }).pipe(Effect.scoped)
  );

  it.live(
    "of a video is left unconfirmed, never finished again, while Meta says published but has not begun",
    () =>
      Effect.gen(function* storyLag() {
        const clip = testFile("video", 4096);

        const { client, graph } = yield* onPage({
          files: [clip],
          graph: { videoPublishLag: 10 },
        });

        graph.loseAnswer(`POST /v27.0/${facebookPageId}/video_stories#finish`);

        const result = yield* client.publish(
          yield* outgoing({
            accountId: facebookPageId,
            media: [attached(clip)],
            options: story,
          })
        );

        assert.deepStrictEqual(result, {
          _tag: "unconfirmed",
          reason: "noResponse",
        });
        assert.lengthOf(
          steps(graph).filter((step) => step.endsWith("video_stories finish")),
          1
        );
      }).pipe(Effect.scoped)
  );

  it.live(
    "of a video is not taken for published by its listing alone, while Meta has not published it",
    () =>
      Effect.gen(function* listedEarly() {
        const clip = testFile("video", 4096);

        const { client, graph } = yield* onPage({
          files: [clip],
          graph: { storyListedEarly: true, videoPublishLag: 50 },
        });

        graph.loseAnswer(`POST /v27.0/${facebookPageId}/video_stories#finish`);

        const result = yield* client.publish(
          yield* outgoing({
            accountId: facebookPageId,
            media: [attached(clip)],
            options: story,
          })
        );

        assert.strictEqual(result._tag, "unconfirmed");
        assert.lengthOf(graph.stories(), 1);
      }).pipe(Effect.scoped)
  );

  it.live(
    "of a video is kept under its story's post id when the finish gives none",
    () =>
      Effect.gen(function* withoutPostId() {
        const clip = testFile("video", 4096);

        const { client, graph } = yield* onPage({
          files: [clip],
          graph: { storyFinishWithoutPostId: true },
        });

        const result = yield* client.publish(
          yield* outgoing({
            accountId: facebookPageId,
            media: [attached(clip)],
            options: story,
          })
        );

        assert.deepStrictEqual(result, {
          _tag: "published",
          platformPostId: PlatformPostIdSchema.make(
            graph.stories()[0]?.postId ?? "missing"
          ),
        });
      }).pipe(Effect.scoped)
  );
});
