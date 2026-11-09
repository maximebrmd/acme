import { createHmac } from "node:crypto";

import { assert, describe, it } from "@effect/vitest";
import { Effect } from "effect";

import { MediaRejected } from "#shared/domain/media-rejected.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import {
  fakeMetaGraph,
  graphAppSecret,
  instagramUserId,
  metaError,
} from "#test/publishing/fakes/fake-meta-graph.ts";
import type { FakeMetaGraphOptions } from "#test/publishing/fakes/fake-meta-graph.ts";
import { headerOf } from "#test/publishing/fakes/platform-server.ts";

import {
  attached,
  credentialsOf,
  metaClientWith,
  outgoing,
  testFile,
} from "./support.ts";
import type { TestFile } from "./support.ts";

const pageToken = "page-token-1";

// The fake Graph API, and the client publishing to it as the account, with
// the token of the Page it is linked to.
const onInstagram = Effect.fn("test.onInstagram")(function* onInstagram(
  options: {
    readonly appSecret?: string;
    readonly files?: readonly TestFile[];
    readonly graph?: FakeMetaGraphOptions;
  } = {}
) {
  const graph = yield* fakeMetaGraph([pageToken], options.graph);

  const client = yield* metaClientWith({
    appSecret: options.appSecret ?? graphAppSecret,
    credentials: credentialsOf(
      { accountId: instagramUserId, platform: "instagram" },
      [pageToken]
    ),
    files: options.files ?? [],
    platform: "instagram",
    url: graph.url,
  });

  return { client, graph };
});

const jpeg = () => testFile("image", 2048, "image/jpeg");

describe("publishing on Instagram", () => {
  it.live("publishes an image with its caption, proving the app", () =>
    Effect.gen(function* image() {
      const photo = jpeg();
      const { client, graph } = yield* onInstagram({ files: [photo] });

      const result = yield* client.publish(
        yield* outgoing({
          accountId: instagramUserId,
          media: [attached(photo)],
          text: "A caption #launch",
        })
      );

      const [container] = graph.containers();
      const [post] = graph.posts();

      assert.deepStrictEqual(container?.params, {
        caption: "A caption #launch",
        image_url: `https://media.test/${photo.media.mediaId}`,
      });
      assert.deepStrictEqual(result, {
        _tag: "published",
        permalink: `https://social.example/p/${post?.id ?? ""}`,
        platformPostId: PlatformPostIdSchema.make(post?.id ?? "missing"),
      });

      // Every call carried the token's proof, keyed with the app secret.
      const proof = createHmac("sha256", graphAppSecret)
        .update(pageToken)
        .digest("hex");

      for (const request of graph.requests()) {
        const params =
          request.method === "GET"
            ? request.query
            : new URLSearchParams(new TextDecoder().decode(request.body));

        assert.strictEqual(params.get("appsecret_proof"), proof);
        assert.strictEqual(headerOf(request, "authorization"), "");
      }
    }).pipe(Effect.scoped)
  );

  it.live("publishes a video as a reel", () =>
    Effect.gen(function* reel() {
      const clip = testFile("video", 4096);

      const { client, graph } = yield* onInstagram({
        files: [clip],
        graph: { videoPolls: 2 },
      });

      const result = yield* client.publish(
        yield* outgoing({ accountId: instagramUserId, media: [attached(clip)] })
      );

      assert.strictEqual(result._tag, "published");
      assert.deepStrictEqual(graph.containers()[0]?.params, {
        caption: "Hello from a synthetic account",
        media_type: "REELS",
        video_url: `https://media.test/${clip.media.mediaId}`,
      });
    }).pipe(Effect.scoped)
  );

  it.live("publishes a carousel of images and a video", () =>
    Effect.gen(function* carousel() {
      const photo = jpeg();
      const clip = testFile("video", 4096);
      const { client, graph } = yield* onInstagram({ files: [photo, clip] });

      const result = yield* client.publish(
        yield* outgoing({
          accountId: instagramUserId,
          media: [attached(photo), attached(clip)],
          text: "Both",
        })
      );

      const [image, video, album] = graph.containers();

      assert.strictEqual(result._tag, "published");
      assert.deepStrictEqual(image?.params, {
        image_url: `https://media.test/${photo.media.mediaId}`,
        is_carousel_item: "true",
      });
      assert.deepStrictEqual(video?.params, {
        is_carousel_item: "true",
        media_type: "VIDEO",
        video_url: `https://media.test/${clip.media.mediaId}`,
      });
      assert.deepStrictEqual(album?.params, {
        caption: "Both",
        children: `${image?.id ?? ""},${video?.id ?? ""}`,
        media_type: "CAROUSEL",
      });
    }).pipe(Effect.scoped)
  );

  it.live("refuses an image that is not a JPEG before sending anything", () =>
    Effect.gen(function* png() {
      const photo = testFile("image", 2048, "image/png");
      const { client, graph } = yield* onInstagram({ files: [photo] });

      const failure = yield* Effect.flip(
        client.publish(
          yield* outgoing({
            accountId: instagramUserId,
            media: [attached(photo)],
          })
        )
      );

      assert.deepStrictEqual(
        failure,
        new MediaRejected({ code: "unsupportedType" })
      );
      assert.lengthOf(graph.containers(), 0);
    }).pipe(Effect.scoped)
  );

  it.live("refuses media Meta could not process, with Instagram's code", () =>
    Effect.gen(function* failed() {
      const clip = testFile("video", 4096);

      const { client } = yield* onInstagram({
        files: [clip],
        graph: {
          failing: {
            [`https://media.test/${clip.media.mediaId}`]:
              "Media upload has failed with error code 2207026",
          },
        },
      });

      const failure = yield* Effect.flip(
        client.publish(
          yield* outgoing({
            accountId: instagramUserId,
            media: [attached(clip)],
          })
        )
      );

      assert.deepStrictEqual(failure, new MediaRejected({ code: "ig2207026" }));
    }).pipe(Effect.scoped)
  );

  it.live("waits when the account's daily publishing limit is reached", () =>
    Effect.gen(function* quota() {
      const photo = jpeg();

      const { client, graph } = yield* onInstagram({
        files: [photo],
        graph: { quotaTotal: 100, quotaUsage: 100 },
      });

      const failure = yield* Effect.flip(
        client.publish(
          yield* outgoing({
            accountId: instagramUserId,
            media: [attached(photo)],
          })
        )
      );

      assert.strictEqual(failure._tag, "RateLimited");
      assert.lengthOf(graph.containers(), 0);
    }).pipe(Effect.scoped)
  );

  it.live("takes Meta's publishing limit error as a rate limit", () =>
    Effect.gen(function* limit() {
      const photo = jpeg();
      const { client, graph } = yield* onInstagram({ files: [photo] });

      graph.script.push(`POST /v27.0/${instagramUserId}/media_publish`, [
        {
          _tag: "answer",
          body: { error: { code: 9, error_subcode: 2_207_042 } },
          status: 400,
        },
      ]);

      const failure = yield* Effect.flip(
        client.publish(
          yield* outgoing({
            accountId: instagramUserId,
            media: [attached(photo)],
          })
        )
      );

      assert.strictEqual(failure._tag, "RateLimited");
      assert.lengthOf(graph.posts(), 0);
    }).pipe(Effect.scoped)
  );

  it.live("asks to reconnect when the Page's token stops working", () =>
    Effect.gen(function* revoked() {
      const photo = jpeg();
      const { client, graph } = yield* onInstagram({ files: [photo] });

      // The user lost their role on the Page.
      graph.script.push(
        `GET /v27.0/${instagramUserId}/content_publishing_limit`,
        [metaError(492)]
      );

      const failure = yield* Effect.flip(
        client.publish(
          yield* outgoing({
            accountId: instagramUserId,
            media: [attached(photo)],
          })
        )
      );

      // Only one token stood in for the channel: renewing it found none.
      assert.strictEqual(failure._tag, "TokenExpired");
    }).pipe(Effect.scoped)
  );

  it.live("refuses calls made without the right app secret", () =>
    Effect.gen(function* wrongSecret() {
      const photo = jpeg();

      const { client, graph } = yield* onInstagram({
        appSecret: "another-secret",
        files: [photo],
      });

      const failure = yield* Effect.flip(
        client.publish(
          yield* outgoing({
            accountId: instagramUserId,
            media: [attached(photo)],
          })
        )
      );

      // Meta refuses the proof as an invalid parameter: nothing is made.
      assert.deepStrictEqual(failure, new MediaRejected({ code: "graph100" }));
      assert.lengthOf(graph.containers(), 0);
    }).pipe(Effect.scoped)
  );

  it.live("confirms a post whose answer was lost, by its container", () =>
    Effect.gen(function* lostAnswer() {
      const photo = jpeg();
      const { client, graph } = yield* onInstagram({ files: [photo] });

      graph.loseAnswer(`POST /v27.0/${instagramUserId}/media_publish`);

      const result = yield* client.publish(
        yield* outgoing({
          accountId: instagramUserId,
          media: [attached(photo)],
          text: "Lost answer",
        })
      );

      assert.strictEqual(result._tag, "published");
      assert.strictEqual(
        result._tag === "published" ? result.platformPostId : "",
        graph.posts()[0]?.id
      );
      assert.lengthOf(graph.posts(), 1);
    }).pipe(Effect.scoped)
  );
});
