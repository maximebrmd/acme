import { assert, describe, it } from "@effect/vitest";
import { Duration, Effect, Option } from "effect";

import { FacebookOptions } from "#publishing/domain/facebook-options.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import {
  businessUsage,
  facebookPageId,
  fakeMetaGraph,
  graphAppSecret,
  metaError,
} from "#test/publishing/fakes/fake-meta-graph.ts";
import { dropped, empty } from "#test/publishing/fakes/platform-server.ts";
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
  options: { readonly files?: readonly TestFile[] } = {}
) {
  const graph = yield* fakeMetaGraph([pageToken]);

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
