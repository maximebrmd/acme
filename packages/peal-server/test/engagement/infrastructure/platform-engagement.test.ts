import { assert, describe, it } from "@effect/vitest";
import { DateTime, Effect, Layer, Option, Result } from "effect";
import { Digest, SecureRandom } from "effect/crypto";
import { FetchHttpClient } from "effect/http";

import type { ChannelAccount } from "#channels/application/channel-access.ts";
import { ChannelUnusable } from "#channels/application/channel-unusable.ts";
import { ReplySender } from "#engagement/application/ports/reply-sender.ts";
import type { SendRequest } from "#engagement/application/ports/reply-sender.ts";
import {
  beginSending,
  confirmReply,
  settleReply,
  writeReply,
} from "#engagement/domain/reply.ts";
import type { Reply } from "#engagement/domain/reply.ts";
import { platformEngagementWith } from "#engagement/infrastructure/platforms/platform-engagement.ts";
import type { AccountFailure } from "#test/analytics/access-log.ts";
import { channelAccessOf } from "#test/analytics/access-log.ts";
import { OpenOutboundGuard } from "#test/channels/support.ts";
import { makeWorld } from "#test/engagement/fakes/world.ts";
import type { World } from "#test/engagement/fakes/world.ts";
import {
  channelId,
  comment,
  memberId,
  replyId,
  thread,
} from "#test/engagement/support.ts";
import {
  json,
  platformServer,
} from "#test/publishing/fakes/platform-server.ts";
import type { PlatformAnswer } from "#test/publishing/fakes/platform-server.ts";

// What the channel's gate runs for a reply, between the engagement tables
// and a loopback server answering as Mastodon: the last check before a
// public reply goes out.

const now = DateTime.makeUnsafe("2026-11-10T09:20:00.000Z");

const written = (): Reply =>
  writeReply(
    replyId(1),
    comment(1),
    Option.some(memberId),
    "Thank you, synthetic reader!",
    now
  );

const attempted = (): Reply => Result.getOrThrow(beginSending(written(), now));

const request: SendRequest = { channelId: channelId(1), replyId: replyId(1) };

const made: PlatformAnswer = json({
  id: "3001",
  url: "https://social.example/@studio/3001",
});

// The world holding `reply` under its comment and thread.
const worldWith = (reply: Reply): World => {
  const world = makeWorld();
  const post = thread(1);
  const kept = comment(1);

  world.state.threads.set(post.id, post);
  world.state.comments.set(kept.id, kept);
  world.state.replies.set(reply.id, reply);

  return world;
};

// The gate's sender over `world`, on a server that answers `answer`;
// `failure` is what the channels context says of the channel instead.
const onServer = Effect.fnUntraced(function* onServer(
  world: World,
  answer: PlatformAnswer,
  failure: Option.Option<AccountFailure> = Option.none()
) {
  const server = yield* platformServer(() => answer);

  const account: ChannelAccount = {
    accountId: `109372@${new URL(server.url).host}`,
    channelId: channelId(1),
    connection: Option.none(),
    platform: "mastodon",
    scopes: ["read:statuses", "write:statuses"],
  };

  const sender = yield* ReplySender.pipe(
    Effect.provide(
      platformEngagementWith({
        blueskyAppView: new URL(server.url),
        mastodonScheme: "http:",
      }).pipe(
        Layer.provide(
          Layer.mergeAll(
            world.ports,
            channelAccessOf(
              Option.getOrElse(failure, () => account),
              ["token-1"]
            ),
            FetchHttpClient.layer,
            OpenOutboundGuard,
            Digest.layerWebCrypto,
            SecureRandom.layerWebCrypto
          )
        )
      )
    )
  );

  return { sender, server };
});

const unknown = { _tag: "unconfirmed", reason: "interrupted" } as const;

describe("the gate's reply sender", () => {
  it.effect("sends a reply on its way, and records the call first", () =>
    Effect.gen(function* sends() {
      const world = worldWith(attempted());
      const { sender, server } = yield* onServer(world, made);

      const outcome = yield* sender.send(request);

      assert.strictEqual(outcome._tag, "sent");
      assert.lengthOf(server.requests(), 1);
      assert.isTrue(world.state.claims.has(replyId(1)));
    }).pipe(Effect.scoped)
  );

  it.effect(
    "calls the platform for no reply a person settled, sent or resumed",
    () =>
      Effect.gen(function* refuses() {
        // Handed over as stranded, then found missing by a member.
        const stranded = Result.getOrThrow(
          settleReply(attempted(), unknown, now)
        );

        const settled = Result.getOrThrow(confirmReply(stranded, false, now));
        const world = worldWith(settled);
        const { sender, server } = yield* onServer(world, made);

        assert.deepStrictEqual(yield* sender.send(request), unknown);
        assert.deepStrictEqual(yield* sender.resume(request), unknown);
        assert.lengthOf(server.requests(), 0);
        assert.isFalse(world.state.claims.has(replyId(1)));
      }).pipe(Effect.scoped)
  );

  it.effect(
    "never says a resumed reply did not go out because its channel cannot be read",
    () =>
      Effect.gen(function* resumes() {
        const world = worldWith(attempted());

        const gone = new ChannelUnusable({
          channelId: channelId(1),
          reason: "disabled",
        });

        const { sender, server } = yield* onServer(
          world,
          made,
          Option.some(gone)
        );

        // A first run made no request: nothing went out.
        assert.strictEqual((yield* sender.send(request))._tag, "failed");
        // A resumed one may be out since the run before it.
        assert.deepStrictEqual(yield* sender.resume(request), unknown);
        assert.lengthOf(server.requests(), 0);
      }).pipe(Effect.scoped)
  );

  it.effect(
    "never says a resumed reply did not go out because its comment is gone",
    () =>
      Effect.gen(function* resumes() {
        const world = worldWith(attempted());

        world.state.comments.clear();

        const { sender, server } = yield* onServer(world, made);

        assert.deepStrictEqual(yield* sender.send(request), {
          _tag: "failed",
          reason: "commentGone",
        });
        assert.deepStrictEqual(yield* sender.resume(request), unknown);
        assert.lengthOf(server.requests(), 0);
      }).pipe(Effect.scoped)
  );
});
