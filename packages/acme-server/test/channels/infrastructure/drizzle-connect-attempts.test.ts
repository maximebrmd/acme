import { assert, layer } from "@effect/vitest";
import { DateTime, Duration, Effect, Layer, Option } from "effect";

import { ConnectAttempts } from "#channels/application/connect-attempts.ts";
import { EncryptedTokenSchema } from "#channels/application/token-cipher.ts";
import { startAttempt, starterOf } from "#channels/domain/connect-attempt.ts";
import { DrizzleConnectAttempts } from "#channels/infrastructure/drizzle-connect-attempts.ts";
import { Ids } from "#shared/application/ids.ts";
import { ChannelIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import {
  actorIn,
  DatabaseTest,
  freshWorkspace,
} from "#test/channels/support.ts";

const AttemptsTest = DrizzleConnectAttempts.pipe(
  Layer.provideMerge(DatabaseTest)
);

const startedAt = DateTime.makeUnsafe("2026-06-15T07:00:00Z");

const secret = EncryptedTokenSchema.make("test-key.iv.sealed-verifier");

const saved = Effect.fn("saved")(function* saved(workspaceId: WorkspaceId) {
  const unique = yield* Ids.use((ids) => ids.next);
  const actor = actorIn(workspaceId, ["channel:connect"]);

  const attempt = startAttempt(
    {
      actor,
      channelId: Option.some(
        ChannelIdSchema.make("00000000-0000-7000-8000-000000000042")
      ),
      instance: Option.some("https://mastodon.example"),
      platform: "mastodon",
      state: `state-${unique}`,
    },
    startedAt
  );

  yield* ConnectAttempts.use((attempts) => attempts.save(attempt, secret));

  return { actor, attempt };
});

layer(AttemptsTest)("the Drizzle connect attempts", (it) => {
  it.effect("hands an attempt back once, to whoever started it", () =>
    Effect.gen(function* takesOnce() {
      const attempts = yield* ConnectAttempts;
      const workspaceId = yield* freshWorkspace;
      const { actor, attempt } = yield* saved(workspaceId);

      const owner = {
        platform: attempt.platform,
        startedBy: starterOf(actor.subject),
        workspaceId,
      };

      // Asked for by anyone else, it stays.
      for (const other of [
        { ...owner, startedBy: "user:someone-else" },
        { ...owner, workspaceId: yield* freshWorkspace },
        { ...owner, platform: "bluesky" as const },
      ]) {
        assert.deepStrictEqual(
          yield* attempts.take(attempt.state, other),
          Option.none()
        );
      }

      assert.deepStrictEqual(
        yield* attempts.take(attempt.state, owner),
        Option.some({ attempt, secret })
      );
      assert.deepStrictEqual(
        yield* attempts.take(attempt.state, owner),
        Option.none()
      );
    })
  );

  it.effect("forgets the attempts that expired", () =>
    Effect.gen(function* purges() {
      const attempts = yield* ConnectAttempts;
      const workspaceId = yield* freshWorkspace;
      const { actor, attempt } = yield* saved(workspaceId);

      const purged = yield* attempts.purgeExpired(
        DateTime.addDuration(attempt.expiresAt, Duration.seconds(1))
      );

      assert.isAtLeast(purged, 1);
      assert.deepStrictEqual(
        yield* attempts.take(attempt.state, {
          platform: attempt.platform,
          startedBy: starterOf(actor.subject),
          workspaceId,
        }),
        Option.none()
      );
    })
  );
});
