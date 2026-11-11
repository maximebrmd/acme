import { createHmac } from "node:crypto";

import { assert, describe, it } from "@effect/vitest";
import { Context, Effect, Layer, Option } from "effect";

import { InstagramOptions } from "#publishing/domain/instagram-options.ts";
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
  CredentialLog,
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
        alt_text: "A synthetic picture",
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
        alt_text: "A synthetic picture",
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

  it.live(
    "takes a container Meta says is published as the post, unlisted or not",
    () =>
      Effect.gen(function* listingDown() {
        const photo = jpeg();
        const { client, graph } = yield* onInstagram({ files: [photo] });

        graph.loseAnswer(`POST /v27.0/${instagramUserId}/media_publish`);

        // The account's posts cannot be listed meanwhile.
        graph.script.push(
          `GET /v27.0/${instagramUserId}/media`,
          Array.from({ length: 5 }, () => metaError(2, 500))
        );

        const result = yield* client.publish(
          yield* outgoing({
            accountId: instagramUserId,
            media: [attached(photo)],
            text: "Published, not listed",
          })
        );

        const [container] = graph.containers();

        assert.deepStrictEqual(result, {
          _tag: "published",
          platformPostId: PlatformPostIdSchema.make(container?.id ?? ""),
        });
        assert.lengthOf(graph.posts(), 1);
      }).pipe(Effect.scoped)
  );
});

const instagramToken = "instagram-user-token-1";

// Two fakes: Facebook's Graph, which an account connected with Instagram
// Login is never sent to, and Instagram's, which takes the account's own
// tokens without the main app's proof.
const onInstagramLogin = Effect.fn("test.onInstagramLogin")(
  function* onInstagramLogin(
    options: {
      readonly files?: readonly TestFile[];
      readonly tokens?: readonly string[];
    } = {}
  ) {
    const tokens = options.tokens ?? [instagramToken];
    const facebook = yield* fakeMetaGraph([pageToken]);

    const instagram = yield* fakeMetaGraph(tokens, {
      instagramLogin: true,
    });

    const credentials = yield* Layer.build(
      credentialsOf(
        {
          accountId: instagramUserId,
          connection: Option.some("instagramLogin"),
          platform: "instagram",
        },
        tokens
      )
    );

    const client = yield* metaClientWith({
      appSecret: graphAppSecret,
      credentials: Layer.succeedContext(credentials),
      files: options.files ?? [],
      instagramUrl: instagram.url,
      platform: "instagram",
      url: facebook.url,
    });

    return {
      client,
      facebook,
      instagram,
      log: Context.get(credentials, CredentialLog),
    };
  }
);

describe("publishing on Instagram through Instagram Login", () => {
  it.live(
    "publishes on Instagram's host with the account's own token, unproved",
    () =>
      Effect.gen(function* image() {
        const photo = jpeg();

        const { client, facebook, instagram } = yield* onInstagramLogin({
          files: [photo],
        });

        const result = yield* client.publish(
          yield* outgoing({
            accountId: instagramUserId,
            media: [attached(photo)],
            text: "Straight from the account",
          })
        );

        const [post] = instagram.posts();

        assert.deepStrictEqual(result, {
          _tag: "published",
          permalink: `https://social.example/p/${post?.id ?? ""}`,
          platformPostId: PlatformPostIdSchema.make(post?.id ?? "missing"),
        });
        assert.deepStrictEqual(instagram.containers()[0]?.params, {
          alt_text: "A synthetic picture",
          caption: "Straight from the account",
          image_url: `https://media.test/${photo.media.mediaId}`,
        });
        assert.lengthOf(facebook.requests(), 0);

        // The quota, the container, its status, the publish and the
        // permalink, each with the token and no proof.
        const paths = instagram
          .requests()
          .map((request) => `${request.method} ${request.path}`);

        assert.deepStrictEqual(paths, [
          `GET /v27.0/${instagramUserId}/content_publishing_limit`,
          `POST /v27.0/${instagramUserId}/media`,
          `GET /v27.0/${instagram.containers()[0]?.id ?? ""}`,
          `POST /v27.0/${instagramUserId}/media_publish`,
          `GET /v27.0/${post?.id ?? ""}`,
        ]);

        for (const request of instagram.requests()) {
          const params =
            request.method === "GET"
              ? request.query
              : new URLSearchParams(new TextDecoder().decode(request.body));

          assert.strictEqual(params.get("access_token"), instagramToken);
          assert.isNull(params.get("appsecret_proof"));
        }
      }).pipe(Effect.scoped)
  );

  it.live("publishes a carousel and a reel the same way", () =>
    Effect.gen(function* carousel() {
      const photo = jpeg();
      const clip = testFile("video", 4096);

      const { client, instagram } = yield* onInstagramLogin({
        files: [photo, clip],
      });

      const album = yield* client.publish(
        yield* outgoing({
          accountId: instagramUserId,
          media: [attached(photo), attached(clip)],
          text: "Both",
        })
      );

      const reel = yield* client.publish(
        yield* outgoing({
          accountId: instagramUserId,
          idempotencyKey: "3c5e1a0b7f2d4e6c8a9b0c1d2e3f4a5b",
          media: [attached(clip)],
          text: "A reel",
        })
      );

      assert.strictEqual(album._tag, "published");
      assert.strictEqual(reel._tag, "published");
      assert.deepStrictEqual(
        instagram.containers().map(({ params }) => params["media_type"]),
        [undefined, "VIDEO", "CAROUSEL", "REELS"]
      );
      assert.lengthOf(instagram.posts(), 2);
    }).pipe(Effect.scoped)
  );

  it.live("renews a token Instagram refuses, once, then goes on", () =>
    Effect.gen(function* renewed() {
      const photo = jpeg();
      const renewedToken = "instagram-user-token-2";

      const { client, instagram, log } = yield* onInstagramLogin({
        files: [photo],
        tokens: [instagramToken, renewedToken],
      });

      // Instagram stops taking the first token before anything is made.
      instagram.script.push(
        `GET /v27.0/${instagramUserId}/content_publishing_limit`,
        [metaError(190, 401)]
      );

      const result = yield* client.publish(
        yield* outgoing({
          accountId: instagramUserId,
          media: [attached(photo)],
        })
      );

      assert.strictEqual(result._tag, "published");
      assert.strictEqual(yield* log.renewals, 1);
      assert.lengthOf(instagram.posts(), 1);
    }).pipe(Effect.scoped)
  );

  it.live("confirms by its container a publish whose answer was lost", () =>
    Effect.gen(function* lostAnswer() {
      const photo = jpeg();

      const { client, instagram } = yield* onInstagramLogin({
        files: [photo],
      });

      instagram.loseAnswer(`POST /v27.0/${instagramUserId}/media_publish`);

      const result = yield* client.publish(
        yield* outgoing({
          accountId: instagramUserId,
          media: [attached(photo)],
          text: "Lost on Instagram",
        })
      );

      // Never sent twice: the container said it was published.
      assert.strictEqual(result._tag, "published");
      assert.lengthOf(instagram.posts(), 1);
    }).pipe(Effect.scoped)
  );

  it.live("looks for a resumed attempt's post among the account's", () =>
    Effect.gen(function* resumed() {
      const photo = jpeg();

      const { client, instagram } = yield* onInstagramLogin({
        files: [photo],
      });

      const post = yield* outgoing({
        accountId: instagramUserId,
        media: [attached(photo)],
        text: "Sent before a restart",
      });

      yield* client.publish(post);

      // The run that sent it stopped before it knew: a resume never sends
      // it again, and finds it on Instagram's host.
      const found = yield* client.resume(post);

      assert.strictEqual(found._tag, "published");
      assert.lengthOf(instagram.posts(), 1);
    }).pipe(Effect.scoped)
  );
});

describe("an Instagram post's options", () => {
  it.live("give a reel its settings, a cover winning over a frame", () =>
    Effect.gen(function* reel() {
      const clip = testFile("video", 4096);
      const cover = jpeg();

      const { client, graph } = yield* onInstagram({ files: [clip, cover] });

      yield* client.publish(
        yield* outgoing({
          accountId: instagramUserId,
          media: [attached(clip)],
          options: Option.some(
            new InstagramOptions({
              audioName: "Synthetic theme",
              collaborators: ["synthetic.friend", "another_one"],
              coverMediaId: cover.media.mediaId,
              shareToFeed: false,
              thumbOffsetMs: 1500,
              trialReel: "performance",
            })
          ),
        })
      );

      assert.deepStrictEqual(graph.containers()[0]?.params, {
        audio_name: "Synthetic theme",
        caption: "Hello from a synthetic account",
        collaborators: '["synthetic.friend","another_one"]',
        cover_url: `https://media.test/${cover.media.mediaId}`,
        media_type: "REELS",
        share_to_feed: "false",
        trial_params: '{"graduation_strategy":"SS_PERFORMANCE"}',
        video_url: `https://media.test/${clip.media.mediaId}`,
      });
    }).pipe(Effect.scoped)
  );

  it.live("give a reel the frame chosen when no cover is", () =>
    Effect.gen(function* frame() {
      const clip = testFile("video", 4096);
      const { client, graph } = yield* onInstagram({ files: [clip] });

      yield* client.publish(
        yield* outgoing({
          accountId: instagramUserId,
          media: [attached(clip)],
          options: Option.some(
            new InstagramOptions({ thumbOffsetMs: 1500, trialReel: "manual" })
          ),
        })
      );

      assert.deepStrictEqual(graph.containers()[0]?.params, {
        caption: "Hello from a synthetic account",
        media_type: "REELS",
        thumb_offset: "1500",
        trial_params: '{"graduation_strategy":"MANUAL"}',
        video_url: `https://media.test/${clip.media.mediaId}`,
      });
    }).pipe(Effect.scoped)
  );

  it.live(
    "invite collaborators on a carousel's own container, alt text on its images only",
    () =>
      Effect.gen(function* carousel() {
        const photo = jpeg();
        const clip = testFile("video", 4096);
        const { client, graph } = yield* onInstagram({ files: [photo, clip] });

        yield* client.publish(
          yield* outgoing({
            accountId: instagramUserId,
            media: [attached(photo, "A synthetic sunrise"), attached(clip)],
            options: Option.some(
              new InstagramOptions({ collaborators: ["synthetic.friend"] })
            ),
            text: "Both",
          })
        );

        const [image, video, album] = graph.containers();

        assert.deepStrictEqual(image?.params, {
          alt_text: "A synthetic sunrise",
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
          collaborators: '["synthetic.friend"]',
          media_type: "CAROUSEL",
        });
      }).pipe(Effect.scoped)
  );

  it.live("send no alt text on an image without one", () =>
    Effect.gen(function* noAltText() {
      const photo = jpeg();
      const { client, graph } = yield* onInstagram({ files: [photo] });

      yield* client.publish(
        yield* outgoing({
          accountId: instagramUserId,
          media: [attached(photo, "")],
          options: Option.some(
            new InstagramOptions({ collaborators: ["synthetic.friend"] })
          ),
          text: "A caption",
        })
      );

      assert.deepStrictEqual(graph.containers()[0]?.params, {
        caption: "A caption",
        collaborators: '["synthetic.friend"]',
        image_url: `https://media.test/${photo.media.mediaId}`,
      });
    }).pipe(Effect.scoped)
  );

  // Meta's error names no parameter in a code (its message is never read):
  // a container refused while it names collaborators keeps Meta's code,
  // as any container's refusal, and is not told to be about the option.
  it.live(
    "keep Meta's code when it refuses a post that names collaborators",
    () =>
      Effect.gen(function* refused() {
        const photo = jpeg();
        const { client, graph } = yield* onInstagram({ files: [photo] });

        graph.script.push(`POST /v27.0/${instagramUserId}/media`, [
          metaError(100),
        ]);

        const failure = yield* Effect.flip(
          client.publish(
            yield* outgoing({
              accountId: instagramUserId,
              media: [attached(photo)],
              options: Option.some(
                new InstagramOptions({ collaborators: ["synthetic.friend"] })
              ),
            })
          )
        );

        assert.strictEqual(failure._tag, "MediaRejected");
        assert.strictEqual(
          "code" in failure ? failure.code : undefined,
          "graph100"
        );
        assert.lengthOf(graph.posts(), 0);
      }).pipe(Effect.scoped)
  );
});
