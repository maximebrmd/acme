import { assert, describe, it } from "@effect/vitest";
import { Context, DateTime, Duration, Effect, Layer, Option } from "effect";

import {
  livePostSupport,
  unpublishBlocker,
} from "#publishing/domain/live-post-support.ts";
import { PinterestOptions } from "#publishing/domain/pinterest-options.ts";
import {
  livePostRegistryWith,
  notDeleting,
} from "#publishing/infrastructure/platforms/live-post-clients-live.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import { ChannelIdSchema } from "#shared/domain/ids.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import { platforms } from "#shared/domain/platform.ts";
import type { PublishResult } from "#shared/domain/publish-result.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import { RateLimited } from "#shared/domain/rate-limited.ts";
import { TokenExpired } from "#shared/domain/token-expired.ts";
import {
  blueskyDid,
  fakeBluesky,
} from "#test/publishing/fakes/fake-bluesky.ts";
import {
  businessLocationPath,
  fakeGoogleBusinessApi,
} from "#test/publishing/fakes/fake-google-business-api.ts";
import {
  fakeMastodonInstance,
  mastodonAccountId,
} from "#test/publishing/fakes/fake-mastodon-instance.ts";
import {
  fakePinterestApi,
  pinterestAccountId,
} from "#test/publishing/fakes/fake-pinterest-api.ts";
import { fakeXApi, xAccountId } from "#test/publishing/fakes/fake-x-api.ts";
import { empty, json } from "#test/publishing/fakes/platform-server.ts";
import type { PlatformServer } from "#test/publishing/fakes/platform-server.ts";

import {
  attached,
  blueskyClientWith,
  blueskySession,
  CredentialLog,
  credentialsOf,
  googleBusinessClientWith,
  liveClientsOn,
  LiveRegistryTest,
  mastodonClientWith,
  outgoing,
  pinterestClientWith,
  testFile,
  xClientWith,
} from "./support.ts";

// Deleting posts from each platform, against the loopback fakes, as the
// gates' RemoveLivePost calls do: the fakes delete only the account's own
// posts, as the platforms do, and know nothing of one gone.

const channelId = ChannelIdSchema.make("00000000-0000-7000-8000-0000000000c1");

const idOf = (result: PublishResult) =>
  result._tag === "published"
    ? Effect.succeed(result.platformPostId)
    : Effect.die(`The post was not published: ${result._tag}`);

// The calls a server received with a method.
const callsOf = (server: PlatformServer, method: string) =>
  server.requests().filter((request) => request.method === method);

// A failure, as a value: the test reads it.
const failureOf = <A, E>(effect: Effect.Effect<A, E>) =>
  effect.pipe(Effect.flip);

describe("deleting posts on Mastodon", () => {
  const onInstance = Effect.fn("test.onInstance")(function* onInstance(
    tokens: readonly string[] = ["token-1"]
  ) {
    const instance = yield* fakeMastodonInstance();
    const accountId = mastodonAccountId(instance.url);

    const credentials = yield* Layer.build(
      credentialsOf({ accountId, platform: "mastodon" }, tokens)
    );

    const client = yield* mastodonClientWith({
      credentials: Layer.succeedContext(credentials),
    });

    const live = yield* liveClientsOn({
      credentials: Layer.succeedContext(credentials),
      platforms: {},
    });

    return {
      accountId,
      client,
      instance,
      live,
      log: Context.get(credentials, CredentialLog),
    };
  });

  it.live("deletes a status, and takes one gone as gone", () =>
    Effect.gen(function* deletes() {
      const { accountId, client, instance, live } = yield* onInstance();

      const platformPostId = yield* idOf(
        yield* client.publish(yield* outgoing({ accountId }))
      );

      assert.strictEqual(
        yield* live.remove({ channelId, platformPostId }),
        "removed"
      );
      assert.deepStrictEqual(instance.statuses(), []);

      const [call] = callsOf(instance, "DELETE");

      assert.strictEqual(call?.path, `/api/v1/statuses/${platformPostId}`);
      assert.strictEqual(call?.headers["authorization"], "Bearer token-1");

      // Deleted before: Mastodon has no such status for the account.
      assert.strictEqual(
        yield* live.remove({ channelId, platformPostId }),
        "alreadyGone"
      );
    }).pipe(Effect.scoped)
  );

  it.live(
    "takes a 404 that is not Mastodon's as the instance unreachable",
    () =>
      Effect.gen(function* proxy() {
        const { instance, live } = yield* onInstance();

        instance.script("DELETE /api/v1/statuses/:id", [empty(404)]);

        assert.deepStrictEqual(
          yield* failureOf(
            live.remove({
              channelId,
              platformPostId: PlatformPostIdSchema.make("110000000000000009"),
            })
          ),
          new PlatformUnavailable()
        );
      }).pipe(Effect.scoped)
  );

  it.live("renews a refused token once, and waits when asked to", () =>
    Effect.gen(function* refusals() {
      const { accountId, client, instance, live, log } = yield* onInstance([
        "token-1",
        "token-2",
      ]);

      const platformPostId = yield* idOf(
        yield* client.publish(yield* outgoing({ accountId }))
      );

      instance.revokeTokens();
      instance.allowToken("token-2");

      assert.strictEqual(
        yield* live.remove({ channelId, platformPostId }),
        "removed"
      );
      assert.strictEqual(yield* log.renewals, 1);

      const reset = DateTime.addDuration(
        yield* DateTime.now,
        Duration.minutes(20)
      );

      instance.script("DELETE /api/v1/statuses/:id", [
        json({ error: "Too many requests" }, 429, {
          "x-ratelimit-reset": DateTime.formatIso(reset),
        }),
      ]);

      const limited = yield* failureOf(
        live.remove({ channelId, platformPostId })
      );

      assert.strictEqual(limited._tag, "RateLimited");
      assert.isTrue(
        limited instanceof RateLimited &&
          limited.retryAfter !== undefined &&
          Duration.isGreaterThan(limited.retryAfter, Duration.minutes(19))
      );

      // Refused again after its renewal: the channel must be reconnected.
      instance.revokeTokens();

      assert.deepStrictEqual(
        yield* failureOf(live.remove({ channelId, platformPostId })),
        new TokenExpired()
      );
    }).pipe(Effect.scoped)
  );

  it.live("asks for nothing that is not a status id", () =>
    Effect.gen(function* invalid() {
      const { instance, live } = yield* onInstance();

      assert.deepStrictEqual(
        yield* failureOf(
          live.remove({
            channelId,
            platformPostId: PlatformPostIdSchema.make("../accounts/1"),
          })
        ),
        new BadRequest({ code: "invalidPlatformId" })
      );
      assert.lengthOf(instance.requests(), 0);
    }).pipe(Effect.scoped)
  );
});

describe("deleting posts on Bluesky", () => {
  it.live("deletes the record, and takes one gone as gone", () =>
    Effect.gen(function* deletes() {
      const network = yield* fakeBluesky();
      const now = yield* DateTime.now;

      const session = yield* blueskySession({
        accessToken: "access-1",
        did: blueskyDid,
        expiresAt: DateTime.addDuration(now, Duration.hours(1)),
        pds: network.url,
      });

      const credentials = Layer.succeedContext(
        yield* Layer.build(
          credentialsOf({ accountId: blueskyDid, platform: "bluesky" }, [
            session,
          ])
        )
      );

      const client = yield* blueskyClientWith({
        credentials,
        files: [],
        videoService: network.url,
      });

      const live = yield* liveClientsOn({ credentials, platforms: {} });

      const platformPostId = yield* idOf(
        yield* client.publish(yield* outgoing({ accountId: blueskyDid }))
      );

      assert.lengthOf(network.records(), 1);
      assert.strictEqual(
        yield* live.remove({ channelId, platformPostId }),
        "removed"
      );
      assert.deepStrictEqual(network.records(), []);
      assert.strictEqual(
        yield* live.remove({ channelId, platformPostId }),
        "alreadyGone"
      );

      // Another account's record is not asked for.
      const before = network.requests().length;

      assert.deepStrictEqual(
        yield* failureOf(
          live.remove({
            channelId,
            platformPostId: PlatformPostIdSchema.make(
              "at://did:plc:someoneelse/app.bsky.feed.post/3kq2abcdefg22"
            ),
          })
        ),
        new BadRequest({ code: "invalidPlatformId" })
      );
      assert.strictEqual(network.requests().length, before);
    }).pipe(Effect.scoped)
  );
});

describe("deleting posts on X", () => {
  it.live(
    "deletes a post, takes one gone as gone, and waits for the operator",
    () =>
      Effect.gen(function* deletes() {
        const x = yield* fakeXApi();

        const credentials = Layer.succeedContext(
          yield* Layer.build(
            credentialsOf({ accountId: xAccountId, platform: "x" }, [
              "x-access-1",
            ])
          )
        );

        const client = yield* xClientWith({
          api: x.url,
          credentials,
          files: [],
        });

        const live = yield* liveClientsOn({
          credentials,
          platforms: { xApi: new URL(x.url) },
        });

        const platformPostId = yield* idOf(
          yield* client.publish(yield* outgoing({ accountId: xAccountId }))
        );

        assert.strictEqual(
          yield* live.remove({ channelId, platformPostId }),
          "removed"
        );
        assert.deepStrictEqual(x.posts(), []);
        assert.strictEqual(
          callsOf(x, "DELETE")[0]?.path,
          `/2/tweets/${platformPostId}`
        );
        assert.strictEqual(
          yield* live.remove({ channelId, platformPostId }),
          "alreadyGone"
        );

        // The server's app out of credits: only the operator can help.
        x.script("DELETE /2/tweets/:id", [
          json(
            {
              title: "Payment Required",
              type: "https://api.x.com/2/problems/credits-depleted",
            },
            402
          ),
        ]);

        const refused = yield* failureOf(
          live.remove({ channelId, platformPostId })
        );

        assert.strictEqual(refused._tag, "PlatformUnavailable");
        assert.isTrue(
          refused instanceof PlatformUnavailable && refused.code !== undefined
        );
      }).pipe(Effect.scoped)
  );
});

describe("deleting posts on Pinterest", () => {
  it.live("deletes a Pin, and takes one gone as gone", () =>
    Effect.gen(function* deletes() {
      const pinterest = yield* fakePinterestApi();
      const image = testFile("image", 2048, "image/jpeg");

      const credentials = Layer.succeedContext(
        yield* Layer.build(
          credentialsOf(
            { accountId: pinterestAccountId, platform: "pinterest" },
            ["token-1"]
          )
        )
      );

      const client = yield* pinterestClientWith({
        api: pinterest.url,
        credentials,
        files: [image],
        recorded: [],
      });

      const live = yield* liveClientsOn({
        credentials,
        platforms: { pinterestApi: new URL(pinterest.url) },
      });

      const platformPostId = yield* idOf(
        yield* client.publish(
          yield* outgoing({
            accountId: pinterestAccountId,
            media: [attached(image, "A synthetic image")],
            options: Option.some(
              new PinterestOptions({
                boardId: "549755885001",
                platform: "pinterest",
              })
            ),
          })
        )
      );

      assert.strictEqual(
        yield* live.remove({ channelId, platformPostId }),
        "removed"
      );
      assert.deepStrictEqual(pinterest.pins(), []);
      assert.strictEqual(
        callsOf(pinterest, "DELETE")[0]?.path,
        `/v5/pins/${platformPostId}`
      );
      assert.strictEqual(
        yield* live.remove({ channelId, platformPostId }),
        "alreadyGone"
      );

      // A 404 that is not Pinterest's own came from a server on the way.
      pinterest.script.push(`DELETE /v5/pins/${platformPostId}`, [empty(404)]);

      assert.deepStrictEqual(
        yield* failureOf(live.remove({ channelId, platformPostId })),
        new BadRequest({ code: "http404" })
      );
    }).pipe(Effect.scoped)
  );
});

describe("deleting posts on Google Business Profile", () => {
  it.live("deletes a local post of the location, and nothing else", () =>
    Effect.gen(function* deletes() {
      const google = yield* fakeGoogleBusinessApi();

      const credentials = Layer.succeedContext(
        yield* Layer.build(
          credentialsOf(
            { accountId: businessLocationPath, platform: "googleBusiness" },
            ["ya29.business-1"]
          )
        )
      );

      const client = yield* googleBusinessClientWith({
        api: google.url,
        credentials,
        files: [],
      });

      const live = yield* liveClientsOn({
        credentials,
        platforms: { googleBusinessApi: new URL(google.url) },
      });

      const platformPostId = yield* idOf(
        yield* client.publish(
          yield* outgoing({ accountId: businessLocationPath })
        )
      );

      assert.strictEqual(
        yield* live.remove({ channelId, platformPostId }),
        "removed"
      );
      assert.strictEqual(
        callsOf(google, "DELETE")[0]?.path,
        `/v4/${platformPostId}`
      );
      assert.strictEqual(
        yield* live.remove({ channelId, platformPostId }),
        "alreadyGone"
      );

      // Another location's post is not asked for.
      const before = google.requests().length;

      assert.deepStrictEqual(
        yield* failureOf(
          live.remove({
            channelId,
            platformPostId: PlatformPostIdSchema.make(
              "accounts/200000000000000001/locations/999/localPosts/1"
            ),
          })
        ),
        new BadRequest({ code: "invalidPlatformId" })
      );
      assert.strictEqual(google.requests().length, before);
    }).pipe(Effect.scoped)
  );
});

describe("the platforms that delete", () => {
  it.live(
    "are those the support table says, and refuse the others unasked",
    () =>
      Effect.gen(function* registry() {
        const credentials = Layer.succeedContext(
          yield* Layer.build(
            credentialsOf({ accountId: "synthetic", platform: "threads" }, [
              "token-1",
            ])
          )
        );

        const live = yield* liveClientsOn({ credentials, platforms: {} });

        assert.deepStrictEqual(
          yield* failureOf(
            live.remove({
              channelId,
              platformPostId: PlatformPostIdSchema.make("1"),
            })
          ),
          new BadRequest({ code: "notSupported" })
        );

        const deleting = yield* livePostRegistryWith({
          googleBusinessApi: new URL("http://127.0.0.1:9"),
          mastodonScheme: "http:",
          pinterestApi: new URL("http://127.0.0.1:9"),
          xApi: new URL("http://127.0.0.1:9"),
        }).pipe(Effect.provide(LiveRegistryTest));

        const withRemover = platforms.filter(
          (platform) => deleting[platform] !== notDeleting
        );

        assert.deepStrictEqual(
          withRemover,
          platforms.filter((platform) =>
            Option.isNone(unpublishBlocker(platform))
          )
        );
        assert.deepStrictEqual(
          Object.keys(livePostSupport).toSorted(),
          [...platforms].toSorted()
        );
      }).pipe(Effect.scoped)
  );
});
