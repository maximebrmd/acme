import { assert, describe, it } from "@effect/vitest";
import { Context, Duration, Effect, Layer, Option } from "effect";

import { ThreadsOptions } from "#publishing/domain/threads-options.ts";
import { MediaRejected } from "#shared/domain/media-rejected.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import {
  businessUsage,
  fakeMetaGraph,
  graphAppSecret,
  metaError,
  threadsUserId,
} from "#test/publishing/fakes/fake-meta-graph.ts";
import type { FakeMetaGraphOptions } from "#test/publishing/fakes/fake-meta-graph.ts";
import { dropped } from "#test/publishing/fakes/platform-server.ts";

import {
  attached,
  CredentialLog,
  credentialsOf,
  metaClientWith,
  outgoing,
  testFile,
} from "./support.ts";
import type { TestFile } from "./support.ts";

// The fake Threads API, and the client publishing to it as the account.
const onThreads = Effect.fn("test.onThreads")(function* onThreads(
  options: {
    readonly files?: readonly TestFile[];
    readonly graph?: FakeMetaGraphOptions;
    readonly tokens?: readonly string[];
    readonly accepted?: readonly string[];
  } = {}
) {
  const tokens = options.tokens ?? ["threads-token-1"];
  const graph = yield* fakeMetaGraph(options.accepted ?? tokens, options.graph);

  const credentials = yield* Layer.build(
    credentialsOf({ accountId: threadsUserId, platform: "threads" }, tokens)
  );

  const client = yield* metaClientWith({
    appSecret: graphAppSecret,
    credentials: Layer.succeedContext(credentials),
    files: options.files ?? [],
    platform: "threads",
    url: graph.url,
  });

  return { client, graph, log: Context.get(credentials, CredentialLog) };
});

const publishCalls = (graph: {
  readonly requests: () => readonly {
    readonly method: string;
    readonly path: string;
  }[];
}) =>
  graph
    .requests()
    .filter(
      ({ method, path }) =>
        method === "POST" && path === `/v1.0/${threadsUserId}/threads_publish`
    );

describe("publishing on Threads", () => {
  it.live("publishes text through a container", () =>
    Effect.gen(function* text() {
      const { client, graph } = yield* onThreads();

      const result = yield* client.publish(
        yield* outgoing({ accountId: threadsUserId, text: "Plain words" })
      );

      const [container] = graph.containers();
      const [post] = graph.posts();

      assert.deepStrictEqual(container?.params, {
        media_type: "TEXT",
        text: "Plain words",
      });
      assert.strictEqual(post?.containerId, container?.id);
      assert.deepStrictEqual(result, {
        _tag: "published",
        permalink: `https://social.example/p/${post?.id ?? ""}`,
        platformPostId: PlatformPostIdSchema.make(post?.id ?? "missing"),
      });
      assert.lengthOf(publishCalls(graph), 1);
    }).pipe(Effect.scoped)
  );

  it.live("publishes an image from its public URL, with its alt text", () =>
    Effect.gen(function* image() {
      const photo = testFile("image", 2048, "image/jpeg");
      const { client, graph } = yield* onThreads({ files: [photo] });

      const result = yield* client.publish(
        yield* outgoing({
          accountId: threadsUserId,
          media: [attached(photo, "A red square")],
          text: "With a picture",
        })
      );

      assert.strictEqual(result._tag, "published");
      assert.deepStrictEqual(graph.containers()[0]?.params, {
        alt_text: "A red square",
        image_url: `https://media.test/${photo.media.mediaId}`,
        media_type: "IMAGE",
        text: "With a picture",
      });
    }).pipe(Effect.scoped)
  );

  it.live("waits while Meta processes a video", () =>
    Effect.gen(function* video() {
      const clip = testFile("video", 4096);

      const { client, graph } = yield* onThreads({
        files: [clip],
        graph: { videoPolls: 3 },
      });

      const result = yield* client.publish(
        yield* outgoing({
          accountId: threadsUserId,
          media: [attached(clip, "")],
        })
      );

      const [container] = graph.containers();

      assert.strictEqual(result._tag, "published");
      assert.deepStrictEqual(container?.params, {
        media_type: "VIDEO",
        text: "Hello from a synthetic account",
        video_url: `https://media.test/${clip.media.mediaId}`,
      });
      assert.isAtLeast(
        graph
          .requests()
          .filter(({ path }) => path === `/v1.0/${container?.id ?? ""}`).length,
        4
      );
    }).pipe(Effect.scoped)
  );

  it.live("publishes a carousel once its items are processed", () =>
    Effect.gen(function* carousel() {
      const first = testFile("image", 1024, "image/png");
      const second = testFile("video", 2048);
      const { client, graph } = yield* onThreads({ files: [first, second] });

      const result = yield* client.publish(
        yield* outgoing({
          accountId: threadsUserId,
          media: [attached(first), attached(second, "")],
          text: "Two things",
        })
      );

      const [image, video, album] = graph.containers();

      assert.strictEqual(result._tag, "published");
      assert.strictEqual(image?.params["is_carousel_item"], "true");
      assert.strictEqual(video?.params["is_carousel_item"], "true");
      assert.isUndefined(image?.params["text"]);
      assert.deepStrictEqual(album?.params, {
        children: `${image?.id ?? ""},${video?.id ?? ""}`,
        media_type: "CAROUSEL",
        text: "Two things",
      });
      assert.strictEqual(graph.posts()[0]?.containerId, album?.id);
    }).pipe(Effect.scoped)
  );

  it.live("refuses media that Meta could not process, with its code", () =>
    Effect.gen(function* failed() {
      const clip = testFile("video", 4096);

      const { client, graph } = yield* onThreads({
        files: [clip],
        graph: {
          failing: {
            [`https://media.test/${clip.media.mediaId}`]: "INVALID_DURATION",
          },
        },
      });

      const failure = yield* Effect.flip(
        client.publish(
          yield* outgoing({ accountId: threadsUserId, media: [attached(clip)] })
        )
      );

      assert.deepStrictEqual(
        failure,
        new MediaRejected({ code: "INVALID_DURATION" })
      );
      assert.lengthOf(publishCalls(graph), 0);
    }).pipe(Effect.scoped)
  );

  it.live("waits when the account's daily quota is spent", () =>
    Effect.gen(function* quota() {
      const { client, graph } = yield* onThreads({
        graph: { quotaTotal: 250, quotaUsage: 250 },
      });

      const failure = yield* Effect.flip(
        client.publish(yield* outgoing({ accountId: threadsUserId }))
      );

      assert.strictEqual(failure._tag, "RateLimited");
      assert.lengthOf(graph.containers(), 0);
    }).pipe(Effect.scoped)
  );

  it.live("publishes anyway when Meta will not tell the quota", () =>
    Effect.gen(function* quotaRefused() {
      const { client, graph } = yield* onThreads();

      graph.script.push(`GET /v1.0/${threadsUserId}/threads_publishing_limit`, [
        metaError(100),
      ]);

      const result = yield* client.publish(
        yield* outgoing({ accountId: threadsUserId })
      );

      assert.strictEqual(result._tag, "published");
    }).pipe(Effect.scoped)
  );

  it.live("waits as long as Meta's usage header says when rate limited", () =>
    Effect.gen(function* limited() {
      const { client, graph } = yield* onThreads();

      graph.script.push(`POST /v1.0/${threadsUserId}/threads`, [
        metaError(80_002, 400, businessUsage(17)),
      ]);

      const failure = yield* Effect.flip(
        client.publish(yield* outgoing({ accountId: threadsUserId }))
      );

      assert.strictEqual(failure._tag, "RateLimited");
      assert(failure._tag === "RateLimited");
      assert.deepStrictEqual(failure.retryAfter, Duration.minutes(17));
    }).pipe(Effect.scoped)
  );

  it.live("renews a token Meta refuses, once", () =>
    Effect.gen(function* renews() {
      const { client, log } = yield* onThreads({
        accepted: ["threads-token-2"],
        tokens: ["threads-token-1", "threads-token-2"],
      });

      const result = yield* client.publish(
        yield* outgoing({ accountId: threadsUserId })
      );

      assert.strictEqual(result._tag, "published");
      assert.strictEqual(yield* log.renewals, 1);
    }).pipe(Effect.scoped)
  );

  it.live("asks to reconnect when the renewed token is refused too", () =>
    Effect.gen(function* expired() {
      const { client } = yield* onThreads({
        accepted: [],
        tokens: ["threads-token-1", "threads-token-2"],
      });

      const failure = yield* Effect.flip(
        client.publish(yield* outgoing({ accountId: threadsUserId }))
      );

      assert.strictEqual(failure._tag, "TokenExpired");
    }).pipe(Effect.scoped)
  );

  it.live("takes Meta failing before the post as the platform being down", () =>
    Effect.gen(function* down() {
      const { client, graph } = yield* onThreads();

      graph.script.push(`POST /v1.0/${threadsUserId}/threads`, [
        metaError(2, 500),
      ]);

      const failure = yield* Effect.flip(
        client.publish(yield* outgoing({ accountId: threadsUserId }))
      );

      assert.strictEqual(failure._tag, "PlatformUnavailable");
    }).pipe(Effect.scoped)
  );

  it.live("publishes a container whose publish never reached Meta", () =>
    Effect.gen(function* neverReached() {
      const { client, graph } = yield* onThreads();

      // The connection drops before Meta does anything.
      graph.script.push(`POST /v1.0/${threadsUserId}/threads_publish`, [
        dropped,
      ]);

      const result = yield* client.publish(
        yield* outgoing({ accountId: threadsUserId, text: "Second try" })
      );

      // The container read FINISHED, so publishing it again was safe.
      assert.strictEqual(result._tag, "published");
      assert.lengthOf(publishCalls(graph), 2);
      assert.lengthOf(graph.posts(), 1);
    }).pipe(Effect.scoped)
  );

  it.live("confirms a post whose answer was lost, by its container", () =>
    Effect.gen(function* lostAnswer() {
      const { client, graph } = yield* onThreads();

      graph.loseAnswer(`POST /v1.0/${threadsUserId}/threads_publish`);

      const result = yield* client.publish(
        yield* outgoing({ accountId: threadsUserId, text: "Lost answer" })
      );

      const [post] = graph.posts();

      // The container read PUBLISHED: the post is found, never sent twice.
      assert.deepStrictEqual(result, {
        _tag: "published",
        permalink: `https://social.example/p/${post?.id ?? ""}`,
        platformPostId: PlatformPostIdSchema.make(post?.id ?? "missing"),
      });
      assert.lengthOf(publishCalls(graph), 1);
      assert.lengthOf(graph.posts(), 1);
    }).pipe(Effect.scoped)
  );

  it.live("takes a published container as the post, its list down", () =>
    Effect.gen(function* listingDown() {
      const { client, graph } = yield* onThreads();

      graph.loseAnswer(`POST /v1.0/${threadsUserId}/threads_publish`);
      graph.script.push(
        `GET /v1.0/${threadsUserId}/threads`,
        Array.from({ length: 5 }, () => metaError(2, 500))
      );

      const result = yield* client.publish(
        yield* outgoing({ accountId: threadsUserId, text: "Not listed" })
      );

      const [container] = graph.containers();

      assert.deepStrictEqual(result, {
        _tag: "published",
        platformPostId: PlatformPostIdSchema.make(container?.id ?? ""),
      });
      assert.lengthOf(publishCalls(graph), 1);
    }).pipe(Effect.scoped)
  );

  it.live("resumes an attempt by finding its post, or leaves it to check", () =>
    Effect.gen(function* resumes() {
      const { client, graph } = yield* onThreads();

      const earlier = yield* outgoing({
        accountId: threadsUserId,
        text: "Went out before the restart",
      });

      yield* client.publish(earlier);

      const found = yield* client.resume(earlier);

      assert.strictEqual(found._tag, "published");
      assert.lengthOf(graph.posts(), 1);

      // No post of the attempt among the account's: nothing can tell.
      const unknown = yield* client.resume(
        yield* outgoing({ accountId: threadsUserId, text: "Never seen" })
      );

      assert.deepStrictEqual(unknown, {
        _tag: "unconfirmed",
        reason: "interrupted",
      });
      assert.lengthOf(graph.posts(), 1);
    }).pipe(Effect.scoped)
  );
});

describe("a Threads post's options", () => {
  it.live("go on the container of a post of text alone", () =>
    Effect.gen(function* textAlone() {
      const { client, graph } = yield* onThreads();

      const result = yield* client.publish(
        yield* outgoing({
          accountId: threadsUserId,
          options: Option.some(
            new ThreadsOptions({
              linkAttachment: "https://example.test/launch",
              replyControl: "accounts_you_follow",
              topicTag: "Synthetic launches",
            })
          ),
          text: "Plain words",
        })
      );

      assert.strictEqual(result._tag, "published");
      assert.deepStrictEqual(graph.containers()[0]?.params, {
        link_attachment: "https://example.test/launch",
        media_type: "TEXT",
        reply_control: "accounts_you_follow",
        text: "Plain words",
        topic_tag: "Synthetic launches",
      });
    }).pipe(Effect.scoped)
  );

  it.live("go on a carousel's own container, never on its items", () =>
    Effect.gen(function* carousel() {
      const first = testFile("image", 1024, "image/png");
      const second = testFile("image", 2048, "image/jpeg");
      const { client, graph } = yield* onThreads({ files: [first, second] });

      const result = yield* client.publish(
        yield* outgoing({
          accountId: threadsUserId,
          media: [attached(first), attached(second)],
          options: Option.some(
            new ThreadsOptions({
              replyControl: "mentioned_only",
              topicTag: "Synthetic launches",
            })
          ),
          text: "Two things",
        })
      );

      const [image, other, album] = graph.containers();

      assert.strictEqual(result._tag, "published");
      assert.isUndefined(image?.params["reply_control"]);
      assert.isUndefined(other?.params["topic_tag"]);
      assert.deepStrictEqual(album?.params, {
        children: `${image?.id ?? ""},${other?.id ?? ""}`,
        media_type: "CAROUSEL",
        reply_control: "mentioned_only",
        text: "Two things",
        topic_tag: "Synthetic launches",
      });
    }).pipe(Effect.scoped)
  );

  it.live("go on the container of a single image", () =>
    Effect.gen(function* single() {
      const photo = testFile("image", 2048, "image/jpeg");
      const { client, graph } = yield* onThreads({ files: [photo] });

      yield* client.publish(
        yield* outgoing({
          accountId: threadsUserId,
          media: [attached(photo, "")],
          options: Option.some(
            new ThreadsOptions({ replyControl: "followers_only" })
          ),
          text: "With a picture",
        })
      );

      assert.deepStrictEqual(graph.containers()[0]?.params, {
        image_url: `https://media.test/${photo.media.mediaId}`,
        media_type: "IMAGE",
        reply_control: "followers_only",
        text: "With a picture",
      });
    }).pipe(Effect.scoped)
  );
});
