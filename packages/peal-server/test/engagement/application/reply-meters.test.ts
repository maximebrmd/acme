// Each reply is one of the billing account's outbound messages, on a
// server that bills: claimed with its journal, given back when it never
// went out.
import { assert, describe, it } from "@effect/vitest";
import { DateTime, Effect, Layer, Option, Ref } from "effect";
import { TestClock } from "effect/testing";

import { EngagementReplies } from "#engagement/application/engagement-replies.ts";
import { SendReply } from "#engagement/application/send-reply.ts";
import { Actor } from "#shared/domain/access.ts";
import { makeWorld } from "#test/engagement/fakes/world.ts";
import {
  channelId,
  comment,
  commentId,
  memberId,
  publishedAt,
  thread,
  workspaceId,
} from "#test/engagement/support.ts";
import { FakeMetersLedger, fakeMeters } from "#test/shared/support.ts";

const editor = new Actor({
  permissions: ["engagement:read", "engagement:reply"],
  subject: { _tag: "user", impersonatedBy: Option.none(), userId: memberId },
  workspaceId,
});

// A world with comments 101 and 102 on a Mastodon channel, its billing
// account allowed `allowed` messages this month.
const worldWith = (allowed: number, paymentMethod = false) => {
  const meters = fakeMeters({ allowed: Option.some(allowed), paymentMethod });
  const world = makeWorld(meters);
  const post = thread(50);

  world.state.threads.set(post.id, post);
  world.state.channels.set(channelId(1), {
    connection: Option.none(),
    platform: "mastodon",
    scopes: ["read:statuses", "write:statuses"],
  });

  for (const index of [0, 1]) {
    const kept = comment(101 + index, {}, post);

    world.state.comments.set(kept.id, kept);
  }

  return { layer: Layer.merge(world.layer, meters), world };
};

const at = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  TestClock.setTime(
    DateTime.toEpochMillis(DateTime.addDuration(publishedAt, "1 hour"))
  ).pipe(Effect.andThen(effect));

const replying = (to: number) =>
  EngagementReplies.use((replies) =>
    replies.reply(editor, commentId(to), "Thank you!")
  );

const ledger = FakeMetersLedger.use(Ref.get);

// A reply to comment 101 under one idempotency key.
const sent = (text: string) =>
  EngagementReplies.use((replies) =>
    replies.reply(editor, commentId(101), text, Option.some("synthetic-key-1"))
  );

describe("replies on a server that bills", () => {
  it.effect(
    "refuses the reply past the month's messages, and journals nothing",
    () => {
      const { layer, world } = worldWith(1);

      return at(
        Effect.gen(function* refused() {
          yield* replying(101);

          const refusal = yield* replying(102).pipe(Effect.flip);

          assert.deepInclude(refusal, {
            _tag: "AllowanceReached",
            allowed: 1,
            meter: "outboundMessages",
            reason: "paymentMethodRequired",
          });
          assert.strictEqual(world.state.replies.size, 1);
          assert.lengthOf(world.state.jobs, 1);
          assert.strictEqual((yield* ledger).used.get("outboundMessages"), 1);
        })
      ).pipe(Effect.provide(layer));
    }
  );

  it.effect(
    "answers a reply sent again under its key once the month's messages are used",
    () => {
      const { layer } = worldWith(1);

      return at(
        Effect.gen(function* again() {
          const first = yield* sent("Thank you!");
          const replayed = yield* sent("Thank you!");

          assert.strictEqual(replayed.id, first.id);
        })
      ).pipe(Effect.provide(layer));
    }
  );

  it.effect("gives the message back when the reply never went out", () => {
    const { layer, world } = worldWith(1);

    world.state.sending = { _tag: "failed", reason: "rateLimited" };

    return at(
      Effect.gen(function* failed() {
        const reply = yield* replying(101);

        yield* SendReply.use((send) => send.run(reply.id));

        const { givenBack, used } = yield* ledger;

        assert.lengthOf(givenBack, 1);
        assert.strictEqual(used.get("outboundMessages"), 0);

        // The message given back lets the next reply out.
        assert.strictEqual((yield* replying(102)).status._tag, "sending");
      })
    ).pipe(Effect.provide(layer));
  });

  it.effect("keeps the message of a reply that went out", () => {
    const { layer } = worldWith(5, true);

    return at(
      Effect.gen(function* wentOut() {
        const reply = yield* replying(101);

        yield* SendReply.use((send) => send.run(reply.id));

        const { claims, givenBack } = yield* ledger;

        assert.lengthOf(claims, 1);
        assert.lengthOf(givenBack, 0);
      })
    ).pipe(Effect.provide(layer));
  });
});
