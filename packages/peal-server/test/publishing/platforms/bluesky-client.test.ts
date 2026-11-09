import { assert, describe, it } from "@effect/vitest";
import { Context, DateTime, Duration, Effect, Layer, Schema } from "effect";

import { recordKeyOf } from "#publishing/infrastructure/platforms/bluesky/record-key.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import { MediaRejected } from "#shared/domain/media-rejected.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import { TokenExpired } from "#shared/domain/token-expired.ts";
import {
  blueskyDid,
  fakeBluesky,
} from "#test/publishing/fakes/fake-bluesky.ts";
import type { FakeBlueskyOptions } from "#test/publishing/fakes/fake-bluesky.ts";
import {
  empty,
  headerOf,
  json,
} from "#test/publishing/fakes/platform-server.ts";
import type { PlatformServer } from "#test/publishing/fakes/platform-server.ts";

import {
  attached,
  blueskyClientWith,
  blueskySession,
  CredentialLog,
  credentialsOf,
  outgoing,
  testFile,
} from "./support.ts";
import type { TestFile } from "./support.ts";

const createPath = "/xrpc/com.atproto.repo.createRecord";

const createRoute = `POST ${createPath}`;

// The fake network, and the client publishing to it as the synthetic
// account, with sessions for the access tokens given, in order.
const onBluesky = Effect.fn("test.onBluesky")(function* onBluesky(
  options: {
    readonly files?: readonly TestFile[];
    readonly network?: FakeBlueskyOptions;
    readonly sessions?: readonly {
      readonly accessToken: string;
      readonly expiresIn?: Duration.Duration;
    }[];
  } = {}
) {
  const network = yield* fakeBluesky(options.network);
  const now = yield* DateTime.now;

  const sessions = yield* Effect.forEach(
    options.sessions ?? [{ accessToken: "access-1" }],
    ({ accessToken, expiresIn = Duration.hours(1) }) =>
      blueskySession({
        accessToken,
        did: blueskyDid,
        expiresAt: DateTime.addDuration(now, expiresIn),
        pds: network.url,
      }),
    { concurrency: 1 }
  );

  const credentials = yield* Layer.build(
    credentialsOf({ accountId: blueskyDid, platform: "bluesky" }, sessions)
  );

  const client = yield* blueskyClientWith({
    credentials: Layer.succeedContext(credentials),
    files: options.files ?? [],
    videoService: network.url,
  });

  return {
    client,
    log: Context.get(credentials, CredentialLog),
    network,
  };
});

const creates = (network: PlatformServer) =>
  network
    .requests()
    .filter(
      (request) => request.method === "POST" && request.path === createPath
    );

const ProofSchema = Schema.fromJsonString(
  Schema.Struct({
    htm: Schema.String,
    htu: Schema.String,
    nonce: Schema.optionalKey(Schema.String),
  })
);

const proofOf = (jwt: string) =>
  Schema.decodeUnknownSync(ProofSchema)(
    Buffer.from(jwt.split(".")[1] ?? "", "base64url").toString()
  );

describe("publishing on Bluesky", () => {
  it.live("creates the post under a record key chosen from the attempt", () =>
    Effect.gen(function* postsText() {
      const { client, network } = yield* onBluesky();

      const post = yield* outgoing({
        accountId: blueskyDid,
        text: "Read https://example.com/notes. #Effect 🚀",
      });

      const result = yield* client.publish(post);
      const rkey = recordKeyOf(post.startedAt, post.idempotencyKey);
      const [record] = network.records();

      assert.match(rkey, /^[234567a-j][234567a-z]{12}$/u);
      assert.strictEqual(record?.rkey, rkey);
      assert.deepStrictEqual(record?.value, {
        $type: "app.bsky.feed.post",
        createdAt: DateTime.formatIso(post.startedAt),
        facets: [
          {
            features: [
              {
                $type: "app.bsky.richtext.facet#link",
                uri: "https://example.com/notes",
              },
            ],
            index: { byteEnd: 30, byteStart: 5 },
          },
          {
            features: [{ $type: "app.bsky.richtext.facet#tag", tag: "Effect" }],
            index: { byteEnd: 39, byteStart: 32 },
          },
        ],
        text: post.text,
      });
      assert.deepStrictEqual(result, {
        _tag: "published",
        permalink: `https://bsky.app/profile/${blueskyDid}/post/${rkey}`,
        platformPostId: PlatformPostIdSchema.make(
          `at://${blueskyDid}/app.bsky.feed.post/${rkey}`
        ),
      });
    }).pipe(Effect.scoped)
  );

  it.live(
    "signs each call with a DPoP proof and the nonce the PDS asks for",
    () =>
      Effect.gen(function* dpop() {
        const { client, network } = yield* onBluesky();

        yield* client.publish(yield* outgoing({ accountId: blueskyDid }));

        const [first, second] = creates(network);

        assert(first !== undefined && second !== undefined);
        assert.strictEqual(headerOf(first, "authorization"), "DPoP access-1");
        assert.isUndefined(proofOf(headerOf(first, "dpop")).nonce);
        assert.deepStrictEqual(proofOf(headerOf(second, "dpop")), {
          htm: "POST",
          htu: `${network.url}${createPath}`,
          nonce: "nonce-a",
        });
        assert.lengthOf(network.records(), 1);
      }).pipe(Effect.scoped)
  );

  it.live("uploads images and embeds them with their descriptions", () =>
    Effect.gen(function* images() {
      const first = testFile("image", 3000);
      const second = testFile("image", 1500, "image/jpeg");
      const { client, network } = yield* onBluesky({ files: [first, second] });

      const result = yield* client.publish(
        yield* outgoing({
          accountId: blueskyDid,
          media: [attached(first, "A red square"), attached(second, "")],
          text: "",
        })
      );

      const [record] = network.records();

      assert.strictEqual(result._tag, "published");
      assert.deepStrictEqual(
        network.blobs().map(({ mimeType, size }) => ({ mimeType, size })),
        [
          { mimeType: "image/png", size: 3000 },
          { mimeType: "image/jpeg", size: 1500 },
        ]
      );
      assert.deepStrictEqual(record?.value["embed"], {
        $type: "app.bsky.embed.images",
        images: network.blobs().map((blob, index) => ({
          alt: index === 0 ? "A red square" : "",
          aspectRatio: { height: 600, width: 800 },
          image: {
            $type: "blob",
            mimeType: blob.mimeType,
            ref: { $link: blob.cid },
            size: blob.size,
          },
        })),
      });
    }).pipe(Effect.scoped)
  );

  it.live("sends a video through the video service and waits for its job", () =>
    Effect.gen(function* video() {
      const clip = testFile("video", 8000);

      const { client, network } = yield* onBluesky({
        files: [clip],
        network: { videoPolls: 2 },
      });

      const result = yield* client.publish(
        yield* outgoing({ accountId: blueskyDid, media: [attached(clip, "")] })
      );

      const looks = network
        .requests()
        .filter((request) => request.path.endsWith("getJobStatus"));

      const upload = network
        .requests()
        .find((request) => request.path.endsWith("uploadVideo"));

      const [blob] = network.blobs();

      assert.strictEqual(result._tag, "published");
      assert.lengthOf(looks, 3);
      assert(upload !== undefined && blob !== undefined);
      assert.strictEqual(headerOf(upload, "authorization"), "Bearer service-1");
      assert.strictEqual(upload.query.get("did"), blueskyDid);
      assert.deepStrictEqual(network.records()[0]?.value["embed"], {
        $type: "app.bsky.embed.video",
        aspectRatio: { height: 600, width: 800 },
        video: {
          $type: "blob",
          mimeType: "video/mp4",
          ref: { $link: blob.cid },
          size: 8000,
        },
      });
    }).pipe(Effect.scoped)
  );

  it.live("refuses a video the service could not process", () =>
    Effect.gen(function* videoFailed() {
      const clip = testFile("video", 1000);

      const { client, network } = yield* onBluesky({
        files: [clip],
        network: { videoFailure: "encoding_failure", videoPolls: 1 },
      });

      const failure = yield* client
        .publish(
          yield* outgoing({ accountId: blueskyDid, media: [attached(clip)] })
        )
        .pipe(Effect.flip);

      assert.deepStrictEqual(
        failure,
        new MediaRejected({ code: "encoding_failure" })
      );
      assert.lengthOf(network.records(), 0);
    }).pipe(Effect.scoped)
  );

  it.live("refuses an image above Bluesky's size before uploading it", () =>
    Effect.gen(function* imageTooLarge() {
      const image = testFile("image", 2_000_001);
      const { client, network } = yield* onBluesky({ files: [image] });

      const failure = yield* client
        .publish(
          yield* outgoing({ accountId: blueskyDid, media: [attached(image)] })
        )
        .pipe(Effect.flip);

      assert.deepStrictEqual(failure, new MediaRejected({ code: "tooLarge" }));
      assert.lengthOf(network.requests(), 0);
    }).pipe(Effect.scoped)
  );

  it.live(
    "renews a session whose access token has run out before calling",
    () =>
      Effect.gen(function* expired() {
        const { client, log, network } = yield* onBluesky({
          sessions: [
            { accessToken: "access-0", expiresIn: Duration.seconds(-5) },
            { accessToken: "access-1" },
          ],
        });

        const result = yield* client.publish(
          yield* outgoing({ accountId: blueskyDid })
        );

        assert.strictEqual(result._tag, "published");
        assert.strictEqual(yield* log.renewals, 1);
        assert.isTrue(
          network
            .requests()
            .every(
              (request) =>
                headerOf(request, "authorization") !== "DPoP access-0"
            )
        );
      }).pipe(Effect.scoped)
  );

  it.live("asks for a reconnect when the renewed token is refused too", () =>
    Effect.gen(function* refusedTwice() {
      const { client, log, network } = yield* onBluesky({
        sessions: [{ accessToken: "access-9" }, { accessToken: "access-8" }],
      });

      const failure = yield* client
        .publish(yield* outgoing({ accountId: blueskyDid }))
        .pipe(Effect.flip);

      assert.deepStrictEqual(failure, new TokenExpired());
      assert.strictEqual(yield* log.renewals, 1);
      assert.lengthOf(network.records(), 0);
    }).pipe(Effect.scoped)
  );

  it.live("tells a rate limit, a refused post and an outage apart", () =>
    Effect.gen(function* failures() {
      const image = testFile("image", 100);
      const { client, network } = yield* onBluesky({ files: [image] });

      const resetAt =
        Math.floor(DateTime.toEpochMillis(yield* DateTime.now) / 1000) + 120;

      network.script(createRoute, [
        json({ error: "RateLimitExceeded" }, 429, {
          "ratelimit-reset": String(resetAt),
        }),
        json({ error: "InvalidRequest", message: "Record too big" }, 400),
      ]);

      network.script("POST /xrpc/com.atproto.repo.uploadBlob", [empty(503)]);

      const text = yield* outgoing({ accountId: blueskyDid });
      const rateLimited = yield* client.publish(text).pipe(Effect.flip);
      const refused = yield* client.publish(text).pipe(Effect.flip);

      const unavailable = yield* client
        .publish(
          yield* outgoing({ accountId: blueskyDid, media: [attached(image)] })
        )
        .pipe(Effect.flip);

      assert(rateLimited._tag === "RateLimited");
      assert(rateLimited.retryAfter !== undefined);
      assert.isTrue(
        Duration.isGreaterThan(rateLimited.retryAfter, Duration.seconds(100)) &&
          Duration.isLessThanOrEqualTo(
            rateLimited.retryAfter,
            Duration.seconds(120)
          )
      );
      assert.deepStrictEqual(
        refused,
        new BadRequest({ code: "InvalidRequest" })
      );
      assert.deepStrictEqual(unavailable, new PlatformUnavailable());
      assert.lengthOf(network.records(), 0);
    }).pipe(Effect.scoped)
  );

  it.live("reads the post back when the create's answer was lost", () =>
    Effect.gen(function* lostAnswer() {
      const { client, network } = yield* onBluesky();

      network.script(createRoute, [{ _tag: "createThenDrop" }]);

      const post = yield* outgoing({ accountId: blueskyDid });
      const result = yield* client.publish(post);
      const rkey = recordKeyOf(post.startedAt, post.idempotencyKey);

      assert.deepStrictEqual(result, {
        _tag: "published",
        permalink: `https://bsky.app/profile/${blueskyDid}/post/${rkey}`,
        platformPostId: PlatformPostIdSchema.make(
          `at://${blueskyDid}/app.bsky.feed.post/${rkey}`
        ),
      });
      assert.lengthOf(network.records(), 1);
      assert.lengthOf(
        network
          .requests()
          .filter((request) => request.path.endsWith("getRecord")),
        1
      );
    }).pipe(Effect.scoped)
  );

  it.live(
    "creates the post again under its key when the PDS failed first",
    () =>
      Effect.gen(function* serverError() {
        const { client, network } = yield* onBluesky();

        network.script(createRoute, [
          json({ error: "InternalServerError" }, 500),
        ]);

        const result = yield* client.publish(
          yield* outgoing({ accountId: blueskyDid })
        );

        assert.strictEqual(result._tag, "published");
        assert.lengthOf(network.records(), 1);
      }).pipe(Effect.scoped)
  );

  it.live(
    "finds the post an interrupted run made, without creating it again",
    () =>
      Effect.gen(function* resumedFound() {
        const { client, network } = yield* onBluesky();
        const post = yield* outgoing({ accountId: blueskyDid });

        // The earlier run's post went out before the run stopped.
        yield* client.publish(post);

        const before = creates(network).length;
        const result = yield* client.resume(post);

        assert.strictEqual(result._tag, "published");
        assert.lengthOf(creates(network), before);
        assert.lengthOf(network.records(), 1);
      }).pipe(Effect.scoped)
  );

  it.live("publishes a resumed post the earlier run never made", () =>
    Effect.gen(function* resumedAbsent() {
      const { client, network } = yield* onBluesky();

      const result = yield* client.resume(
        yield* outgoing({ accountId: blueskyDid })
      );

      assert.strictEqual(result._tag, "published");
      assert.lengthOf(network.records(), 1);
    }).pipe(Effect.scoped)
  );

  it.live("answers unconfirmed when a resumed post cannot be looked up", () =>
    Effect.gen(function* resumedUnknown() {
      const { client, network } = yield* onBluesky();

      network.script("GET /xrpc/com.atproto.repo.getRecord", [empty(502)]);

      const result = yield* client.resume(
        yield* outgoing({ accountId: blueskyDid })
      );

      assert.deepStrictEqual(result, {
        _tag: "unconfirmed",
        reason: "interrupted",
      });
      assert.lengthOf(creates(network), 0);
    }).pipe(Effect.scoped)
  );

  it.live("keeps one record key for every run of an attempt", () =>
    Effect.sync(() => {
      const startedAt = DateTime.makeUnsafe("2026-06-15T08:00:00.123Z");
      const key = recordKeyOf(startedAt, "a3f1");

      assert.strictEqual(recordKeyOf(startedAt, "a3f1"), key);
      assert.notStrictEqual(recordKeyOf(startedAt, "a3f2"), key);
      assert.match(key, /^[234567a-j][234567a-z]{12}$/u);
    })
  );
});
