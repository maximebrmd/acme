import { assert, layer } from "@effect/vitest";
import {
  DateTime,
  Deferred,
  Duration,
  Effect,
  Fiber,
  Layer,
  Option,
  Redacted,
  Ref,
} from "effect";

import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { encryptTokens } from "#channels/application/channel-tokens.ts";
import { PlatformAuthorizers } from "#channels/application/platform-authorizer.ts";
import type {
  IssuedTokens,
  PlatformAuthorizer,
} from "#channels/application/platform-authorizer.ts";
import { RefreshChannelTokens } from "#channels/application/refresh-channel-tokens.ts";
import { TokenCipher } from "#channels/application/token-cipher.ts";
import { disable, markRefreshNeeded } from "#channels/domain/channel.ts";
import type { Channel, TokenLifetime } from "#channels/domain/channel.ts";
import type { Platform } from "#channels/domain/platform.ts";
import { tokenPolicies } from "#channels/domain/token-policy.ts";
import { DrizzleChannelRepository } from "#channels/infrastructure/drizzle-channel-repository.ts";
import { SqlChannelLocks } from "#channels/infrastructure/sql-channel-locks.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import { TokenExpired } from "#shared/domain/token-expired.ts";
import { authorizersOf } from "#test/channels/connect-support.ts";
import {
  DatabaseTest,
  freshChannel,
  freshWorkspace,
  RecordedNotices,
  repositoryScopedTo,
  syntheticCredentials,
  TokenCipherTest,
} from "#test/channels/support.ts";

const FileTest = Layer.mergeAll(
  DrizzleChannelRepository,
  SqlChannelLocks,
  RecordedNotices.layer
).pipe(Layer.provideMerge(TokenCipherTest), Layer.provideMerge(DatabaseTest));

type Answer = "refuse" | "renew" | "unreachable";

// A platform whose refreshes follow a script, one answer per call (renewing
// once the script runs out), and that counts them. `delay` holds each call,
// to see two of them overlap or not.
const scripted = Effect.fn("scripted")(function* scripted(
  platform: Platform,
  answers: readonly Answer[] = [],
  delay: Duration.Duration = Duration.zero
) {
  const script = yield* Ref.make(answers);
  const calls = yield* Ref.make(0);

  const refresh: PlatformAuthorizer["refresh"] = () =>
    Effect.gen(function* refreshing() {
      const call = yield* Ref.updateAndGet(calls, (count) => count + 1);

      const answer = yield* Ref.modify(script, ([next, ...rest]) => [
        next ?? "renew",
        rest,
      ]);

      yield* Effect.sleep(delay);

      if (answer === "refuse") {
        return yield* new TokenExpired();
      }

      if (answer === "unreachable") {
        return yield* new PlatformUnavailable();
      }

      const now = yield* DateTime.now;

      const issued: IssuedTokens = {
        accessToken: Redacted.make(`rotated-access-${call}`),
        expiresAt: Option.some(DateTime.addDuration(now, Duration.hours(2))),
        refreshToken: Option.some(Redacted.make(`rotated-refresh-${call}`)),
        renewable: true,
        scopes: ["tweet.write", "offline.access"],
      };

      return issued;
    });

  const authorizer: PlatformAuthorizer = {
    begin: () => Effect.die("not used"),
    complete: () => Effect.die("not used"),
    platform,
    policy: tokenPolicies.x,
    refresh,
  };

  return { authorizer, calls: Ref.get(calls) };
});

// The use case over the workspace's channels only, with the authorizer.
const refresherFor = (
  workspaceId: WorkspaceId,
  authorizer: PlatformAuthorizer
) =>
  Layer.fresh(RefreshChannelTokens.layer).pipe(
    Layer.provide(repositoryScopedTo(workspaceId)),
    Layer.provide(Layer.succeed(PlatformAuthorizers, authorizersOf(authorizer)))
  );

const expiringIn = (now: DateTime.Utc, duration: Duration.Input) =>
  DateTime.addDuration(now, Duration.fromInputUnsafe(duration));

// A channel with tokens the cipher really encrypted.
const stored = Effect.fn("stored")(function* stored(
  workspaceId: WorkspaceId,
  options: { readonly platform?: Platform; readonly token: TokenLifetime }
) {
  const channel = yield* freshChannel(workspaceId, {
    platform: options.platform ?? "x",
    token: options.token,
  });

  const credentials = yield* encryptTokens(
    {
      accessToken: Redacted.make(`access-${channel.id}`),
      expiresAt: Option.none(),
      refreshToken: Option.some(Redacted.make(`refresh-${channel.id}`)),
      renewable: true,
      scopes: [],
    },
    channel.id
  );

  yield* ChannelRepository.use((channels) =>
    channels.insert(channel, credentials)
  );

  return channel;
});

const reread = (channel: Channel) =>
  ChannelRepository.use((channels) => channels.get(channel.id)).pipe(
    Effect.map(Option.getOrThrow)
  );

const accessTokenOf = Effect.fn("accessTokenOf")(function* accessTokenOf(
  channel: Channel
) {
  const credentials = yield* ChannelRepository.use((channels) =>
    channels.credentials(channel.id)
  ).pipe(Effect.map(Option.getOrThrow));

  const cipher = yield* TokenCipher;

  return Redacted.value(
    yield* cipher.decrypt(credentials.accessToken, channel.id)
  );
});

const noticesIn = (workspaceId: WorkspaceId) =>
  RecordedNotices.use((recorded) => recorded.of(workspaceId));

layer(FileTest)("refreshing channel tokens", (it) => {
  it.effect("refreshes the channels due, and only them", () =>
    Effect.gen(function* selects() {
      const workspaceId = yield* freshWorkspace;
      const now = yield* DateTime.now;
      const platform = yield* scripted("x");

      const due = yield* stored(workspaceId, {
        token: {
          _tag: "refreshable",
          expiresAt: expiringIn(now, "10 minutes"),
        },
      });

      const expired = yield* stored(workspaceId, {
        token: {
          _tag: "refreshable",
          expiresAt: expiringIn(now, "-5 minutes"),
        },
      });

      const later = yield* stored(workspaceId, {
        token: { _tag: "refreshable", expiresAt: expiringIn(now, "2 hours") },
      });

      const cannotRenew = yield* stored(workspaceId, {
        token: {
          _tag: "nonRefreshable",
          expiresAt: expiringIn(now, "10 minutes"),
          issuedAt: now,
        },
      });

      // No authorizer for its platform here: nothing knows how to renew it.
      const unknown = yield* stored(workspaceId, {
        platform: "threads",
        token: {
          _tag: "refreshable",
          expiresAt: expiringIn(now, "10 minutes"),
        },
      });

      const broken = yield* stored(workspaceId, {
        token: {
          _tag: "refreshable",
          expiresAt: expiringIn(now, "10 minutes"),
        },
      });

      const off = yield* stored(workspaceId, {
        token: {
          _tag: "refreshable",
          expiresAt: expiringIn(now, "10 minutes"),
        },
      });

      yield* ChannelRepository.use((channels) =>
        Effect.all([
          channels.update(markRefreshNeeded(broken, now), Option.none()),
          channels.update(disable(off, now), Option.none()),
        ])
      );

      const report = yield* RefreshChannelTokens.use(
        (refresh) => refresh.sweep
      ).pipe(Effect.provide(refresherFor(workspaceId, platform.authorizer)));

      assert.deepStrictEqual(report, {
        due: 2,
        failed: 0,
        reconnectRequired: 0,
        refreshed: 2,
        unavailable: 0,
      });
      assert.strictEqual(yield* platform.calls, 2);

      for (const untouched of [later, cannotRenew, unknown]) {
        assert.deepStrictEqual(
          (yield* reread(untouched)).token,
          untouched.token
        );
      }

      for (const refreshed of [due, expired]) {
        assert.deepStrictEqual((yield* reread(refreshed)).token, {
          _tag: "refreshable",
          expiresAt: expiringIn(now, "2 hours"),
        });
        assert.match(yield* accessTokenOf(refreshed), /^rotated-access-/u);
      }
    })
  );

  it.effect("saves the new tokens, encrypted for the channel", () =>
    Effect.gen(function* saves() {
      const workspaceId = yield* freshWorkspace;
      const now = yield* DateTime.now;
      const platform = yield* scripted("x");

      const channel = yield* stored(workspaceId, {
        token: { _tag: "refreshable", expiresAt: expiringIn(now, "5 minutes") },
      });

      const outcome = yield* RefreshChannelTokens.use((refresh) =>
        refresh.refresh(channel.id)
      ).pipe(Effect.provide(refresherFor(workspaceId, platform.authorizer)));

      const credentials = yield* ChannelRepository.use((channels) =>
        channels.credentials(channel.id)
      ).pipe(Effect.map(Option.getOrThrow));

      const cipher = yield* TokenCipher;

      assert.strictEqual(outcome, "refreshed");
      assert.notInclude(credentials.accessToken, "rotated");
      assert.strictEqual(yield* accessTokenOf(channel), "rotated-access-1");
      assert.strictEqual(
        Redacted.value(
          yield* cipher.decrypt(
            Option.getOrThrow(credentials.refreshToken),
            channel.id
          )
        ),
        "rotated-refresh-1"
      );
      assert.deepStrictEqual((yield* reread(channel)).scopes, [
        "tweet.write",
        "offline.access",
      ]);
    })
  );

  it.effect(
    "saves the rotated tokens even when the sweep stops while the platform answers",
    () =>
      Effect.gen(function* stopped() {
        const workspaceId = yield* freshWorkspace;
        const now = yield* DateTime.now;
        const asked = yield* Deferred.make<true>();
        const answer = yield* Deferred.make<true>();
        const platform = yield* scripted("x");

        // The platform spends the refresh token when asked, and answers a
        // little later.
        const authorizer: PlatformAuthorizer = {
          ...platform.authorizer,
          refresh: (channel, tokens) =>
            Deferred.succeed(asked, true).pipe(
              Effect.andThen(Deferred.await(answer)),
              Effect.andThen(platform.authorizer.refresh(channel, tokens))
            ),
        };

        const channel = yield* stored(workspaceId, {
          token: {
            _tag: "refreshable",
            expiresAt: expiringIn(now, "5 minutes"),
          },
        });

        const refreshing = yield* RefreshChannelTokens.use((refresh) =>
          refresh.refresh(channel.id)
        ).pipe(
          Effect.provide(refresherFor(workspaceId, authorizer)),
          Effect.forkChild
        );

        yield* Deferred.await(asked);

        // The server shuts down before the platform answers.
        const stopping = yield* Fiber.interrupt(refreshing).pipe(
          Effect.forkChild
        );

        yield* Deferred.succeed(answer, true);
        yield* Fiber.join(stopping);

        assert.strictEqual(yield* accessTokenOf(channel), "rotated-access-1");
        assert.strictEqual((yield* reread(channel)).status._tag, "active");
      })
  );

  it.effect("marks a refused channel for reconnecting, and tells once", () =>
    Effect.gen(function* refused() {
      const workspaceId = yield* freshWorkspace;
      const now = yield* DateTime.now;
      const platform = yield* scripted("x", ["refuse"]);

      const channel = yield* stored(workspaceId, {
        token: { _tag: "refreshable", expiresAt: expiringIn(now, "5 minutes") },
      });

      const sweep = RefreshChannelTokens.use((refresh) => refresh.sweep).pipe(
        Effect.provide(refresherFor(workspaceId, platform.authorizer))
      );

      const first = yield* sweep;
      const second = yield* sweep;

      assert.strictEqual(first.reconnectRequired, 1);
      assert.strictEqual(second.due, 0);
      assert.strictEqual(yield* platform.calls, 1);
      assert.deepStrictEqual((yield* reread(channel)).status, {
        _tag: "refreshNeeded",
      });
      assert.deepStrictEqual(
        (yield* noticesIn(workspaceId)).map(({ kind }) => kind),
        ["reconnectRequired"]
      );
    })
  );

  it.effect("leaves the channel be when the platform does not answer", () =>
    Effect.gen(function* unreachable() {
      const workspaceId = yield* freshWorkspace;
      const now = yield* DateTime.now;
      const platform = yield* scripted("x", ["unreachable"]);

      const channel = yield* stored(workspaceId, {
        token: { _tag: "refreshable", expiresAt: expiringIn(now, "5 minutes") },
      });

      const outcome = yield* RefreshChannelTokens.use((refresh) =>
        refresh.refresh(channel.id)
      ).pipe(Effect.provide(refresherFor(workspaceId, platform.authorizer)));

      assert.strictEqual(outcome, "unavailable");
      assert.deepStrictEqual(yield* reread(channel), channel);
      assert.strictEqual(yield* accessTokenOf(channel), `access-${channel.id}`);
      assert.lengthOf(yield* noticesIn(workspaceId), 0);
    })
  );

  it.effect("asks for a reconnect when the token can no longer be read", () =>
    Effect.gen(function* unreadable() {
      const workspaceId = yield* freshWorkspace;
      const now = yield* DateTime.now;
      const platform = yield* scripted("x");

      // Stored under a key the keyring does not hold.
      const channel = yield* freshChannel(workspaceId, {
        platform: "x",
        token: { _tag: "refreshable", expiresAt: expiringIn(now, "5 minutes") },
      });

      yield* ChannelRepository.use((channels) =>
        channels.insert(channel, syntheticCredentials(channel))
      );

      const outcome = yield* RefreshChannelTokens.use((refresh) =>
        refresh.refresh(channel.id)
      ).pipe(Effect.provide(refresherFor(workspaceId, platform.authorizer)));

      assert.strictEqual(outcome, "reconnectRequired");
      assert.strictEqual(yield* platform.calls, 0);
      assert.deepStrictEqual((yield* reread(channel)).status, {
        _tag: "refreshNeeded",
      });
    })
  );
});

// On the real clock: the second refresh polls for the lock while the first
// waits on the platform.
layer(FileTest, { excludeTestServices: true })(
  "refreshing one channel at a time",
  (it) => {
    it.effect("refreshes a channel once when two refreshes race", () =>
      Effect.gen(function* races() {
        const workspaceId = yield* freshWorkspace;
        const now = yield* DateTime.now;
        const platform = yield* scripted("x", [], Duration.millis(300));

        const channel = yield* stored(workspaceId, {
          token: {
            _tag: "refreshable",
            expiresAt: expiringIn(now, "5 minutes"),
          },
        });

        const outcomes = yield* Effect.gen(function* racing() {
          const refresh = RefreshChannelTokens.use((refresher) =>
            refresher.refresh(channel.id)
          );

          const first = yield* Effect.forkChild(refresh);
          const second = yield* Effect.forkChild(refresh);

          return [yield* Fiber.join(first), yield* Fiber.join(second)];
        }).pipe(Effect.provide(refresherFor(workspaceId, platform.authorizer)));

        // The second waited for the first, then found the token renewed.
        assert.sameMembers(outcomes, ["refreshed", "skipped"]);
        assert.strictEqual(yield* platform.calls, 1);
      })
    );
  }
);
