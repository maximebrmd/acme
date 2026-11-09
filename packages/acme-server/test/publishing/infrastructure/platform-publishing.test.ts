import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer, Option, Scope } from "effect";
import { MessageStorage } from "effect/cluster";
import { Digest, SecureRandom } from "effect/crypto";
import { FetchHttpClient } from "effect/http";

import { RoutedPlatformPublisher } from "#publishing/application/routed-platform-publisher.ts";
import { platformClientsWith } from "#publishing/infrastructure/platforms/platform-clients-live.ts";
import { OpenOutboundGuard } from "#test/channels/support.ts";
import {
  fakeMastodonInstance,
  mastodonAccountId,
} from "#test/publishing/fakes/fake-mastodon-instance.ts";
import {
  credentialsOf,
  mediaOf,
  testTiming,
} from "#test/publishing/platforms/support.ts";

import {
  DatabaseTest,
  deploy,
  eventually,
  isFinished,
  isSuspended,
  journalOf,
  newChannel,
  outcomeOf,
  restartable,
  scheduleIn,
  schedulePost,
  setTime,
  shutDown,
  targetsOf,
} from "./harness.ts";

const timeout = 60_000;

// The platforms as production runs them, Mastodon on the fake instance,
// with stand-in credentials for its account and no media.
const platformsOn = (instanceUrl: string) =>
  RoutedPlatformPublisher.pipe(
    Layer.provide(
      platformClientsWith({
        mastodonScheme: "http:",
        timing: testTiming,
        videoService: new URL(instanceUrl),
      })
    ),
    Layer.provideMerge(
      Layer.mergeAll(
        credentialsOf(
          { accountId: mastodonAccountId(instanceUrl), platform: "mastodon" },
          ["token-1"]
        ),
        mediaOf([])
      )
    ),
    Layer.provide(
      Layer.mergeAll(
        FetchHttpClient.layer,
        OpenOutboundGuard,
        SecureRandom.layerWebCrypto,
        Digest.layerWebCrypto
      )
    )
  );

describe("publishing through the channel gates", () => {
  it.effect(
    "publishes on the platform through the gate, and records the post",
    () =>
      Effect.gen(function* publishes() {
        yield* setTime("2026-06-15T07:00:00Z");

        const instance = yield* fakeMastodonInstance();

        const server = deploy(
          MessageStorage.layerMemory,
          platformsOn(instance.url)
        ).pipe(Layer.provideMerge(DatabaseTest));

        const scope = yield* Scope.make();
        const context = yield* Layer.buildWithScope(server, scope);
        const channel = yield* newChannel;

        const post = yield* schedulePost(
          [channel],
          scheduleIn("2026-06-15T08:00:00Z")
        ).pipe(Effect.provideContext(context));

        yield* eventually("the job sleeps", isSuspended(post.id)).pipe(
          Effect.provideContext(context)
        );
        yield* setTime("2026-06-15T08:00:00Z");
        yield* eventually("the post finishes", isFinished(post.id)).pipe(
          Effect.provideContext(context)
        );

        const [status] = instance.statuses();

        const [target] = yield* targetsOf(post.id).pipe(
          Effect.provideContext(context)
        );

        const journal = yield* journalOf(target?.id ?? "").pipe(
          Effect.provideContext(context)
        );

        assert.strictEqual(
          yield* outcomeOf(post.id).pipe(Effect.provideContext(context)),
          "published"
        );
        assert.lengthOf(instance.statuses(), 1);
        assert.strictEqual(status?.text, "A synthetic post for tests.");
        assert.strictEqual(status?.idempotencyKey, journal[0]?.idempotency_key);
        assert(target?.status._tag === "published");
        assert.deepStrictEqual(
          target.status.platformPostId,
          Option.some(status?.id ?? "")
        );

        yield* shutDown(scope);
      }).pipe(Effect.scoped),
    timeout
  );

  it.effect(
    "finds the post a call cut short by a restart made, instead of calling it unconfirmed",
    () =>
      Effect.gen(function* resumesAfterRestart() {
        yield* setTime("2026-06-15T07:00:00Z");

        const { platform, server } = yield* restartable;
        const before = yield* Scope.make();
        const first = yield* Layer.buildWithScope(server, before);
        const channel = yield* newChannel;

        // The post goes live and the answer never comes back; the platform
        // can look a post up by the key it was sent with.
        yield* platform.script(channel, [{ _tag: "hang" }]);
        yield* platform.lookUpOnResume(channel);

        const post = yield* schedulePost(
          [channel],
          scheduleIn("2026-06-15T08:00:00Z")
        ).pipe(Effect.provideContext(first));

        yield* eventually("the job sleeps", isSuspended(post.id)).pipe(
          Effect.provideContext(first)
        );
        yield* setTime("2026-06-15T08:00:00Z");
        yield* eventually(
          "the call is in flight",
          platform.calls.pipe(Effect.map((calls) => calls.length === 1))
        ).pipe(Effect.provideContext(first));
        yield* shutDown(before);

        const after = yield* Scope.make();
        const second = yield* Layer.buildWithScope(server, after);

        yield* eventually("the post finishes", isFinished(post.id)).pipe(
          Effect.provideContext(second)
        );

        const [target] = yield* targetsOf(post.id).pipe(
          Effect.provideContext(second)
        );

        assert.lengthOf(yield* platform.calls, 1);
        assert.lengthOf(yield* platform.live, 1);
        assert.lengthOf(yield* platform.resumes, 1);
        assert.strictEqual(
          yield* outcomeOf(post.id).pipe(Effect.provideContext(second)),
          "published"
        );
        assert(target?.status._tag === "published");
        assert.deepStrictEqual(
          target.status.platformPostId,
          Option.some("fake-1")
        );

        yield* shutDown(after);
      }).pipe(Effect.scoped),
    timeout
  );
});
