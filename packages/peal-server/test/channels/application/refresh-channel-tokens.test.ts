import { assert, layer } from "@effect/vitest";
import {
  DateTime,
  Deferred,
  Duration,
  Effect,
  Fiber,
  Layer,
  Logger,
  Metric,
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
import {
  RefreshChannelTokens,
  tokenSweepDuration,
  tokenSweepLeft,
} from "#channels/application/refresh-channel-tokens.ts";
import { TokenCipher } from "#channels/application/token-cipher.ts";
import { disable, markRefreshNeeded } from "#channels/domain/channel.ts";
import type { Channel, TokenLifetime } from "#channels/domain/channel.ts";
import type { Platform } from "#channels/domain/platform.ts";
import { TokenPolicy, tokenPolicies } from "#channels/domain/token-policy.ts";
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

// Tokens of two hours that the sweep renews half an hour ahead, as a
// platform whose tokens lapse when nobody renews them.
const aheadOfExpiry = new TokenPolicy({
  lifetime: Option.some(Duration.hours(2)),
  refresh: {
    _tag: "refreshToken",
    rotates: true,
    sweep: { _tag: "beforeExpiry", ahead: Duration.minutes(30) },
  },
});

// Long enough for any run of these tests.
const budget = Duration.minutes(8);

const sweeping = RefreshChannelTokens.use((refresh) =>
  refresh.sweep({ budget })
);

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
  const asked = yield* Ref.make<readonly Channel["id"][]>([]);

  const refresh: PlatformAuthorizer["refresh"] = (channel) =>
    Effect.gen(function* refreshing() {
      const call = yield* Ref.updateAndGet(calls, (count) => count + 1);

      yield* Ref.update(asked, (ids) => [...ids, channel.id]);

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
        scopes: ["user.info.basic", "video.publish"],
      };

      return issued;
    });

  const authorizer: PlatformAuthorizer = {
    begin: () => Effect.die("not used"),
    complete: () => Effect.die("not used"),
    platform,
    // X's policy keeps unused tokens alive; the others here are renewed
    // ahead of expiry.
    policy: platform === "x" ? tokenPolicies.x : aheadOfExpiry,
    refresh,
  };

  return { asked: Ref.get(asked), authorizer, calls: Ref.get(calls) };
});

// The use case over the workspace's channels only, with the authorizer.
const refresherFor = (
  workspaceId: WorkspaceId,
  ...authorizers: readonly PlatformAuthorizer[]
) =>
  Layer.fresh(RefreshChannelTokens.layer).pipe(
    Layer.provide(repositoryScopedTo(workspaceId)),
    Layer.provide(
      Layer.succeed(PlatformAuthorizers, authorizersOf(...authorizers))
    )
  );

const expiringIn = (now: DateTime.Utc, duration: Duration.Input) =>
  DateTime.addDuration(now, Duration.fromInputUnsafe(duration));

// A channel with tokens the cipher really encrypted.
const stored = Effect.fn("stored")(function* stored(
  workspaceId: WorkspaceId,
  options: { readonly platform?: Platform; readonly token: TokenLifetime }
) {
  const channel = yield* freshChannel(workspaceId, {
    platform: options.platform ?? "tiktok",
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
      const platform = yield* scripted("tiktok");

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

      const report = yield* sweeping.pipe(
        Effect.provide(refresherFor(workspaceId, platform.authorizer))
      );

      assert.deepStrictEqual(report, {
        due: 2,
        failed: 0,
        left: 0,
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

  it.effect("keeps an X token alive only once it has gone a month unused", () =>
    Effect.gen(function* keepsAlive() {
      const workspaceId = yield* freshWorkspace;
      const now = yield* DateTime.now;
      const platform = yield* scripted("x");

      const tokenOf = (expiresIn: Duration.Input) =>
        stored(workspaceId, {
          platform: "x",
          token: {
            _tag: "refreshable",
            expiresAt: expiringIn(now, expiresIn),
          },
        });

      // Renewed when a post needs it: the sweep leaves them be.
      const expiring = yield* tokenOf("10 minutes");
      const expired = yield* tokenOf("-1 day");
      const unused = yield* tokenOf("-31 days");

      const report = yield* sweeping.pipe(
        Effect.provide(refresherFor(workspaceId, platform.authorizer))
      );

      assert.strictEqual(report.refreshed, 1);
      assert.strictEqual(yield* platform.calls, 1);

      for (const untouched of [expiring, expired]) {
        assert.deepStrictEqual(
          (yield* reread(untouched)).token,
          untouched.token
        );
      }

      assert.deepStrictEqual((yield* reread(unused)).token, {
        _tag: "refreshable",
        expiresAt: expiringIn(now, "2 hours"),
      });
    })
  );

  it.effect(
    "refreshes every channel due, a page at a time, however many there are",
    () =>
      Effect.gen(function* everyChannel() {
        const workspaceId = yield* freshWorkspace;
        const now = yield* DateTime.now;
        const platform = yield* scripted("threads");

        // Five times what a run used to take, and ten pages of it.
        const many = 1000;

        const due = yield* Effect.forEach(
          Array.from({ length: many }, (_, index) => index),
          (index) =>
            stored(workspaceId, {
              platform: "threads",
              token: {
                _tag: "refreshable",
                // Several share each expiry, as channels connected together.
                expiresAt: expiringIn(now, Duration.seconds(index % 50)),
              },
            }),
          { concurrency: 8 }
        );

        const report = yield* sweeping.pipe(
          Effect.provide(refresherFor(workspaceId, platform.authorizer))
        );

        assert.deepStrictEqual(report, {
          due: many,
          failed: 0,
          left: 0,
          reconnectRequired: 0,
          refreshed: many,
          unavailable: 0,
        });

        // Each once: a rotating refresh token works a single time.
        assert.sameMembers(
          [...(yield* platform.asked)],
          due.map(({ id }) => id)
        );

        // Nothing is left for the next run.
        assert.strictEqual(
          (yield* sweeping.pipe(
            Effect.provide(refresherFor(workspaceId, platform.authorizer))
          )).due,
          0
        );
      }),
    120_000
  );

  it.effect(
    "tries a channel its platform did not answer for once a run, and goes on to the others",
    () =>
      Effect.gen(function* unanswered() {
        const workspaceId = yield* freshWorkspace;
        const now = yield* DateTime.now;

        // The platform answers nobody: every channel stays due.
        const platform = yield* scripted(
          "threads",
          Array.from({ length: 1000 }, () => "unreachable" as const)
        );

        yield* Effect.forEach(
          Array.from({ length: 250 }, (_, index) => index),
          () =>
            stored(workspaceId, {
              platform: "threads",
              token: {
                _tag: "refreshable",
                expiresAt: expiringIn(now, "5 minutes"),
              },
            }),
          { concurrency: 8 }
        );

        const report = yield* sweeping.pipe(
          Effect.provide(refresherFor(workspaceId, platform.authorizer))
        );

        assert.strictEqual(report.due, 250);
        assert.strictEqual(report.unavailable, 250);
        assert.strictEqual(yield* platform.calls, 250);
      }),
    120_000
  );

  it.effect(
    "renews the tokens about to lapse before it keeps unused ones alive",
    () =>
      Effect.gen(function* urgentFirst() {
        const workspaceId = yield* freshWorkspace;
        const now = yield* DateTime.now;
        const lapsing = yield* scripted("threads");
        const idle = yield* scripted("x");

        // The unused tokens expired long before the others will: by expiry
        // alone, they would come first.
        const unused = yield* Effect.forEach([1, 2, 3, 4, 5], () =>
          stored(workspaceId, {
            platform: "x",
            token: {
              _tag: "refreshable",
              expiresAt: expiringIn(now, "-40 days"),
            },
          })
        );

        const soon = yield* Effect.forEach([1, 2, 3, 4, 5], () =>
          stored(workspaceId, {
            platform: "threads",
            token: {
              _tag: "refreshable",
              expiresAt: expiringIn(now, "10 minutes"),
            },
          })
        );

        const order = yield* Ref.make<readonly Platform[]>([]);

        const recording = (
          authorizer: PlatformAuthorizer
        ): PlatformAuthorizer => ({
          ...authorizer,
          refresh: (channel, tokens) =>
            Ref.update(order, (seen) => [...seen, channel.platform]).pipe(
              Effect.andThen(authorizer.refresh(channel, tokens))
            ),
        });

        const report = yield* sweeping.pipe(
          Effect.provide(
            refresherFor(
              workspaceId,
              recording(lapsing.authorizer),
              recording(idle.authorizer)
            )
          )
        );

        assert.strictEqual(report.refreshed, unused.length + soon.length);
        assert.deepStrictEqual(yield* Ref.get(order), [
          ...soon.map((): Platform => "threads"),
          ...unused.map((): Platform => "x"),
        ]);
      })
  );

  it.effect("saves the new tokens, encrypted for the channel", () =>
    Effect.gen(function* saves() {
      const workspaceId = yield* freshWorkspace;
      const now = yield* DateTime.now;
      const platform = yield* scripted("tiktok");

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
        "user.info.basic",
        "video.publish",
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
        const platform = yield* scripted("tiktok");

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
      const platform = yield* scripted("tiktok", ["refuse"]);

      const channel = yield* stored(workspaceId, {
        token: { _tag: "refreshable", expiresAt: expiringIn(now, "5 minutes") },
      });

      const sweep = sweeping.pipe(
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
      const platform = yield* scripted("tiktok", ["unreachable"]);

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
      const platform = yield* scripted("tiktok");

      // Stored under a key the keyring does not hold.
      const channel = yield* freshChannel(workspaceId, {
        platform: "tiktok",
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

// On the real clock, as a run's budget is time that really passes.
layer(FileTest, { excludeTestServices: true })(
  "a refresh run that cannot finish",
  (it) => {
    it.effect(
      "stops at its budget, leaves the rest due and says how many",
      () =>
        Effect.gen(function* stops() {
          const workspaceId = yield* freshWorkspace;
          const now = yield* DateTime.now;

          // Each refresh takes the platform 150 ms: a run of 600 ms gets
          // through a dozen of the 60 due, three at a time.
          const platform = yield* scripted("threads", [], Duration.millis(150));

          const many = 60;

          yield* Effect.forEach(
            Array.from({ length: many }, (_, index) => index),
            () =>
              stored(workspaceId, {
                platform: "threads",
                token: {
                  _tag: "refreshable",
                  expiresAt: expiringIn(now, "5 minutes"),
                },
              }),
            { concurrency: 8 }
          );

          const logs: string[] = [];

          const capture = Logger.layer([
            Logger.make(({ logLevel, message }) => {
              if (logLevel === "Warn") {
                logs.push(String(message));
              }
            }),
          ]);

          const startedAt = yield* DateTime.now;

          const report = yield* RefreshChannelTokens.use((refresh) =>
            refresh.sweep({ budget: Duration.millis(600) })
          ).pipe(
            Effect.provide(refresherFor(workspaceId, platform.authorizer)),
            Effect.provide(capture)
          );

          const took = DateTime.distance(startedAt, yield* DateTime.now);

          // It stopped starting refreshes at its budget, and waited only
          // for those under way.
          assert.isTrue(Duration.isLessThan(took, Duration.seconds(5)));
          assert.isAtLeast(report.refreshed, 3);
          assert.isBelow(report.refreshed, many);
          assert.strictEqual(report.left, many - report.refreshed);
          assert.strictEqual(yield* platform.calls, report.refreshed);

          assert.strictEqual(
            (yield* Metric.value(tokenSweepLeft)).value,
            report.left
          );
          assert.isAtLeast(
            (yield* Metric.value(tokenSweepDuration)).value,
            0.6
          );
          assert.lengthOf(
            logs.filter((line) => line.includes("could not finish")),
            1
          );

          // The next run takes what it left.
          const next = yield* sweeping.pipe(
            Effect.provide(refresherFor(workspaceId, platform.authorizer))
          );

          assert.strictEqual(next.refreshed, report.left);
          assert.strictEqual(next.left, 0);
          assert.strictEqual((yield* Metric.value(tokenSweepLeft)).value, 0);
        }),
      60_000
    );
  }
);

// On the real clock: the second refresh polls for the lock while the first
// waits on the platform.
layer(FileTest, { excludeTestServices: true })(
  "refreshing one channel at a time",
  (it) => {
    it.effect("refreshes a channel once when two refreshes race", () =>
      Effect.gen(function* races() {
        const workspaceId = yield* freshWorkspace;
        const now = yield* DateTime.now;
        const platform = yield* scripted("tiktok", [], Duration.millis(300));

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
