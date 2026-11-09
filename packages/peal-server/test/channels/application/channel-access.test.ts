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
import { TestClock } from "effect/testing";

import { ChannelAccess } from "#channels/application/channel-access.ts";
import { ChannelLocks } from "#channels/application/channel-locks.ts";
import { ChannelRepository } from "#channels/application/channel-repository.ts";
import {
  decryptTokens,
  encryptTokens,
} from "#channels/application/channel-tokens.ts";
import { ChannelUnusable } from "#channels/application/channel-unusable.ts";
import { PlatformAuthorizers } from "#channels/application/platform-authorizer.ts";
import type {
  IssuedTokens,
  PlatformAuthorizer,
} from "#channels/application/platform-authorizer.ts";
import type { TokenCipher } from "#channels/application/token-cipher.ts";
import {
  disable,
  markRefreshNeeded,
  renewToken,
} from "#channels/domain/channel.ts";
import type { Channel, TokenLifetime } from "#channels/domain/channel.ts";
import type { Platform } from "#channels/domain/platform.ts";
import { tokenPolicies } from "#channels/domain/token-policy.ts";
import { DrizzleChannelRepository } from "#channels/infrastructure/drizzle-channel-repository.ts";
import { SqlChannelLocks } from "#channels/infrastructure/sql-channel-locks.ts";
import { newId } from "#shared/application/ids.ts";
import { ChannelIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import { TokenExpired } from "#shared/domain/token-expired.ts";
import { TokenRejected } from "#shared/domain/token-rejected.ts";
import { authorizersOf } from "#test/channels/connect-support.ts";
import {
  DatabaseTest,
  freshChannel,
  freshWorkspace,
  RecordedNotices,
  TokenCipherTest,
} from "#test/channels/support.ts";

const FileTest = Layer.mergeAll(
  DrizzleChannelRepository,
  SqlChannelLocks,
  RecordedNotices.layer
).pipe(Layer.provideMerge(TokenCipherTest), Layer.provideMerge(DatabaseTest));

type Answer = "refuse" | "renew" | "unreachable";

// An authorizer whose refreshes follow a script (renewing once it runs
// out), and that counts them.
const scripted = Effect.fn("scripted")(function* scripted(
  platform: Platform,
  answers: readonly Answer[] = []
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

      if (answer === "refuse") {
        return yield* new TokenExpired();
      }

      if (answer === "unreachable") {
        return yield* new PlatformUnavailable();
      }

      const issued: IssuedTokens = {
        accessToken: Redacted.make(`renewed-access-${call}`),
        expiresAt: Option.some(
          DateTime.addDuration(yield* DateTime.now, Duration.hours(2))
        ),
        refreshToken: Option.some(Redacted.make(`renewed-refresh-${call}`)),
        renewable: true,
        scopes: ["write"],
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

const accessWith = (authorizer: PlatformAuthorizer) =>
  Layer.fresh(ChannelAccess.layer).pipe(
    Layer.provide(Layer.succeed(PlatformAuthorizers, authorizersOf(authorizer)))
  );

const inAnHour: (now: DateTime.Utc) => TokenLifetime = (now) => ({
  _tag: "refreshable",
  expiresAt: DateTime.addDuration(now, Duration.hours(1)),
});

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

const storedAccessToken = Effect.fn("storedAccessToken")(
  function* storedAccessToken(channelId: Parameters<typeof decryptTokens>[1]) {
    const credentials = yield* ChannelRepository.use((channels) =>
      channels.credentials(channelId)
    );

    const tokens = yield* decryptTokens(
      Option.getOrThrow(credentials),
      channelId
    );

    return Redacted.value(tokens.accessToken);
  }
);

const statusOf = Effect.fn("statusOf")(function* statusOf(
  channelId: Parameters<typeof decryptTokens>[1]
) {
  const found = yield* ChannelRepository.use((channels) =>
    channels.get(channelId)
  );

  return Option.getOrThrow(found).status._tag;
});

// The channel's tokens replaced with `accessToken`, as a reconnect does.
const replaceToken = (channel: Channel, accessToken: string) =>
  encryptTokens(
    {
      accessToken: Redacted.make(accessToken),
      expiresAt: Option.none(),
      refreshToken: Option.none(),
      renewable: false,
      scopes: [],
    },
    channel.id
  ).pipe(
    Effect.flatMap((credentials) =>
      ChannelRepository.use((channels) =>
        channels.update(channel, Option.some(credentials))
      )
    ),
    Effect.asVoid
  );

// The channel locks, which run `before` once, just before the first lock
// is taken: what another process did while the caller went for it.
const lockingAfter = <E>(
  before: Effect.Effect<void, E, ChannelRepository | TokenCipher>
) =>
  Layer.effect(
    ChannelLocks,
    Effect.gen(function* lockingAfterLive() {
      const locks = yield* ChannelLocks;
      const services = yield* Effect.context<ChannelRepository | TokenCipher>();
      const pending = yield* Ref.make(true);

      return ChannelLocks.of({
        withLock: (channelId, effect) =>
          Ref.getAndSet(pending, false).pipe(
            Effect.flatMap((first) =>
              first
                ? before.pipe(Effect.provide(services), Effect.orDie)
                : Effect.void
            ),
            Effect.andThen(locks.withLock(channelId, effect))
          ),
      });
    })
  );

// What the platform saw: the tokens calls were made with.
const recording = Effect.fn("recording")(function* recording() {
  const seen = yield* Ref.make<readonly string[]>([]);

  const record = (token: Redacted.Redacted) =>
    Ref.update(seen, (tokens) => [...tokens, Redacted.value(token)]);

  return { record, seen: Ref.get(seen) };
});

layer(FileTest)("ChannelAccess", (it) => {
  it.effect("hands out the channel's decrypted token", () =>
    Effect.gen(function* handsOut() {
      const workspaceId = yield* freshWorkspace;
      const now = yield* DateTime.now;
      const channel = yield* stored(workspaceId, { token: inAnHour(now) });
      const { authorizer, calls } = yield* scripted("x");

      const token = yield* ChannelAccess.use((access) =>
        access.withToken(channel.id, (given) => Effect.succeed(given))
      ).pipe(Effect.provide(accessWith(authorizer)));

      assert.strictEqual(
        Redacted.value(token.accessToken),
        `access-${channel.id}`
      );
      assert.strictEqual(token.platform, "x");
      assert.strictEqual(token.accountId, channel.accountId);
      assert.strictEqual(yield* calls, 0);
    })
  );

  it.effect("renews a token that has run out before using it", () =>
    Effect.gen(function* renewsExpired() {
      const workspaceId = yield* freshWorkspace;
      const now = yield* DateTime.now;

      const channel = yield* stored(workspaceId, {
        token: {
          _tag: "refreshable",
          expiresAt: DateTime.subtractDuration(now, Duration.minutes(1)),
        },
      });

      const { authorizer, calls } = yield* scripted("x");
      const { record, seen } = yield* recording();

      yield* ChannelAccess.use((access) =>
        access.withToken(channel.id, ({ accessToken }) => record(accessToken))
      ).pipe(Effect.provide(accessWith(authorizer)));

      assert.strictEqual(yield* calls, 1);
      assert.deepStrictEqual(yield* seen, ["renewed-access-1"]);
      assert.strictEqual(
        yield* storedAccessToken(channel.id),
        "renewed-access-1"
      );
    })
  );

  it.effect("renews a token the platform refused once, and calls again", () =>
    Effect.gen(function* renewsRefused() {
      const workspaceId = yield* freshWorkspace;
      const now = yield* DateTime.now;
      const channel = yield* stored(workspaceId, { token: inAnHour(now) });
      const { authorizer, calls } = yield* scripted("x");
      const { record, seen } = yield* recording();

      const result = yield* ChannelAccess.use((access) =>
        access.withToken(channel.id, ({ accessToken }) =>
          record(accessToken).pipe(
            Effect.andThen(
              Redacted.value(accessToken).startsWith("renewed")
                ? Effect.succeed("posted")
                : Effect.fail(new TokenRejected())
            )
          )
        )
      ).pipe(Effect.provide(accessWith(authorizer)));

      assert.strictEqual(result, "posted");
      assert.strictEqual(yield* calls, 1);
      assert.deepStrictEqual(yield* seen, [
        `access-${channel.id}`,
        "renewed-access-1",
      ]);
      assert.strictEqual(yield* statusOf(channel.id), "active");
    })
  );

  it.effect("asks for a reconnect when the platform refuses to renew", () =>
    Effect.gen(function* refusesRenewal() {
      const workspaceId = yield* freshWorkspace;
      const now = yield* DateTime.now;
      const channel = yield* stored(workspaceId, { token: inAnHour(now) });
      const { authorizer } = yield* scripted("x", ["refuse"]);

      const failure = yield* ChannelAccess.use((access) =>
        access.withToken(channel.id, () => Effect.fail(new TokenRejected()))
      ).pipe(Effect.provide(accessWith(authorizer)), Effect.flip);

      const notices = yield* RecordedNotices.use((recorded) =>
        recorded.of(workspaceId)
      );

      assert.deepStrictEqual(failure, new TokenExpired());
      assert.strictEqual(yield* statusOf(channel.id), "refreshNeeded");
      assert.deepStrictEqual(notices, [
        {
          channelId: channel.id,
          expiresAt: Option.none(),
          kind: "reconnectRequired",
        },
      ]);
    })
  );

  it.effect("asks for a reconnect when the renewed token is refused too", () =>
    Effect.gen(function* refusedTwice() {
      const workspaceId = yield* freshWorkspace;
      const now = yield* DateTime.now;
      const channel = yield* stored(workspaceId, { token: inAnHour(now) });
      const { authorizer, calls } = yield* scripted("x");

      const failure = yield* ChannelAccess.use((access) =>
        access.withToken(channel.id, () => Effect.fail(new TokenRejected()))
      ).pipe(Effect.provide(accessWith(authorizer)), Effect.flip);

      assert.deepStrictEqual(failure, new TokenExpired());
      assert.strictEqual(yield* calls, 1);
      assert.strictEqual(yield* statusOf(channel.id), "refreshNeeded");
    })
  );

  it.effect(
    "leaves the token as it is when the platform could not renew it",
    () =>
      Effect.gen(function* unreachable() {
        const workspaceId = yield* freshWorkspace;
        const now = yield* DateTime.now;
        const channel = yield* stored(workspaceId, { token: inAnHour(now) });
        const { authorizer } = yield* scripted("x", ["unreachable"]);

        const failure = yield* ChannelAccess.use((access) =>
          access.withToken(channel.id, () => Effect.fail(new TokenRejected()))
        ).pipe(Effect.provide(accessWith(authorizer)), Effect.flip);

        assert.deepStrictEqual(failure, new PlatformUnavailable());
        assert.strictEqual(yield* statusOf(channel.id), "active");
        assert.strictEqual(
          yield* storedAccessToken(channel.id),
          `access-${channel.id}`
        );
      })
  );

  it.effect(
    "uses a token another call renewed meanwhile, without renewing",
    () =>
      Effect.gen(function* renewedMeanwhile() {
        const workspaceId = yield* freshWorkspace;
        const now = yield* DateTime.now;
        const channel = yield* stored(workspaceId, { token: inAnHour(now) });
        const { authorizer, calls } = yield* scripted("x");
        const { record, seen } = yield* recording();

        // The token the call was given is replaced while the call runs.
        const replaced = encryptTokens(
          {
            accessToken: Redacted.make("replaced-access"),
            expiresAt: Option.none(),
            refreshToken: Option.none(),
            renewable: true,
            scopes: [],
          },
          channel.id
        ).pipe(
          Effect.flatMap((credentials) =>
            ChannelRepository.use((channels) =>
              channels.update(channel, Option.some(credentials))
            )
          )
        );

        yield* ChannelAccess.use((access) =>
          access.withToken(channel.id, ({ accessToken }) =>
            record(accessToken).pipe(
              Effect.andThen(
                Redacted.value(accessToken) === "replaced-access"
                  ? Effect.void
                  : replaced.pipe(
                      Effect.andThen(Effect.fail(new TokenRejected()))
                    )
              )
            )
          )
        ).pipe(Effect.provide(accessWith(authorizer)));

        assert.strictEqual(yield* calls, 0);
        assert.deepStrictEqual(yield* seen, [
          `access-${channel.id}`,
          "replaced-access",
        ]);
      })
  );

  it.effect("refuses channels that cannot post", () =>
    Effect.gen(function* unusable() {
      const workspaceId = yield* freshWorkspace;
      const now = yield* DateTime.now;
      const { authorizer } = yield* scripted("x");
      const disabled = yield* stored(workspaceId, { token: inAnHour(now) });
      const marked = yield* stored(workspaceId, { token: inAnHour(now) });
      const missing = yield* newId(ChannelIdSchema);

      yield* ChannelRepository.use((channels) =>
        Effect.all([
          channels.update(disable(disabled, now), Option.none()),
          channels.update(markRefreshNeeded(marked, now), Option.none()),
        ])
      );

      const attempt = (channelId: typeof missing) =>
        ChannelAccess.use((access) =>
          access.withToken(channelId, () => Effect.void)
        ).pipe(Effect.provide(accessWith(authorizer)), Effect.flip);

      assert.deepStrictEqual(
        yield* attempt(disabled.id),
        new ChannelUnusable({ channelId: disabled.id, reason: "disabled" })
      );
      assert.deepStrictEqual(yield* attempt(marked.id), new TokenExpired());
      assert.deepStrictEqual(
        yield* attempt(missing),
        new ChannelUnusable({ channelId: missing, reason: "notFound" })
      );
    })
  );

  it.effect(
    "asks for a reconnect when a token that cannot renew has run out",
    () =>
      Effect.gen(function* nonRefreshable() {
        const workspaceId = yield* freshWorkspace;
        const now = yield* DateTime.now;
        const { authorizer, calls } = yield* scripted("linkedin");

        const channel = yield* stored(workspaceId, {
          platform: "linkedin",
          token: {
            _tag: "nonRefreshable",
            expiresAt: DateTime.subtractDuration(now, Duration.days(1)),
            issuedAt: DateTime.subtractDuration(now, Duration.days(61)),
          },
        });

        const failure = yield* ChannelAccess.use((access) =>
          access.withToken(channel.id, () => Effect.void)
        ).pipe(Effect.provide(accessWith(authorizer)), Effect.flip);

        assert.deepStrictEqual(failure, new TokenExpired());
        assert.strictEqual(yield* calls, 0);
        assert.strictEqual(yield* statusOf(channel.id), "refreshNeeded");
      })
  );

  it.effect(
    "keeps a rotated token when the call gives up while the platform answers",
    () =>
      Effect.gen(function* givesUp() {
        const workspaceId = yield* freshWorkspace;
        const now = yield* DateTime.now;
        const channel = yield* stored(workspaceId, { token: inAnHour(now) });
        const asked = yield* Deferred.make<true>();
        const answer = yield* Deferred.make<true>();

        // The platform spends the refresh token as soon as it is asked, and
        // answers with the next one a little later.
        const authorizer: PlatformAuthorizer = {
          begin: () => Effect.die("not used"),
          complete: () => Effect.die("not used"),
          platform: "x",
          policy: tokenPolicies.x,
          refresh: () =>
            Deferred.succeed(asked, true).pipe(
              Effect.andThen(Deferred.await(answer)),
              Effect.andThen(DateTime.now),
              Effect.map((issuedAt): IssuedTokens => ({
                accessToken: Redacted.make("rotated-access"),
                expiresAt: Option.some(
                  DateTime.addDuration(issuedAt, Duration.hours(2))
                ),
                refreshToken: Option.some(Redacted.make("rotated-refresh")),
                renewable: true,
                scopes: ["tweet.write"],
              }))
            ),
        };

        const call = yield* ChannelAccess.use((access) =>
          access.withToken(channel.id, () => Effect.fail(new TokenRejected()))
        ).pipe(Effect.provide(accessWith(authorizer)), Effect.forkChild);

        yield* Deferred.await(asked);

        // The call is given up, as at a shutdown, before the platform answers.
        const givingUp = yield* Fiber.interrupt(call).pipe(Effect.forkChild);

        yield* Deferred.succeed(answer, true);
        yield* Fiber.join(givingUp);

        assert.strictEqual(
          yield* storedAccessToken(channel.id),
          "rotated-access"
        );
        assert.strictEqual(yield* statusOf(channel.id), "active");
      })
  );

  it.effect(
    "keeps a channel reconnected while its renewed token was refused",
    () =>
      Effect.gen(function* reconnectedMeanwhile() {
        const workspaceId = yield* freshWorkspace;
        const now = yield* DateTime.now;
        const channel = yield* stored(workspaceId, { token: inAnHour(now) });
        const { authorizer } = yield* scripted("x");
        const { record, seen } = yield* recording();

        // The member reconnects the channel while the renewed token is
        // being refused, as when they had revoked Peal on the platform.
        const reconnected = replaceToken(channel, "reconnected-access");

        const failure = yield* ChannelAccess.use((access) =>
          access.withToken(channel.id, ({ accessToken }) =>
            record(accessToken).pipe(
              Effect.andThen(
                Redacted.value(accessToken) === "renewed-access-1"
                  ? reconnected
                  : Effect.void
              ),
              Effect.andThen(Effect.fail(new TokenRejected()))
            )
          )
        ).pipe(Effect.provide(accessWith(authorizer)), Effect.flip);

        const notices = yield* RecordedNotices.use((recorded) =>
          recorded.of(workspaceId)
        );

        // Nothing went out: a later call takes the reconnected token.
        assert.deepStrictEqual(failure, new PlatformUnavailable());
        assert.deepStrictEqual(yield* seen, [
          `access-${channel.id}`,
          "renewed-access-1",
        ]);
        assert.strictEqual(yield* statusOf(channel.id), "active");
        assert.strictEqual(
          yield* storedAccessToken(channel.id),
          "reconnected-access"
        );
        assert.deepStrictEqual(notices, []);
      })
  );

  it.effect(
    "uses the token of a reconnect that came first, rather than ask for one",
    () =>
      Effect.gen(function* reconnectCameFirst() {
        const workspaceId = yield* freshWorkspace;
        const now = yield* DateTime.now;
        const { authorizer } = yield* scripted("linkedin");

        const channel = yield* stored(workspaceId, {
          platform: "linkedin",
          token: {
            _tag: "nonRefreshable",
            expiresAt: DateTime.subtractDuration(now, Duration.minutes(1)),
            issuedAt: DateTime.subtractDuration(now, Duration.days(60)),
          },
        });

        // The member reconnects the expired channel just before the call
        // takes its lock.
        const reconnect = Effect.gen(function* reconnecting() {
          const renewed = renewToken(
            channel,
            {
              scopes: channel.scopes,
              token: {
                _tag: "nonRefreshable",
                expiresAt: DateTime.addDuration(now, Duration.days(60)),
                issuedAt: now,
              },
            },
            now
          );

          yield* ChannelRepository.use((channels) =>
            channels.update(renewed, Option.none())
          );
          yield* replaceToken(renewed, "reconnected-access");
        });

        const { record, seen } = yield* recording();

        yield* ChannelAccess.use((access) =>
          access.withToken(channel.id, ({ accessToken }) => record(accessToken))
        ).pipe(
          Effect.provide(
            Layer.fresh(ChannelAccess.layer).pipe(
              Layer.provide(
                Layer.mergeAll(
                  Layer.succeed(PlatformAuthorizers, authorizersOf(authorizer)),
                  lockingAfter(reconnect)
                )
              )
            )
          )
        );

        assert.deepStrictEqual(yield* seen, ["reconnected-access"]);
        assert.strictEqual(yield* statusOf(channel.id), "active");
      })
  );

  it.effect("gives up on a renewal the platform never answers", () =>
    Effect.gen(function* neverAnswered() {
      const workspaceId = yield* freshWorkspace;
      const now = yield* DateTime.now;
      const channel = yield* stored(workspaceId, { token: inAnHour(now) });
      const asked = yield* Deferred.make<true>();

      const authorizer: PlatformAuthorizer = {
        begin: () => Effect.die("not used"),
        complete: () => Effect.die("not used"),
        platform: "x",
        policy: tokenPolicies.x,
        refresh: () =>
          Deferred.succeed(asked, true).pipe(Effect.andThen(Effect.never)),
      };

      const call = yield* ChannelAccess.use((access) =>
        access.withToken(channel.id, () => Effect.fail(new TokenRejected()))
      ).pipe(
        Effect.provide(accessWith(authorizer)),
        Effect.flip,
        Effect.forkChild
      );

      yield* Deferred.await(asked);
      yield* TestClock.adjust(Duration.minutes(1));

      assert.deepStrictEqual(
        yield* Fiber.join(call),
        new PlatformUnavailable()
      );
      assert.strictEqual(yield* statusOf(channel.id), "active");
      assert.strictEqual(
        yield* storedAccessToken(channel.id),
        `access-${channel.id}`
      );
    })
  );
});
