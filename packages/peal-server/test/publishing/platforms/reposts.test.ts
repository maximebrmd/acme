import { assert, describe, it } from "@effect/vitest";
import type { Context } from "effect";
import { DateTime, Duration, Effect, Layer, Option } from "effect";

import type { PlatformCredentials } from "#publishing/application/platform-credentials.ts";
import type {
  OutgoingRepost,
  RepostClient,
} from "#publishing/application/platform-reposts.ts";
import { followUpSupport } from "#publishing/domain/follow-up-support.ts";
import {
  notReposting,
  repostRegistryWith,
} from "#publishing/infrastructure/platforms/platform-reposts-live.ts";
import { ChannelIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { platforms } from "#shared/domain/platform.ts";
import type { PublishResult } from "#shared/domain/publish-result.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import {
  blueskyDid,
  fakeBluesky,
} from "#test/publishing/fakes/fake-bluesky.ts";
import { json } from "#test/publishing/fakes/platform-server.ts";
import {
  fakeMastodonInstance,
  mastodonAccountId,
} from "#test/publishing/fakes/fake-mastodon-instance.ts";

import type { CredentialLog } from "./support.ts";
import {
  blueskyClientWith,
  blueskySession,
  credentialsOf,
  LiveRegistryTest,
  mastodonClientWith,
  outgoing,
} from "./support.ts";

// Reposting the account's own posts, as follow-up rules do, against the
// loopback fakes: once, whatever runs ask, and never another account's.

const channelId = ChannelIdSchema.make("00000000-0000-7000-8000-0000000000c1");

const workspaceId = WorkspaceIdSchema.make(
  "3f1d2c4b-5a6e-4f7a-8b9c-0d1e2f3a4b5c"
);

const startedAt = DateTime.makeUnsafe("2026-07-06T07:00:00Z");

const idOf = (result: PublishResult) =>
  result._tag === "published"
    ? Effect.succeed(result.platformPostId)
    : Effect.die(`The post was not published: ${result._tag}`);

const repostOf = (
  accountId: string,
  platformPostId: string,
  idempotencyKey = "00000000-0000-7000-8000-0000000000f1"
): OutgoingRepost => ({
  accountId,
  channelId,
  idempotencyKey,
  platformPostId: PlatformPostIdSchema.make(platformPostId),
  startedAt,
  workspaceId,
});

const registryOn = (
  credentials: Context.Context<CredentialLog | PlatformCredentials>
) =>
  repostRegistryWith({ mastodonScheme: "http:" }).pipe(
    Effect.provide(
      Layer.merge(LiveRegistryTest, Layer.succeedContext(credentials))
    )
  );

// The registry's client, which the platform has.
const clientOf = (client: RepostClient | typeof notReposting) =>
  client === notReposting
    ? Effect.die("The platform reposts nothing")
    : Effect.succeed(client);

describe("the repost registry", () => {
  it.effect("reposts exactly where the follow-ups' table says it does", () =>
    Effect.gen(function* registry() {
      const credentials = yield* Layer.build(
        credentialsOf({ accountId: "a@b.example", platform: "mastodon" }, [
          "token-1",
        ])
      );

      const built = yield* registryOn(credentials);

      for (const platform of platforms) {
        assert.strictEqual(
          built[platform] !== notReposting,
          followUpSupport[platform].repost === "available",
          platform
        );
      }
    }).pipe(Effect.scoped)
  );
});

describe("reposting on Mastodon", () => {
  it.live("reblogs the account's own status once, whatever runs ask", () =>
    Effect.gen(function* reblogs() {
      const instance = yield* fakeMastodonInstance();
      const accountId = mastodonAccountId(instance.url);

      const credentials = yield* Layer.build(
        credentialsOf({ accountId, platform: "mastodon" }, ["token-1"])
      );

      const client = yield* mastodonClientWith({
        credentials: Layer.succeedContext(credentials),
      });

      const statusId = yield* idOf(
        yield* client.publish(yield* outgoing({ accountId }))
      );

      const mastodon = yield* clientOf(
        (yield* registryOn(credentials)).mastodon
      );

      const first = yield* mastodon.repost(repostOf(accountId, statusId));
      const again = yield* mastodon.resume(repostOf(accountId, statusId));

      assert.strictEqual(first._tag, "published");
      assert.deepStrictEqual(again, first);
      assert.strictEqual(instance.reblogs().length, 1);
      assert.deepStrictEqual(instance.reblogs()[0]?.[0], statusId);

      const call = instance
        .requests()
        .find(({ path }) => path.endsWith("/reblog"));

      assert.strictEqual(call?.headers["authorization"], "Bearer token-1");
    }).pipe(Effect.scoped)
  );

  it.live("refuses an id that is not a status's before any call", () =>
    Effect.gen(function* refuses() {
      const instance = yield* fakeMastodonInstance();
      const accountId = mastodonAccountId(instance.url);

      const credentials = yield* Layer.build(
        credentialsOf({ accountId, platform: "mastodon" }, ["token-1"])
      );

      const mastodon = yield* clientOf(
        (yield* registryOn(credentials)).mastodon
      );

      const refused = yield* mastodon
        .repost(repostOf(accountId, "../accounts/1"))
        .pipe(Effect.flip);

      assert.strictEqual(refused._tag, "BadRequest");
      assert.deepStrictEqual(
        instance.requests().filter(({ path }) => path.includes("reblog")),
        []
      );
    }).pipe(Effect.scoped)
  );
});

describe("reposting on Bluesky", () => {
  const onPds = Effect.fn("test.onPds")(function* onPds() {
    const pds = yield* fakeBluesky();

    const session = yield* blueskySession({
      accessToken: "access-1",
      did: blueskyDid,
      expiresAt: DateTime.addDuration(startedAt, Duration.days(365)),
      pds: pds.url,
    });

    const credentials = yield* Layer.build(
      credentialsOf({ accountId: blueskyDid, platform: "bluesky" }, [session])
    );

    const client = yield* blueskyClientWith({
      credentials: Layer.succeedContext(credentials),
      videoService: pds.url,
    });

    const bluesky = yield* clientOf((yield* registryOn(credentials)).bluesky);

    return { bluesky, client, pds };
  });

  it.live(
    "makes one repost record of the account's post, read back on a resume",
    () =>
      Effect.gen(function* reposts() {
        const { bluesky, client, pds } = yield* onPds();

        const postId = yield* idOf(
          yield* client.publish(yield* outgoing({ accountId: blueskyDid }))
        );

        const made = yield* bluesky.repost(repostOf(blueskyDid, postId));
        const resumed = yield* bluesky.resume(repostOf(blueskyDid, postId));

        assert.strictEqual(made._tag, "published");
        assert.deepStrictEqual(resumed, made);

        const records = pds
          .records()
          .filter(({ collection }) => collection === "app.bsky.feed.repost");

        assert.strictEqual(records.length, 1);
        assert.deepStrictEqual(
          Option.fromUndefinedOr(records[0]?.value["subject"]),
          Option.some({
            cid:
              pds
                .records()
                .find(({ collection }) => collection === "app.bsky.feed.post")
                ?.cid ?? "",
            uri: postId,
          })
        );
      }).pipe(Effect.scoped)
  );

  it.live("makes the repost on a resume that finds none", () =>
    Effect.gen(function* resumes() {
      const { bluesky, client, pds } = yield* onPds();

      const postId = yield* idOf(
        yield* client.publish(yield* outgoing({ accountId: blueskyDid }))
      );

      const resumed = yield* bluesky.resume(repostOf(blueskyDid, postId));

      assert.strictEqual(resumed._tag, "published");
      assert.strictEqual(
        pds
          .records()
          .filter(({ collection }) => collection === "app.bsky.feed.repost")
          .length,
        1
      );
    }).pipe(Effect.scoped)
  );

  it.live("never reposts another account's post", () =>
    Effect.gen(function* refuses() {
      const { bluesky, pds } = yield* onPds();

      const refused = yield* bluesky
        .repost(
          repostOf(
            blueskyDid,
            "at://did:plc:someoneelse0000000000000/app.bsky.feed.post/3kabcdefghij2"
          )
        )
        .pipe(Effect.flip);

      assert.strictEqual(refused._tag, "BadRequest");
      assert.deepStrictEqual(pds.records(), []);
    }).pipe(Effect.scoped)
  );

  it.live("takes a server's error on the create for a repost that may be made", () =>
    Effect.gen(function* serverError() {
      const { bluesky, client, pds } = yield* onPds();

      const postId = yield* idOf(
        yield* client.publish(yield* outgoing({ accountId: blueskyDid }))
      );

      pds.script("POST /xrpc/com.atproto.repo.createRecord", [
        json({ error: "InternalServerError" }, 500),
      ]);

      const made = yield* bluesky.repost(repostOf(blueskyDid, postId));

      // Never a refusal that arms it again under another key.
      assert.deepStrictEqual(made, {
        _tag: "unconfirmed",
        reason: "noResponse",
      });
    }).pipe(Effect.scoped)
  );
});
